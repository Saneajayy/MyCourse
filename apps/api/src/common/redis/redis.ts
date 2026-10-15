import { Redis } from 'ioredis';
import { env } from '../../config/env.js';
import { logger } from '../logger/logger.js';

export const redisClient: Redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: env.NODE_ENV === 'test' ? 3 : null,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  keyPrefix: env.NODE_ENV === 'test' ? 'test:' : undefined,
  retryStrategy(times) {
    if (env.NODE_ENV === 'test' && times > 3) {
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
  try {
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error({ err: error }, 'Redis health check failed');
    return false;
  }
}
