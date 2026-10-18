import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { redisClient } from '../redis/redis.js';
import { env } from '../../config/env.js';
import { RateLimitError, ServiceUnavailableError } from '../errors/app-error.js';
import { logger } from '../logger/logger.js';

export interface RateLimiterOptions {
  points: number; // Number of allowed requests
  duration: number; // Per seconds
  keyPrefix: string;
  isSensitive?: boolean;
  keyGenerator?: (req: Request) => string | Promise<string>;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const isTest =
    process.env.NODE_ENV === 'test' || env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  const isProduction = env.NODE_ENV === 'production';

  // In test mode: use in-memory limiter with higher threshold to allow test suites to run
  // In dev / prod: use Redis limiter. NEVER fall back to memory in production!
  const limiter = isTest
    ? new RateLimiterMemory({
        points: 50000,
        duration: options.duration,
        keyPrefix: options.keyPrefix,
      })
    : new RateLimiterRedis({
        storeClient: redisClient,
        points: options.points,
        duration: options.duration,
        keyPrefix: options.keyPrefix,
        insuranceLimiter: undefined, // Explicitly no silent memory fallback
      });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Determine client IP using Cloudflare header, Express trust proxy req.ip, X-Forwarded-For, or socket remoteAddress
    const rawIp =
      (req.headers['cf-connecting-ip'] as string) ||
      req.ip ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const clientIp = Array.isArray(rawIp) ? (rawIp[0] ?? '127.0.0.1') : rawIp;
    const key = options.keyGenerator ? await options.keyGenerator(req) : clientIp;

    try {
      const resRate = await limiter.consume(key);
      res.setHeader('X-RateLimit-Limit', options.points);
      res.setHeader('X-RateLimit-Remaining', resRate.remainingPoints);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + resRate.msBeforeNext).toISOString());
      next();
    } catch (err) {
      if (err instanceof RateLimiterRes) {
        res.setHeader('Retry-After', Math.ceil(err.msBeforeNext / 1000));
        res.setHeader('X-RateLimit-Limit', options.points);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + err.msBeforeNext).toISOString());
        next(new RateLimitError());
        return;
      }

      // Redis connection or internal store error
      logger.error(
        { err, keyPrefix: options.keyPrefix, isProduction, isSensitive: options.isSensitive },
        'Rate limiter store failure',
      );

      // In production, fail-closed on sensitive routes or refuse to proceed
      if (isProduction || options.isSensitive) {
        next(
          new ServiceUnavailableError(
            'Security rate-limit verification service unavailable. Request rejected.',
          ),
        );
        return;
      }

      // In non-sensitive local development, allow through with warning
      logger.warn('Non-sensitive request permitted during local development Redis outage');
      next();
    }
  };
}

// Pre-configured rate limiters tuned for Indian CGNAT mobile networks (where thousands of users share single IP)
// 1. Standard API rate limiter (catalog, health, sessions)
export const standardRateLimiter = createRateLimiter({
  points: 600,
  duration: 60,
  keyPrefix: 'rl_standard',
  isSensitive: false,
});

// 2. Authentication rate limiter (register, login)
// Set to 600 req/min per IP so that 100+ legitimate users sharing a mobile carrier gateway IP are not blocked.
// Account-specific brute force is strictly halted by LockoutService (5 failed attempts per target account).
export const authRateLimiter = createRateLimiter({
  points: 600,
  duration: 60,
  keyPrefix: 'rl_auth',
  isSensitive: true,
});

// 3. Sensitive action limiter (password changes, profile updates)
export const sensitiveActionRateLimiter = createRateLimiter({
  points: 120,
  duration: 60,
  keyPrefix: 'rl_sensitive',
  isSensitive: true,
});

// 4. Quote and Checkout calculation limiter (public checkout pricing requests)
export const quoteRateLimiter = createRateLimiter({
  points: 600,
  duration: 60,
  keyPrefix: 'rl_quote',
  isSensitive: true,
});

// 5. Coupon validation limiter (protects against coupon code dictionary brute-forcing)
export const couponRateLimiter = createRateLimiter({
  points: 120,
  duration: 60,
  keyPrefix: 'rl_coupon',
  isSensitive: true,
});

// 6. Playback token issuance limiter (per IP high ceiling for classrooms / shared networks; per-user check in route)
export const playbackRateLimiter = createRateLimiter({
  points: 600,
  duration: 60,
  keyPrefix: 'rl_playback',
  isSensitive: false,
});

// 7. Video heartbeat rate limiter (allows 600+ concurrent students on shared network)
export const heartbeatRateLimiter = createRateLimiter({
  points: 1200,
  duration: 60,
  keyPrefix: 'rl_heartbeat',
  isSensitive: false,
});

// 8. Free preview token limiter (allows launch day spike of preview viewers from shared cell towers)
export const previewTokenRateLimiter = createRateLimiter({
  points: 300,
  duration: 60,
  keyPrefix: 'rl_preview_token',
  isSensitive: false,
});
