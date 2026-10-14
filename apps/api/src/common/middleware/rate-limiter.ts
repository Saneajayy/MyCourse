import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { redisClient } from '../redis/redis.js';
import { env } from '../../config/env.js';
import { RateLimitError, ServiceUnavailableError } from '../errors/app-error.js';
import { logger } from '../logger/logger.js';

interface RateLimiterOptions {
  points: number; // Number of allowed requests
  duration: number; // Per seconds
  keyPrefix: string;
  isSensitive?: boolean;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const isTest = env.NODE_ENV === 'test';
  const isProduction = env.NODE_ENV === 'production';

  // In test mode: use in-memory limiter
  // In dev / prod: use Redis limiter. NEVER fall back to memory in production!
  const limiter = isTest
    ? new RateLimiterMemory({
        points: options.points,
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
    // Determine key: prioritize IP address
    const clientIp =
      req.headers['cf-connecting-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const key = Array.isArray(clientIp) ? (clientIp[0] ?? '127.0.0.1') : clientIp;

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

// Pre-configured rate limiters
export const standardRateLimiter = createRateLimiter({
  points: 100,
  duration: 60,
  keyPrefix: 'rl_standard',
  isSensitive: false,
});

export const authRateLimiter = createRateLimiter({
  points: 15,
  duration: 60,
  keyPrefix: 'rl_auth',
  isSensitive: true,
});

export const sensitiveActionRateLimiter = createRateLimiter({
  points: 20,
  duration: 60,
  keyPrefix: 'rl_sensitive',
  isSensitive: true,
});
