import { redisClient } from '../redis/redis.js';
import { RateLimitError } from '../errors/app-error.js';
import { logger } from '../logger/logger.js';
import { env } from '../../config/env.js';

const MAX_TARGET_FAILED_ATTEMPTS = 5; // 5 failed attempts on a specific email from a specific IP
const MAX_IP_FAILED_ATTEMPTS = 20; // 20 failed attempts total from an IP across any emails
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 minutes

export class LockoutService {
  private inMemoryStore = new Map<string, { count: number; expiresAt: number }>();

  /**
   * Checks both composite (email + IP) and IP-wide lockout state.
   */
  public async checkLockout(email: string, ip: string): Promise<void> {
    const targetKey = `lockout:target:${email.toLowerCase().trim()}:${ip}`;
    const ipKey = `lockout:ip:${ip}`;

    if (env.NODE_ENV === 'test') {
      const targetEntry = this.inMemoryStore.get(targetKey);
      if (
        targetEntry &&
        targetEntry.expiresAt > Date.now() &&
        targetEntry.count >= MAX_TARGET_FAILED_ATTEMPTS
      ) {
        throw new RateLimitError(
          'Too many failed login attempts for this account from your IP. Please try again in 15 minutes.',
        );
      }
      const ipEntry = this.inMemoryStore.get(ipKey);
      if (ipEntry && ipEntry.expiresAt > Date.now() && ipEntry.count >= MAX_IP_FAILED_ATTEMPTS) {
        throw new RateLimitError('Too many failed attempts from your IP. Please try again later.');
      }
      return;
    }

    try {
      // 1. Check composite target key
      const targetAttempts = await redisClient.get(targetKey);
      if (targetAttempts && parseInt(targetAttempts, 10) >= MAX_TARGET_FAILED_ATTEMPTS) {
        const ttl = await redisClient.ttl(targetKey);
        logger.warn(
          { email, ip, remainingTtl: ttl },
          'Blocked request due to composite brute-force lockout',
        );
        throw new RateLimitError(
          `Too many failed attempts for this account. Locked for ${Math.ceil(ttl / 60)} more minutes.`,
        );
      }

      // 2. Check IP key
      const ipAttempts = await redisClient.get(ipKey);
      if (ipAttempts && parseInt(ipAttempts, 10) >= MAX_IP_FAILED_ATTEMPTS) {
        const ttl = await redisClient.ttl(ipKey);
        logger.warn({ ip, remainingTtl: ttl }, 'Blocked request due to IP brute-force lockout');
        throw new RateLimitError(
          `Too many failed attempts from your IP. Locked for ${Math.ceil(ttl / 60)} more minutes.`,
        );
      }
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      logger.error({ err, email, ip }, 'Error querying lockout state in Redis');
    }
  }

  public async recordFailedAttempt(email: string, ip: string): Promise<void> {
    const targetKey = `lockout:target:${email.toLowerCase().trim()}:${ip}`;
    const ipKey = `lockout:ip:${ip}`;

    if (env.NODE_ENV === 'test') {
      const targetEntry = this.inMemoryStore.get(targetKey);
      const targetCount =
        targetEntry && targetEntry.expiresAt > Date.now() ? targetEntry.count + 1 : 1;
      this.inMemoryStore.set(targetKey, {
        count: targetCount,
        expiresAt: Date.now() + LOCKOUT_WINDOW_SECONDS * 1000,
      });

      const ipEntry = this.inMemoryStore.get(ipKey);
      const ipCount = ipEntry && ipEntry.expiresAt > Date.now() ? ipEntry.count + 1 : 1;
      this.inMemoryStore.set(ipKey, {
        count: ipCount,
        expiresAt: Date.now() + LOCKOUT_WINDOW_SECONDS * 1000,
      });
      return;
    }

    try {
      const multi = redisClient.multi();
      multi.incr(targetKey);
      multi.expire(targetKey, LOCKOUT_WINDOW_SECONDS);
      multi.incr(ipKey);
      multi.expire(ipKey, LOCKOUT_WINDOW_SECONDS);
      await multi.exec();
    } catch (err) {
      logger.error({ err, email, ip }, 'Error recording failed attempt in Redis');
    }
  }

  public async clearFailedAttempts(email: string, ip: string): Promise<void> {
    const targetKey = `lockout:target:${email.toLowerCase().trim()}:${ip}`;

    if (env.NODE_ENV === 'test') {
      this.inMemoryStore.delete(targetKey);
      return;
    }

    try {
      await redisClient.del(targetKey);
    } catch (err) {
      logger.error({ err, email, ip }, 'Error clearing lockout in Redis');
    }
  }
}

export const lockoutService = new LockoutService();
