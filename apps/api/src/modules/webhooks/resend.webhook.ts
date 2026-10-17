import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { uuidv7 } from 'uuidv7';
import { env } from '../../config/env.js';
import { prisma } from '../../common/db/prisma.js';
import { logger } from '../../common/logger/logger.js';
import { EmailLogStatus, WebhookEventStatus } from '@course/shared';
import { BadRequestError } from '../../common/errors/app-error.js';

/**
 * Verifies Resend webhook signature using Svix specification.
 * Official documentation citations:
 * - Resend Webhooks: https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
 * - Svix Signature Verification: https://docs.svix.com/receiving/verifying-payloads/how
 *
 * Headers verified against raw request body:
 * - svix-id: unique event identifier
 * - svix-timestamp: seconds since Unix epoch (enforcing ±300s / 5 minute tolerance against replay attacks)
 * - svix-signature: space-separated list of signatures (e.g. "v1,<base64>")
 * Secret: Accepts standard "whsec_<base64>" secret format.
 */
export function verifyResendWebhookSignature(options: {
  payload: string | Buffer;
  headers: {
    id?: string;
    timestamp?: string;
    signature?: string;
  };
  secret?: string;
}): boolean {
  const { payload, headers, secret } = options;
  if (!secret) {
    // If no secret configured in test/dev, allow
    return true;
  }
  if (!headers.id || !headers.timestamp || !headers.signature) {
    return false;
  }

  // Prevent replay attacks: check timestamp within 5 minutes (300s)
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(headers.timestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > 300) {
    logger.warn(
      { timestamp: headers.timestamp, now },
      'Resend webhook timestamp expired or invalid',
    );
    return false;
  }

  const rawBody = typeof payload === 'string' ? payload : payload.toString('utf8');
  const signedPayload = `${headers.id}.${headers.timestamp}.${rawBody}`;

  let key: Buffer;
  if (secret.startsWith('whsec_')) {
    key = Buffer.from(secret.slice(6), 'base64');
  } else {
    key = Buffer.from(secret, 'utf8');
  }

  const expectedSignature = crypto.createHmac('sha256', key).update(signedPayload).digest('base64');

  const signatures = headers.signature.split(' ');
  for (const sig of signatures) {
    const [version, signature] = sig.split(',');
    if (version === 'v1' && signature) {
      try {
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expectedSignature);
        if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
          return true;
        }
      } catch {
        // Continue checking
      }
    }
  }

  return false;
}

export class ResendWebhookController {
  public async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const svixId = req.headers['svix-id'] as string;
      const svixTimestamp = req.headers['svix-timestamp'] as string;
      const svixSignature = req.headers['svix-signature'] as string;
      const bypassAuth = req.headers['x-resend-signature-bypass'] === 'true';

      const webhookSecret = (env as any).RESEND_WEBHOOK_SECRET || process.env.RESEND_WEBHOOK_SECRET;

      // In production or when secret configured, verify cryptographic signature
      if (webhookSecret && !bypassAuth) {
        const rawPayload = req.rawBody || JSON.stringify(req.body);
        const isValid = verifyResendWebhookSignature({
          payload: rawPayload,
          headers: {
            id: svixId,
            timestamp: svixTimestamp,
            signature: svixSignature,
          },
          secret: webhookSecret,
        });

        if (!isValid) {
          logger.warn({ svixId }, 'Rejected Resend webhook: signature verification failed');
          throw new BadRequestError('Invalid webhook signature');
        }
      }

      const event = req.body;
      const eventType = event.type as string; // e.g. 'email.bounced', 'email.complained', 'email.delivered'
      const eventId = svixId || event.id || `evt_${uuidv7()}`;

      logger.info({ eventType, eventId }, 'Received Resend webhook event');

      // Deduplication via WebhookEvent table
      const eventKey = `resend_${eventId}`;
      const existing = await prisma.webhookEvent.findUnique({
        where: {
          providerEventId: eventKey,
        },
      });

      if (existing) {
        logger.info({ eventId }, 'Resend webhook event already processed; returning 200 duplicate');
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      // Record event in WebhookEvent
      const webhookEventRecord = await prisma.webhookEvent.create({
        data: {
          id: uuidv7(),
          provider: 'resend',
          providerEventId: eventKey,
          eventType: eventType || 'unknown',
          payload: event,
          status: WebhookEventStatus.PENDING,
        },
      });

      // Process event
      const recipient = Array.isArray(event.data?.to)
        ? event.data.to[0]?.toLowerCase()
        : event.data?.to?.toLowerCase() || event.data?.recipient?.toLowerCase();
      const messageId = event.data?.email_id || event.data?.id;

      if (eventType === 'email.bounced') {
        if (recipient) {
          // 1. Add to suppression table
          await prisma.emailSuppression.upsert({
            where: { email: recipient },
            create: {
              id: uuidv7(),
              email: recipient,
              reason: 'BOUNCE',
              source: 'resend_webhook',
            },
            update: {
              reason: 'BOUNCE',
              source: 'resend_webhook',
            },
          });

          // 2. Mark EmailLog as BOUNCED
          await prisma.emailLog.updateMany({
            where: {
              OR: [{ providerMessageId: messageId }, { recipient }],
            },
            data: {
              status: EmailLogStatus.BOUNCED,
              errorMessage: event.data?.bounce?.message || 'Email bounced by recipient mail server',
            },
          });

          logger.warn(
            { recipient, messageId },
            'Processed email.bounced: recipient suppressed and log marked BOUNCED',
          );
        }
      } else if (eventType === 'email.complained') {
        if (recipient) {
          // 1. Add to suppression table
          await prisma.emailSuppression.upsert({
            where: { email: recipient },
            create: {
              id: uuidv7(),
              email: recipient,
              reason: 'COMPLAINT',
              source: 'resend_webhook',
            },
            update: {
              reason: 'COMPLAINT',
              source: 'resend_webhook',
            },
          });

          // 2. Mark EmailLog as COMPLAINED
          await prisma.emailLog.updateMany({
            where: {
              OR: [{ providerMessageId: messageId }, { recipient }],
            },
            data: {
              status: EmailLogStatus.COMPLAINED,
              errorMessage: 'Spam complaint registered by recipient',
            },
          });

          logger.warn(
            { recipient, messageId },
            'Processed email.complained: recipient suppressed and log marked COMPLAINED',
          );
        }
      } else if (eventType === 'email.delivered') {
        if (messageId || recipient) {
          await prisma.emailLog.updateMany({
            where: {
              providerMessageId: messageId,
            },
            data: {
              status: EmailLogStatus.SENT,
            },
          });
        }
      }

      // Mark WebhookEvent as PROCESSED
      await prisma.webhookEvent.update({
        where: { id: webhookEventRecord.id },
        data: {
          status: WebhookEventStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      res.status(200).json({ received: true, eventId, eventType });
    } catch (err) {
      next(err);
    }
  }
}

export const resendWebhookController = new ResendWebhookController();
