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

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

export async function checkRedisHealth(timeoutMs = 3000): Promise<boolean> {
  // If not ready yet but connecting or connected, wait for 'ready' event
  if (redisClient.status !== 'ready') {
    if (
      redisClient.status === 'connecting' ||
      redisClient.status === 'connect' ||
      redisClient.status === 'wait'
    ) {
      const isReady = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          cleanup();
          resolve(false);
        }, timeoutMs);

        const onReady = () => {
          cleanup();
          resolve(true);
        };

        const cleanup = () => {
          clearTimeout(timer);
          redisClient.off('ready', onReady);
        };

        redisClient.once('ready', onReady);
      });

      if (!isReady) {
        return false;
      }
    } else {
      return false;
    }
  }

  try {
    const pong = await Promise.race([
      redisClient.ping(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), Math.min(timeoutMs, 2000)),
      ),
    ]);
    return pong === 'PONG';
  } catch (error) {
    logger.error({ err: error }, 'Redis health check failed');
    return false;
  }
}
