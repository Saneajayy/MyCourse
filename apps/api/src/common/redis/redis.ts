import { Redis } from 'ioredis';
import { env } from '../../config/env.js';
import { logger } from '../logger/logger.js';

export const redisClient: Redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: env.NODE_ENV === 'test' ? 3 : env.NODE_ENV === 'production' ? null : 1,
  enableReadyCheck: true,
  enableOfflineQueue: env.NODE_ENV === 'production',
  keyPrefix: env.NODE_ENV === 'test' ? 'test:' : undefined,
  retryStrategy(times) {
    if (env.NODE_ENV !== 'production' && times > 3) {
      return null;
    }
    const delay = Math.min(times * 100, 3000);
    logger.warn({ retryAttempt: times, delayMs: delay }, 'Reconnecting to Redis...');
    return delay;
  },
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

export async function checkRedisHealth(): Promise<boolean> {
  if (redisClient.status !== 'ready') {
    return false;
  }
  try {
    const pong = await Promise.race([
      redisClient.ping(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
    ]);
    return pong === 'PONG';
  } catch (error) {
    logger.error({ err: error }, 'Redis health check failed');
    return false;
  }
}
