import { Queue, Worker } from 'bullmq';
import { redisClient } from '../../common/redis/redis.js';
import { orderService } from '../orders/order.service.js';
import { logger } from '../../common/logger/logger.js';
import { env } from '../../config/env.js';

export const RECONCILIATION_QUEUE_NAME = 'stuck-orders-reconciliation';

export let reconciliationQueue: Queue | null = null;
export let reconciliationWorker: Worker | null = null;

export function initializeReconciliationWorker(): { queue: Queue; worker: Worker } {
  if (reconciliationQueue && reconciliationWorker) {
    return { queue: reconciliationQueue, worker: reconciliationWorker };
  }

  // BullMQ connection uses the shared Redis client configuration
  const connection = {
    host: redisClient.options.host || 'localhost',
    port: redisClient.options.port || 6379,
    db: redisClient.options.db || 0,
    password: redisClient.options.password,
  };

  reconciliationQueue = new Queue(RECONCILIATION_QUEUE_NAME, { connection });

  reconciliationWorker = new Worker(
    RECONCILIATION_QUEUE_NAME,
    async (job) => {
      logger.info({ jobId: job.id }, 'Starting stuck orders reconciliation job');
      const result = await orderService.reconcileStuckOrders();
      logger.info({ result }, 'Completed stuck orders reconciliation job');
      return result;
    },
    { connection, concurrency: 1 },
  );

  reconciliationWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Reconciliation job failed');
  });

  // Schedule repeatable job every 15 minutes in non-test mode
  if (env.NODE_ENV !== 'test') {
    reconciliationQueue.upsertJobScheduler('periodic-reconcile', {
      every: 15 * 60 * 1000, // every 15 minutes
    });
  }

  return { queue: reconciliationQueue, worker: reconciliationWorker };
}

export async function stopReconciliationWorker(): Promise<void> {
  if (reconciliationWorker) {
    await reconciliationWorker.close();
    reconciliationWorker = null;
  }
  if (reconciliationQueue) {
    await reconciliationQueue.close();
    reconciliationQueue = null;
  }
}
