import { redisClient } from '../redis/redis.js';
import { RateLimitError } from '../errors/app-error.js';
import { logger } from '../logger/logger.js';
import { env } from '../../config/env.js';

const MAX_TARGET_FAILED_ATTEMPTS = 5; // 5 failed attempts on a specific email from a specific IP
const MAX_IP_FAILED_ATTEMPTS = 200; // 200 failed attempts total from an IP across any emails (CGNAT / carrier tower safe)
const MAX_ACCOUNT_GLOBAL_FAILED_ATTEMPTS = 20; // 20 failed attempts on an account across all IPs (F2)
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 minutes
const ACCOUNT_GLOBAL_WINDOW_SECONDS = 60 * 60; // 1 hour

export class LockoutService {
  private inMemoryStore = new Map<string, { count: number; expiresAt: number }>();

  /**
   * Checks composite (email + IP), IP-wide, and per-account global lockout state.
   */
  public async checkLockout(email: string, ip: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const targetKey = `lockout:target:${normalizedEmail}:${ip}`;
    const ipKey = `lockout:ip:${ip}`;
    const accGlobalKey = `lockout:acc_global:${normalizedEmail}`;

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
      const accGlobalEntry = this.inMemoryStore.get(accGlobalKey);
      if (
        accGlobalEntry &&
        accGlobalEntry.expiresAt > Date.now() &&
        accGlobalEntry.count >= MAX_ACCOUNT_GLOBAL_FAILED_ATTEMPTS
      ) {
        throw new RateLimitError(
          'Account temporarily locked due to excessive failed attempts across multiple locations. Please try again in 1 hour or reset your password.',
        );
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

      // 3. Check per-account global key across all IPs (F2)
      const accGlobalAttempts = await redisClient.get(accGlobalKey);
      if (
        accGlobalAttempts &&
        parseInt(accGlobalAttempts, 10) >= MAX_ACCOUNT_GLOBAL_FAILED_ATTEMPTS
      ) {
        const ttl = await redisClient.ttl(accGlobalKey);
        logger.warn(
          { email, ip, remainingTtl: ttl },
          'Blocked request due to per-account global brute-force lockout',
        );
        throw new RateLimitError(
          `Account temporarily locked due to excessive failed attempts across multiple locations. Locked for ${Math.ceil(ttl / 60)} more minutes.`,
        );
      }
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      logger.error({ err, email, ip }, 'Error querying lockout state in Redis');
    }
  }

  public async recordFailedAttempt(email: string, ip: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const targetKey = `lockout:target:${normalizedEmail}:${ip}`;
    const ipKey = `lockout:ip:${ip}`;
    const accGlobalKey = `lockout:acc_global:${normalizedEmail}`;

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

      const accGlobalEntry = this.inMemoryStore.get(accGlobalKey);
      const accGlobalCount =
        accGlobalEntry && accGlobalEntry.expiresAt > Date.now() ? accGlobalEntry.count + 1 : 1;
      this.inMemoryStore.set(accGlobalKey, {
        count: accGlobalCount,
        expiresAt: Date.now() + ACCOUNT_GLOBAL_WINDOW_SECONDS * 1000,
      });
      return;
    }

    try {
      const multi = redisClient.multi();
      multi.incr(targetKey);
      multi.expire(targetKey, LOCKOUT_WINDOW_SECONDS);
      multi.incr(ipKey);
      multi.expire(ipKey, LOCKOUT_WINDOW_SECONDS);
      multi.incr(accGlobalKey);
      multi.expire(accGlobalKey, ACCOUNT_GLOBAL_WINDOW_SECONDS);
      await multi.exec();
    } catch (err) {
      logger.error({ err, email, ip }, 'Error recording failed attempt in Redis');
    }
  }

  public async clearFailedAttempts(email: string, ip: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const targetKey = `lockout:target:${normalizedEmail}:${ip}`;
    const accGlobalKey = `lockout:acc_global:${normalizedEmail}`;

    if (env.NODE_ENV === 'test') {
      this.inMemoryStore.delete(targetKey);
      this.inMemoryStore.delete(accGlobalKey);
      return;
    }

    try {
      await redisClient.del(targetKey, accGlobalKey);
    } catch (err) {
      logger.error({ err, email, ip }, 'Error clearing lockout in Redis');
    }
  }
}

export const lockoutService = new LockoutService();
