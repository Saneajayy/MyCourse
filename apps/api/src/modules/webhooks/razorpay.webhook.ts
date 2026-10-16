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

    // 1. Check for duplicate webhook delivery in WebhookEvent table
    const existing = await prisma.webhookEvent.findUnique({
      where: { providerEventId },
    });

    if (existing) {
      logger.info(
        { providerEventId, eventType },
        'Duplicate Razorpay webhook received (x-razorpay-event-id); returning 200 idempotently',
      );
      res.status(200).json({ success: true, message: 'Event already processed or queued' });
      return;
    }

    // 2. Store event in WebhookEvent table
    const webhookEventRecord = await prisma.webhookEvent.create({
      data: {
        id: uuidv7(),
        provider: 'razorpay',
        providerEventId,
        eventType,
        payload: event,
        status: WebhookEventStatus.PENDING,
      },
    });

    // 3. Fast return (HTTP 200) and offload heavy processing to BullMQ
    const jobData = {
      eventId: providerEventId,
      eventType,
      payload: event.payload,
      webhookEventDbId: webhookEventRecord.id,
    };

    if (env.NODE_ENV === 'test') {
      // In tests, execute synchronously to allow immediate state assertions
      await processWebhookPayload(jobData);
    } else {
      // In production/dev, enqueue to BullMQ queue for fast response
      if (webhookQueue) {
        await webhookQueue.add(eventType, jobData, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        });
      } else {
        await processWebhookPayload(jobData);
      }
    }

    // Return 200 immediately to gateway
    res.status(200).json({ success: true, message: 'Webhook received and queued successfully' });
  }
}

export const razorpayWebhookController = new RazorpayWebhookController();
