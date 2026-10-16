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
        if (orderId && payment) {
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
