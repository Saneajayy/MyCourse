import { Request, Response, NextFunction } from 'express';
import { uuidv7 } from 'uuidv7';
import { prisma } from '../../common/db/prisma.js';
import { getPaymentGateway } from '../payments/payment.service.js';
import { orderService } from '../orders/order.service.js';
import { logger } from '../../common/logger/logger.js';
import { WebhookEventStatus } from '@course/shared';

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
    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;

    // Use specific entity ID or event ID as providerEventId for strict deduplication
    const providerEventId = paymentEntity?.id
      ? `${eventType}:${paymentEntity.id}`
      : event.id || `evt_${Date.now()}_${Math.random()}`;

    // 1. Check for duplicate webhook delivery in WebhookEvent table
    const existing = await prisma.webhookEvent.findUnique({
      where: { providerEventId },
    });

    if (existing) {
      logger.info(
        { providerEventId, eventType },
        'Duplicate Razorpay webhook received; returning 200 idempotently',
      );
      res.status(200).json({ success: true, message: 'Event already processed' });
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

    try {
      // 3. Process supported events
      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        if (paymentEntity) {
          const razorpayOrderId = paymentEntity.order_id || orderEntity?.id;
          if (razorpayOrderId) {
            await orderService.markOrderPaid(razorpayOrderId, {
              paymentId: paymentEntity.id,
              amountPaise: paymentEntity.amount,
              currency: paymentEntity.currency,
              status: paymentEntity.status,
              method: paymentEntity.method,
              rawGatewayPayload: paymentEntity,
            });
          }
        }
      }

      await prisma.webhookEvent.update({
        where: { id: webhookEventRecord.id },
        data: {
          status: WebhookEventStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      res.status(200).json({ success: true, message: 'Webhook processed successfully' });
    } catch (err: any) {
      logger.error({ err, providerEventId, eventType }, 'Failed to process Razorpay webhook');
      await prisma.webhookEvent.update({
        where: { id: webhookEventRecord.id },
        data: {
          status: WebhookEventStatus.FAILED,
          error: err.message,
        },
      });
      // Respond 200 so gateway does not infinitely spam for logical errors, or 500 for retryable
      res.status(200).json({ success: false, error: err.message });
    }
  }
}

export const razorpayWebhookController = new RazorpayWebhookController();
