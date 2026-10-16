import { Queue, Worker } from 'bullmq';
import { redisClient } from '../../common/redis/redis.js';
import { prisma } from '../../common/db/prisma.js';
import { streamService } from '../video/stream.service.js';
import { logger } from '../../common/logger/logger.js';
import { env } from '../../config/env.js';
import { EntitlementStatus } from '@course/shared';

export const EXPIRY_QUEUE_NAME = 'entitlement-expiry-cleanup';

export let expiryQueue: Queue | null = null;
export let expiryWorker: Worker | null = null;

/**
 * Sweeps the database for entitlements that have passed expiresAt and marks them EXPIRED.
 * Also prunes any active stream sessions in Redis for displaced users.
 */
export async function cleanExpiredEntitlements(
  asOf = new Date(),
): Promise<{ expiredCount: number }> {
  try {
    const expiredEntitlements = await prisma.entitlement.findMany({
      where: {
        status: EntitlementStatus.ACTIVE,
        expiresAt: {
          lte: asOf,
          not: null,
        },
      },
      select: {
        id: true,
        userId: true,
        productId: true,
        expiresAt: true,
      },
    });

    if (expiredEntitlements.length === 0) {
      return { expiredCount: 0 };
    }

    const entitlementIds = expiredEntitlements.map((e) => e.id);

    await prisma.entitlement.updateMany({
      where: {
        id: { in: entitlementIds },
      },
      data: {
        status: EntitlementStatus.EXPIRED,
      },
    });

    // Terminate stream sessions for all affected users
    const uniqueUserIds = [...new Set(expiredEntitlements.map((e) => e.userId))];
    for (const userId of uniqueUserIds) {
      await streamService.clearUserSessions(userId);
    }

    logger.info(
      { expiredCount: expiredEntitlements.length, uniqueUserCount: uniqueUserIds.length },
      'Cleaned up expired entitlements and pruned stream sessions',
    );

    return { expiredCount: expiredEntitlements.length };
  } catch (err) {
    logger.error({ err }, 'Failed to clean expired entitlements');
    throw err;
  }
}

export function initializeExpiryWorker(): { queue: Queue; worker: Worker } {
  if (expiryQueue && expiryWorker) {
    return { queue: expiryQueue, worker: expiryWorker };
  }

  const connection = {
    host: redisClient.options.host || 'localhost',
    port: redisClient.options.port || 6379,
    db: redisClient.options.db || 0,
    password: redisClient.options.password,
  };

  expiryQueue = new Queue(EXPIRY_QUEUE_NAME, { connection });

  expiryWorker = new Worker(
    EXPIRY_QUEUE_NAME,
    async (job) => {
      logger.info({ jobId: job.id }, 'Starting entitlement expiry cleanup job');
      const result = await cleanExpiredEntitlements();
      return result;
    },
    { connection, concurrency: 1 },
  );

  expiryWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Entitlement expiry cleanup job failed');
  });

  // Schedule repeatable job every 60 minutes in non-test environments
  if (env.NODE_ENV !== 'test') {
    expiryQueue.upsertJobScheduler('hourly-expiry-cleanup', {
      every: 60 * 60 * 1000, // 1 hour
    });
  }

  return { queue: expiryQueue, worker: expiryWorker };
}

export async function stopExpiryWorker(): Promise<void> {
  if (expiryWorker) {
    await expiryWorker.close();
    expiryWorker = null;
  }
  if (expiryQueue) {
    await expiryQueue.close();
    expiryQueue = null;
  }
}
