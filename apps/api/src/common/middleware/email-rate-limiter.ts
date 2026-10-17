import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../redis/redis.js';
import { RateLimitError } from '../errors/app-error.js';
import { logger } from '../logger/logger.js';

export interface EmailRateLimitConfig {
  accountLimit?: number; // max per account
  accountWindowSec?: number; // per N seconds (default 3600 = 1 hr)
  ipLimit?: number; // max per IP
  ipWindowSec?: number; // per N seconds (default 3600 = 1 hr)
  globalLimit?: number; // max global
  globalWindowSec?: number; // per N seconds (default 600 = 10 min)
}

const DEFAULT_CONFIG: Required<EmailRateLimitConfig> = {
  accountLimit: 3,
  accountWindowSec: 3600,
  ipLimit: 50, // CGNAT-safe: Indian mobile networks share public IPs across many devices
  ipWindowSec: 3600,
  globalLimit: 500,
  globalWindowSec: 600,
};

/**
 * Checks multi-tier rate limits for sensitive email operations (resend-verification, forgot-password).
 * Enforces per-account, per-IP, and global rate limits stored in Redis.
 */
export async function assertEmailRateLimit(
  email: string,
  ip: string,
  action: 'resend_verification' | 'forgot_password',
  customConfig?: EmailRateLimitConfig,
): Promise<void> {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedIp = ip.trim();

  const acctKey = `rl_email_acct:${action}:${normalizedEmail}`;
  const ipKey = `rl_email_ip:${action}:${normalizedIp}`;
  const globalKey = `rl_email_global:${action}`;

  // Use Redis multi to increment and set TTL atomically
  try {
    const pipeline = redisClient.pipeline();
    pipeline.incr(acctKey);
    pipeline.ttl(acctKey);
    pipeline.incr(ipKey);
    pipeline.ttl(ipKey);
    pipeline.incr(globalKey);
    pipeline.ttl(globalKey);

    const results = await pipeline.exec();
    if (!results) return;

    const [
      [errAcct, acctCount],
      [, acctTtl],
      [errIp, ipCount],
      [, ipTtl],
      [errGlobal, globalCount],
      [, globalTtl],
    ] = results as [
      [Error | null, number],
      [Error | null, number],
      [Error | null, number],
      [Error | null, number],
      [Error | null, number],
      [Error | null, number],
    ];

    if (errAcct || errIp || errGlobal) {
      logger.error({ errAcct, errIp, errGlobal }, 'Redis error checking email rate limit');
      return; // Fail open gracefully in dev / unmanaged outages
    }

    // Set TTL if new key (ttl === -1)
    if (acctTtl === -1) await redisClient.expire(acctKey, config.accountWindowSec);
    if (ipTtl === -1) await redisClient.expire(ipKey, config.ipWindowSec);
    if (globalTtl === -1) await redisClient.expire(globalKey, config.globalWindowSec);

    // 1. Account Limit Check
    if (acctCount > config.accountLimit) {
      logger.warn(
        { email: normalizedEmail, action, count: acctCount },
        'Email rate limit exceeded: per-account',
      );
      throw new RateLimitError(
        'Too many requests for this account. Please wait before trying again.',
      );
    }

    // 2. IP Limit Check
    if (ipCount > config.ipLimit) {
      logger.warn(
        { ip: normalizedIp, action, count: ipCount },
        'Email rate limit exceeded: per-IP',
      );
      throw new RateLimitError(
        'Too many requests from your IP address. Please wait before trying again.',
      );
    }

    // 3. Global Limit Check
    if (globalCount > config.globalLimit) {
      logger.warn({ action, count: globalCount }, 'Email rate limit exceeded: global');
      throw new RateLimitError('High system email volume. Please try again in a few minutes.');
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    logger.error({ err }, 'Error in assertEmailRateLimit');
  }
}

/**
 * Express middleware for per-IP contact form rate limiting
 */
export function contactFormRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip =
    (req.headers['cf-connecting-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string) ||
    req.socket.remoteAddress ||
    '127.0.0.1';
  const cleanIp = Array.isArray(ip)
    ? (ip[0] ?? '127.0.0.1')
    : (ip.split(',')[0] ?? '127.0.0.1').trim();
  const key = `rl_contact_form:${cleanIp}`;

  redisClient
    .multi()
    .incr(key)
    .ttl(key)
    .exec()
    .then((results) => {
      if (!results) {
        next();
        return;
      }
      const [[, count], [, ttl]] = results as [[Error | null, number], [Error | null, number]];
      if (ttl === -1) redisClient.expire(key, 3600); // 1 hour window

      // CGNAT safe: allow 30 submissions per hour per IP (honeypot + Turnstile filter out bots)
      if (count > 30) {
        res.setHeader('Retry-After', Math.max(1, ttl));
        next(
          new RateLimitError(
            'Too many contact inquiries from this IP address. Please try again later.',
          ),
        );
        return;
      }
      next();
    })
    .catch((err) => {
      logger.error({ err }, 'Redis error in contactFormRateLimiter');
      next();
    });
}
