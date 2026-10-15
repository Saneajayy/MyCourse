import { redisClient } from '../redis/redis.js';
import { RateLimitError } from '../errors/app-error.js';
import { logger } from '../logger/logger.js';
import { env } from '../../config/env.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 minutes

export class LockoutService {
  private inMemoryStore = new Map<string, { count: number; expiresAt: number }>();

  public async checkLockout(identifier: string): Promise<void> {
    const key = `lockout:${identifier.toLowerCase()}`;

    if (env.NODE_ENV === 'test') {
      const entry = this.inMemoryStore.get(key);
      if (entry && entry.expiresAt > Date.now() && entry.count >= MAX_FAILED_ATTEMPTS) {
        throw new RateLimitError('Too many failed attempts. Please try again in 15 minutes.');
      }
      return;
    }

    try {
      const attempts = await redisClient.get(key);
      if (attempts && parseInt(attempts, 10) >= MAX_FAILED_ATTEMPTS) {
        const ttl = await redisClient.ttl(key);
        logger.warn(
          { identifier, remainingTtl: ttl },
          'Blocked request due to brute-force lockout',
        );
        throw new RateLimitError(
          `Too many failed attempts. Account temporarily locked. Please try again in ${Math.ceil(ttl / 60)} minutes.`,
        );
      }
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      logger.error({ err, key }, 'Error querying lockout state in Redis');
    }
  }

  public async recordFailedAttempt(identifier: string): Promise<void> {
    const key = `lockout:${identifier.toLowerCase()}`;

    if (env.NODE_ENV === 'test') {
      const entry = this.inMemoryStore.get(key);
      const count = entry && entry.expiresAt > Date.now() ? entry.count + 1 : 1;
      this.inMemoryStore.set(key, {
        count,
        expiresAt: Date.now() + LOCKOUT_WINDOW_SECONDS * 1000,
      });
      return;
    }

    try {
      const multi = redisClient.multi();
      multi.incr(key);
      multi.expire(key, LOCKOUT_WINDOW_SECONDS);
      await multi.exec();
    } catch (err) {
      logger.error({ err, key }, 'Error recording failed attempt in Redis');
    }
  }

  public async clearFailedAttempts(identifier: string): Promise<void> {
    const key = `lockout:${identifier.toLowerCase()}`;

    if (env.NODE_ENV === 'test') {
      this.inMemoryStore.delete(key);
      return;
    }

    try {
      await redisClient.del(key);
    } catch (err) {
      logger.error({ err, key }, 'Error clearing lockout in Redis');
    }
  }
}

export const lockoutService = new LockoutService();
