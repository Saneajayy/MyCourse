import { Queue, Worker } from 'bullmq';
import { redisClient } from '../../common/redis/redis.js';
import { orderService } from '../orders/order.service.js';
import { prisma } from '../../common/db/prisma.js';
import { logger } from '../../common/logger/logger.js';
import { WebhookEventStatus } from '@course/shared';

export const RAZORPAY_WEBHOOK_QUEUE_NAME = 'razorpay-webhooks';

export interface WebhookJobData {
  eventId: string;
  eventType: string;
  payload: any;
  webhookEventDbId?: string;
}

export let webhookQueue: Queue | null = null;
export let webhookWorker: Worker | null = null;

export async function processWebhookPayload(
  data: WebhookJobData,
): Promise<{ success: boolean; error?: string }> {
  const { eventType, payload, webhookEventDbId } = data;
  logger.info({ eventType, webhookEventDbId }, 'Processing Razorpay webhook job payload');

  try {
    const payment = payload?.payment?.entity;
    const refund = payload?.refund?.entity;
    const order = payload?.order?.entity;

    switch (eventType) {
      case 'payment.captured': {
        const orderId = payment?.order_id || order?.id;
        if (!orderId) {
          throw new Error('Missing order ID in payment.captured webhook payload');
        }
        if (!payment) {
          throw new Error('Missing payment entity in payment.captured webhook payload');
        }

        // S3: Validate order ID, amount in paise, and currency against our database order
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
        const dbOrder = isUuid
          ? await prisma.order.findUnique({ where: { id: orderId } })
          : await prisma.order.findUnique({ where: { razorpayOrderId: orderId } });

        if (!dbOrder) {
          logger.error(
            { orderId, paymentId: payment.id },
            'Webhook payment order not found in database',
          );
          throw new Error(`Order not found for identifier "${orderId}".`);
        }

        if (payment.amount !== dbOrder.totalPaise) {
          logger.error(
            { expected: dbOrder.totalPaise, received: payment.amount, orderId: dbOrder.id },
            'Tampered or mismatched payment amount detected in webhook!',
          );
          throw new Error(
            `Payment amount mismatch: expected ${dbOrder.totalPaise} paise, received ${payment.amount} paise.`,
          );
        }

        if (payment.currency?.toUpperCase() !== dbOrder.currency?.toUpperCase()) {
          logger.error(
            { expected: dbOrder.currency, received: payment.currency, orderId: dbOrder.id },
            'Mismatched payment currency detected in webhook!',
          );
          throw new Error(
            `Payment currency mismatch: expected ${dbOrder.currency}, received ${payment.currency}.`,
          );
        }

        await orderService.markOrderPaid(orderId, {
          paymentId: payment.id,
          amountPaise: payment.amount,
          currency: payment.currency,
          status: 'captured',
          method: payment.method,
          rawGatewayPayload: payment,
        });
        break;
      }

      case 'payment.failed': {
        const orderId = payment?.order_id || order?.id;
        if (orderId && payment) {
          await orderService.handlePaymentFailed(orderId, {
            paymentId: payment.id,
            amountPaise: payment.amount,
            currency: payment.currency,
            errorMessage: payment.error_description,
            rawGatewayPayload: payment,
          });
        }
        break;
      }

      case 'order.paid': {
        const orderId = order?.id || payment?.order_id;
        if (orderId && payment) {
          // S3: Validate order ID, amount in paise, and currency against our database order
          const isUuid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
          const dbOrder = isUuid
            ? await prisma.order.findUnique({ where: { id: orderId } })
            : await prisma.order.findUnique({ where: { razorpayOrderId: orderId } });

          if (!dbOrder) {
            throw new Error(`Order not found for identifier "${orderId}".`);
          }

          if (payment.amount !== dbOrder.totalPaise) {
            throw new Error(
              `Payment amount mismatch: expected ${dbOrder.totalPaise} paise, received ${payment.amount} paise.`,
            );
          }

          if (payment.currency?.toUpperCase() !== dbOrder.currency?.toUpperCase()) {
            throw new Error(
              `Payment currency mismatch: expected ${dbOrder.currency}, received ${payment.currency}.`,
            );
          }

          await orderService.markOrderPaid(orderId, {
            paymentId: payment.id,
            amountPaise: payment.amount,
            currency: payment.currency,
            status: 'captured',
            method: payment.method,
            rawGatewayPayload: payment,
          });
        }
        break;
      }

      case 'refund.processed': {
        if (refund) {
          await orderService.handleRefundProcessed(refund);
        }
        break;
      }

      case 'refund.failed': {
        if (refund) {
          await orderService.handleRefundFailed(refund);
        }
        break;
      }

      default:
        logger.info({ eventType }, 'Unhandled or informational Razorpay webhook event received');
    }

    if (webhookEventDbId) {
      await prisma.webhookEvent.update({
        where: { id: webhookEventDbId },
        data: {
          status: WebhookEventStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    logger.error(
      { err, eventType, webhookEventDbId },
      'Error processing webhook event in BullMQ worker',
    );
    if (webhookEventDbId) {
      await prisma.webhookEvent.update({
        where: { id: webhookEventDbId },
        data: {
          status: WebhookEventStatus.FAILED,
          error: err.message,
        },
      });
    }
    // Return graceful failure so BullMQ/Razorpay does not retry forever on business logic errors
    return { success: false, error: err.message };
  }
}

export function initializeWebhookQueue(): { queue: Queue; worker: Worker } {
  if (webhookQueue && webhookWorker) {
    return { queue: webhookQueue, worker: webhookWorker };
  }

  const connection = {
    host: redisClient.options.host || 'localhost',
    port: redisClient.options.port || 6379,
    db: redisClient.options.db || 0,
    password: redisClient.options.password,
  };

  webhookQueue = new Queue(RAZORPAY_WEBHOOK_QUEUE_NAME, { connection });

  webhookWorker = new Worker(
    RAZORPAY_WEBHOOK_QUEUE_NAME,
    async (job) => {
      return processWebhookPayload(job.data);
    },
    { connection, concurrency: 5 },
  );

  webhookWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Razorpay webhook worker job failed');
  });

  return { queue: webhookQueue, worker: webhookWorker };
}

export async function stopWebhookQueue(): Promise<void> {
  if (webhookWorker) {
    await webhookWorker.close();
    webhookWorker = null;
  }
  if (webhookQueue) {
    await webhookQueue.close();
    webhookQueue = null;
  }
}

/**
 * Sweeper job that finds WebhookEvent rows stuck in PENDING for more than a few minutes
 * and re-queues / re-processes them to guarantee at-least-once delivery (S2).
 */
export async function sweepStuckWebhookEvents(olderThanMinutes = 5): Promise<{
  swept: number;
  processed: number;
  errors: number;
}> {
  const threshold = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  const stuckEvents = await prisma.webhookEvent.findMany({
    where: {
      status: WebhookEventStatus.PENDING,
      createdAt: { lte: threshold },
    },
    take: 50,
  });

  let processedCount = 0;
  let errorCount = 0;

  for (const event of stuckEvents) {
    try {
      logger.info(
        {
          webhookEventId: event.id,
          providerEventId: event.providerEventId,
          eventType: event.eventType,
        },
        'Sweeper re-processing stuck PENDING webhook event',
      );

      const jobData: WebhookJobData = {
        eventId: event.providerEventId,
        eventType: event.eventType,
        payload: (event.payload as any)?.payload || event.payload,
        webhookEventDbId: event.id,
      };

      if (webhookQueue) {
        await webhookQueue.add(event.eventType, jobData, {
          jobId: `sweep_${event.providerEventId}_${Date.now()}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        });
        processedCount++;
      } else {
        const result = await processWebhookPayload(jobData);
        if (result.success) {
          processedCount++;
        } else {
          errorCount++;
        }
      }
    } catch (err: any) {
      logger.error(
        { err, webhookEventId: event.id },
        'Sweeper failed to re-queue stuck webhook event',
      );
      errorCount++;
    }
  }

  return {
    swept: stuckEvents.length,
    processed: processedCount,
    errors: errorCount,
  };
}
