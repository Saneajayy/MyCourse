import { Redis } from 'ioredis';
import { env } from '../../config/env.js';
import { logger } from '../logger/logger.js';

export let redisClient: Redis;

// In test mode, we avoid creating active socket connections if not needed
if (env.NODE_ENV === 'test') {
  redisClient = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
} else {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    reconnectOnError(err) {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    retryStrategy(times) {
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
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error({ err: error }, 'Redis health check failed');
    return false;
  }
}
