import { Request, Response, NextFunction } from 'express';
import { uuidv7 } from 'uuidv7';
import { prisma } from '../../common/db/prisma.js';
import { getPaymentGateway } from '../payments/payment.service.js';
import { logger } from '../../common/logger/logger.js';
import { WebhookEventStatus } from '@course/shared';
import { processWebhookPayload, webhookQueue } from './webhook.queue.js';
import { env } from '../../config/env.js';

export class RazorpayWebhookController {
  public async handleWebhook(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (!signature) {
      logger.warn({ ip: req.ip }, 'Rejected Razorpay webhook: missing signature header');
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing webhook signature' },
      });
      return;
    }

    const gateway = getPaymentGateway();
    const isValid = gateway.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      logger.warn({ ip: req.ip }, 'Rejected Razorpay webhook: invalid signature');
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' },
      });
      return;
    }

    const event = req.body;
    const eventType = event.event;

    // R7: Dedupe using x-razorpay-event-id header
    const eventHeaderId = (req.headers['x-razorpay-event-id'] as string) || event.id;
    const providerEventId =
      eventHeaderId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // S1: Insert first and rely on unique constraint on providerEventId to prevent race conditions
    let webhookEventRecord;
    try {
      webhookEventRecord = await prisma.webhookEvent.create({
        data: {
          id: uuidv7(),
          provider: 'razorpay',
          providerEventId,
          eventType,
          payload: event,
          status: WebhookEventStatus.PENDING,
        },
      });
    } catch (err: any) {
      // Prisma unique constraint violation code is P2002
      if (err.code === 'P2002') {
        logger.info(
          { providerEventId, eventType },
          'Duplicate Razorpay webhook event received concurrently; returning 200 idempotently',
        );
        res.status(200).json({ success: true, message: 'Event already received or queued' });
        return;
      }
      throw err;
    }

    // S2: Enqueue to BullMQ. If enqueueing fails, return 500 so Razorpay retries.
    const jobData = {
      eventId: providerEventId,
      eventType,
      payload: event.payload,
      webhookEventDbId: webhookEventRecord.id,
    };

    try {
      // Check if test request asked to simulate queue failure
      if (
        (req as any).__simulateQueueFailure ||
        req.headers['x-simulate-queue-failure'] === 'true'
      ) {
        throw new Error('Simulated BullMQ connection/enqueue failure');
      }

      if (env.NODE_ENV === 'test') {
        await processWebhookPayload(jobData);
      } else {
        if (webhookQueue) {
          await webhookQueue.add(eventType, jobData, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          });
        } else {
          await processWebhookPayload(jobData);
        }
      }
    } catch (queueErr: any) {
      logger.error(
        { queueErr, providerEventId, webhookEventDbId: webhookEventRecord.id },
        'Failed to enqueue webhook to BullMQ; returning 500 for Razorpay retry',
      );
      res.status(500).json({
        success: false,
        error: { code: 'QUEUE_ERROR', message: 'Failed to enqueue webhook processing' },
      });
      return;
    }

    // Return 200 immediately to gateway
    res.status(200).json({ success: true, message: 'Webhook received and queued successfully' });
  }
}

export const razorpayWebhookController = new RazorpayWebhookController();
