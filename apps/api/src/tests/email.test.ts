import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { uuidv7 } from 'uuidv7';
import { createApp } from '../app.js';
import { prisma } from '../common/db/prisma.js';
import { redisClient } from '../common/redis/redis.js';
import { env } from '../config/env.js';
import { logger } from '../common/logger/logger.js';
import {
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getPasswordChangedTemplate,
  getOrderReceiptTemplate,
  getRefundConfirmationTemplate,
  getAdminAccessGrantedTemplate,
  getAccountExistsNoticeTemplate,
  assertNoTodoMarkers,
  buildEmailHtml,
} from '../common/email/email.templates.js';
import { emailService } from '../common/email/email.service.js';
import { ConsoleEmailProvider } from '../common/email/email-provider.interface.js';
import {
  ResendEmailProvider,
  RateLimitExceededError,
} from '../common/email/resend-email.provider.js';
import { assertEmailRateLimit } from '../common/middleware/email-rate-limiter.js';
import { verifyResendWebhookSignature } from '../modules/webhooks/resend.webhook.js';
import { signAccessToken } from '../common/crypto/jwt.js';
import { orderService } from '../modules/orders/order.service.js';
import { invoiceService, INVOICES_DIR } from '../modules/invoices/invoice.service.js';
import { checkTurnstileConfiguration } from '../modules/contact/contact.controller.js';
import fs from 'fs';
import path from 'path';
import {
  EmailLogStatus,
  OrderStatus,
  UserRole,
  UserStatus,
  EntitlementStatus,
  RefundStatus,
} from '@course/shared';

describe('Phase 8 Production Email Infrastructure & System Notifications Integration Suite', () => {
  const app = createApp();

  beforeAll(async () => {
    // Clear any test suppressions and email logs
    await prisma.emailSuppression.deleteMany({
      where: {
        email: { contains: 'testcourse.com' },
      },
    });
    await prisma.emailLog.deleteMany({
      where: {
        recipient: { contains: 'testcourse.com' },
      },
    });
  });

  afterAll(async () => {
    await prisma.emailSuppression.deleteMany({
      where: {
        email: { contains: 'testcourse.com' },
      },
    });
    await prisma.emailLog.deleteMany({
      where: {
        recipient: { contains: 'testcourse.com' },
      },
    });
  });

  // ---------------------------------------------------------------------------
  // 1. TEMPLATES RENDERING & CODE QUALITY
  // ---------------------------------------------------------------------------
  describe('1. Email Templates Quality & Rendering', () => {
    it('buildEmailHtml asserts no [TODO_REPLACE] markers and adheres to design standards', () => {
      const html = buildEmailHtml({
        title: 'Test Email',
        contentHtml: '<p>This is test content</p>',
        cta: { text: 'Click Here', url: 'https://hydrauliccourse.com/test' },
      });

      expect(html).toContain('Hydraulic Engineering Academy');
      expect(html).toContain('#0A192F'); // Dark Blue
      expect(html).toContain('#E05305'); // Orange fill
      expect(html).toContain('min-height: 44px'); // Touch target
      expect(html).not.toContain('[TODO_REPLACE');
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('null');
    });

    it('assertNoTodoMarkers throws error if [TODO_REPLACE] exists in content', () => {
      expect(() => {
        assertNoTodoMarkers('Hello [TODO_REPLACE_TOKEN] user');
      }).toThrow(/leftover placeholder/);
    });

    it('renders all 7 transactional email templates cleanly with full parameters', () => {
      const templates = [
        getEmailVerificationTemplate({
          name: 'Vikram Patel',
          token: 'token_verification_123',
        }),
        getPasswordResetTemplate({
          name: 'Vikram Patel',
          token: 'token_reset_456',
        }),
        getPasswordChangedTemplate({
          name: 'Vikram Patel',
          changedAt: new Date('2026-10-18T10:00:00Z'),
        }),
        getOrderReceiptTemplate({
          name: 'Vikram Patel',
          courseTitle: 'Hydraulics 101',
          invoiceNumber: 'INV/26-27/00042',
          amountPaise: 299900,
          orderId: uuidv7(),
          expiresAt: new Date('2027-10-18T10:00:00Z'),
        }),
        getRefundConfirmationTemplate({
          name: 'Vikram Patel',
          courseTitle: 'Hydraulics 101',
          orderId: uuidv7(),
          amountPaise: 299900,
          reason: 'Accidental double purchase',
        }),
        getAdminAccessGrantedTemplate({
          name: 'Vikram Patel',
          courseTitle: 'Hydraulics 101',
          slug: 'hydraulics-101',
          expiresAt: null,
        }),
        getAccountExistsNoticeTemplate({
          name: 'Vikram Patel',
        }),
      ];

      for (const t of templates) {
        expect(t.subject.length).toBeGreaterThan(5);
        expect(t.html.length).toBeGreaterThan(100);
        expect(t.text.length).toBeGreaterThan(50);
        expect(t.html).not.toContain('[TODO_REPLACE');
        expect(t.text).not.toContain('[TODO_REPLACE');
        expect(t.html).not.toContain('undefined');
        expect(t.text).not.toContain('undefined');
      }
    });

    it('renders templates properly with optional fields omitted', () => {
      // Order receipt without expiry (lifetime)
      const receipt = getOrderReceiptTemplate({
        name: 'Anita Roy',
        courseTitle: 'Proportional Valves',
        invoiceNumber: 'INV/26-27/00043',
        amountPaise: 499900,
        orderId: uuidv7(),
        expiresAt: null,
      });
      expect(receipt.text).toContain('Lifetime Access');
      expect(receipt.html).toContain('Lifetime Access');

      // Refund without reason
      const refund = getRefundConfirmationTemplate({
        name: 'Anita Roy',
        courseTitle: 'Proportional Valves',
        orderId: uuidv7(),
        amountPaise: 499900,
      });
      expect(refund.text).not.toContain('Reason: undefined');
      expect(refund.text).toContain('Expected Timeline:');

      // Admin access with lifetime access
      const adminAccess = getAdminAccessGrantedTemplate({
        name: 'Anita Roy',
        courseTitle: 'Proportional Valves',
        slug: 'proportional-valves',
      });
      expect(adminAccess.text).toContain('Lifetime Access');
    });

    it('embeds APP_URL correctly in all links', () => {
      const verify = getEmailVerificationTemplate({ name: 'User', token: 'xyz' });
      expect(verify.html).toContain(`${env.APP_URL}/verify-email?token=xyz`);

      const reset = getPasswordResetTemplate({ name: 'User', token: 'abc' });
      expect(reset.html).toContain(`${env.APP_URL}/reset-password?token=abc`);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. IDEMPOTENCY & DISPATCH QUEUEING
  // ---------------------------------------------------------------------------
  describe('2. Email Idempotency & Database Tracking', () => {
    it('dispatches email and records EmailLog record in database', async () => {
      const testRecipient = `dispatch_${Date.now()}@testcourse.com`;
      const idempotencyKey = `TEST_IDEMP:${uuidv7()}`;

      const log = await emailService.dispatchEmail({
        to: testRecipient,
        subject: 'Test Dispatch',
        text: 'Hello test',
        html: '<p>Hello test</p>',
        template: 'TEST_TEMPLATE',
        idempotencyKey,
      });

      expect(log).toBeDefined();
      expect(log.emailLogId).toBeDefined();
      expect(log.status).toBe(EmailLogStatus.SENT);

      const dbLog = await prisma.emailLog.findUnique({
        where: { idempotencyKey },
      });
      expect(dbLog).not.toBeNull();
      expect(dbLog?.recipient).toBe(testRecipient);
      expect(dbLog?.status).toBe(EmailLogStatus.SENT);
    });

    it('enforces idempotency: duplicate dispatch with same idempotencyKey returns existing log without sending twice', async () => {
      const testRecipient = `idemp_${Date.now()}@testcourse.com`;
      const idempotencyKey = `PURCHASE_RECEIPT:ORD_${uuidv7()}`;

      // First dispatch
      const first = await emailService.dispatchEmail({
        to: testRecipient,
        subject: 'Order Confirmation',
        text: 'Your order is confirmed',
        html: '<p>Your order is confirmed</p>',
        template: 'ORDER_RECEIPT',
        idempotencyKey,
      });

      // Second dispatch with same idempotency key (simulating duplicate webhook / retry)
      const second = await emailService.dispatchEmail({
        to: testRecipient,
        subject: 'Order Confirmation (Duplicate)',
        text: 'Your order is confirmed duplicate',
        html: '<p>Your order is confirmed duplicate</p>',
        template: 'ORDER_RECEIPT',
        idempotencyKey,
      });

      expect(second.emailLogId).toBe(first.emailLogId);
      expect(second.status).toBe(first.status);

      // Verify only 1 record exists in EmailLog
      const count = await prisma.emailLog.count({
        where: { idempotencyKey },
      });
      expect(count).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. SUPPRESSION LIST HANDLING
  // ---------------------------------------------------------------------------
  describe('3. Email Suppression List Enforcement', () => {
    it('skips dispatching to suppressed email addresses and logs FAILED with suppression error', async () => {
      const suppressedEmail = `bounced_${Date.now()}@testcourse.com`;

      // Add to suppression list
      await prisma.emailSuppression.create({
        data: {
          id: uuidv7(),
          email: suppressedEmail,
          reason: 'BOUNCE',
          source: 'test_setup',
        },
      });

      // Attempt dispatch
      const log = await emailService.dispatchEmail({
        to: suppressedEmail,
        subject: 'Important Update',
        text: 'This should not be delivered',
        html: '<p>This should not be delivered</p>',
        template: 'ACCOUNT_NOTICE',
      });

      expect(log.status).toBe(EmailLogStatus.FAILED);
      const dbLog = await prisma.emailLog.findUnique({
        where: { id: log.emailLogId },
      });
      expect(dbLog?.errorMessage).toContain('suppression list');
    });

    it('isSuppressed returns true for suppressed address case-insensitively', async () => {
      const email = `suppress_case_${Date.now()}@testcourse.com`;
      await prisma.emailSuppression.create({
        data: {
          id: uuidv7(),
          email: email.toLowerCase(),
          reason: 'COMPLAINT',
        },
      });

      const isSupp = await emailService.isSuppressed(email.toUpperCase());
      expect(isSupp).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. MULTI-TIER RATE LIMITING
  // ---------------------------------------------------------------------------
  describe('4. Multi-Tier Sensitive Email Rate Limiting', () => {
    it('enforces per-account rate limit in Redis', async () => {
      const testEmail = `ratelimit_acct_${Date.now()}@testcourse.com`;
      const testIp = `192.168.10.${Math.floor(Math.random() * 200 + 1)}`;

      // Use a tight custom limit for testing: limit = 2
      const customConfig = { accountLimit: 2, ipLimit: 10, globalLimit: 100 };

      // 1st request - ok
      await expect(
        assertEmailRateLimit(testEmail, testIp, 'resend_verification', customConfig),
      ).resolves.not.toThrow();

      // 2nd request - ok
      await expect(
        assertEmailRateLimit(testEmail, testIp, 'resend_verification', customConfig),
      ).resolves.not.toThrow();

      // 3rd request - should throw RateLimitError
      await expect(
        assertEmailRateLimit(testEmail, testIp, 'resend_verification', customConfig),
      ).rejects.toThrow(/Too many requests for this account/);
    });

    it('enforces per-IP rate limit across different accounts', async () => {
      const sharedIp = `10.200.50.${Math.floor(Math.random() * 200 + 1)}`;
      const customConfig = { accountLimit: 10, ipLimit: 2, globalLimit: 100 };

      await expect(
        assertEmailRateLimit(
          `user1_${Date.now()}@testcourse.com`,
          sharedIp,
          'forgot_password',
          customConfig,
        ),
      ).resolves.not.toThrow();

      await expect(
        assertEmailRateLimit(
          `user2_${Date.now()}@testcourse.com`,
          sharedIp,
          'forgot_password',
          customConfig,
        ),
      ).resolves.not.toThrow();

      // 3rd request from same IP should fail
      await expect(
        assertEmailRateLimit(
          `user3_${Date.now()}@testcourse.com`,
          sharedIp,
          'forgot_password',
          customConfig,
        ),
      ).rejects.toThrow(/Too many requests from your IP address/);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. RESEND WEBHOOK & SIGNATURE VERIFICATION
  // ---------------------------------------------------------------------------
  describe('5. Resend Webhook Verification & Processing (W2)', () => {
    // Official documentation citations:
    // - Resend Webhook Verification: https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
    // - Svix Webhook Verification: https://docs.svix.com/receiving/verifying-payloads/how
    const testSecret = 'whsec_dGVzdF9zZWNyZXRfa2V5X2Zvcl9zdml4X2hhc2g=';

    it('verifyResendWebhookSignature validates authentic Svix signature against raw payload', () => {
      const payload = JSON.stringify({ type: 'email.delivered', id: 'evt_123' });
      const id = 'msg_svix_test_01';
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signedPayload = `${id}.${timestamp}.${payload}`;

      const rawSecret = Buffer.from(testSecret.slice(6), 'base64');
      const signature = crypto
        .createHmac('sha256', rawSecret)
        .update(signedPayload)
        .digest('base64');

      const isValid = verifyResendWebhookSignature({
        payload,
        headers: {
          id,
          timestamp,
          signature: `v1,${signature}`,
        },
        secret: testSecret,
      });

      expect(isValid).toBe(true);
    });

    it('verifyResendWebhookSignature rejects tampered or forged signatures', () => {
      const payload = JSON.stringify({ type: 'email.bounced' });
      const id = 'msg_svix_test_02';
      const timestamp = String(Math.floor(Date.now() / 1000));

      const isValid = verifyResendWebhookSignature({
        payload,
        headers: {
          id,
          timestamp,
          signature: 'v1,tampered_signature_bytes_invalid==',
        },
        secret: testSecret,
      });

      expect(isValid).toBe(false);
    });

    it('verifyResendWebhookSignature rejects stale timestamps outside 300s tolerance (Svix spec)', () => {
      const payload = JSON.stringify({ type: 'email.delivered', id: 'evt_stale_1' });
      const id = 'msg_svix_test_stale';
      const now = Math.floor(Date.now() / 1000);
      const staleTimestamp = String(now - 305); // 305 seconds old (> 300s tolerance)
      const signedPayload = `${id}.${staleTimestamp}.${payload}`;

      const rawSecret = Buffer.from(testSecret.slice(6), 'base64');
      const signature = crypto
        .createHmac('sha256', rawSecret)
        .update(signedPayload)
        .digest('base64');

      const isStaleValid = verifyResendWebhookSignature({
        payload,
        headers: {
          id,
          timestamp: staleTimestamp,
          signature: `v1,${signature}`,
        },
        secret: testSecret,
      });

      expect(isStaleValid).toBe(false);

      // Future timestamp beyond 300s is also rejected
      const futureTimestamp = String(now + 310);
      const futureSignedPayload = `${id}.${futureTimestamp}.${payload}`;
      const futureSig = crypto
        .createHmac('sha256', rawSecret)
        .update(futureSignedPayload)
        .digest('base64');

      const isFutureValid = verifyResendWebhookSignature({
        payload,
        headers: {
          id,
          timestamp: futureTimestamp,
          signature: `v1,${futureSig}`,
        },
        secret: testSecret,
      });

      expect(isFutureValid).toBe(false);
    });

    it('webhook endpoint rejects requests with 400 Bad Request if signature is invalid or timestamp is stale', async () => {
      const prevSecret = process.env.RESEND_WEBHOOK_SECRET;
      process.env.RESEND_WEBHOOK_SECRET = testSecret;

      try {
        const payload = { type: 'email.delivered', id: `evt_sig_fail_${Date.now()}` };
        const id = 'msg_svix_req_fail';
        const staleTimestamp = String(Math.floor(Date.now() / 1000) - 400);

        // 1. Stale timestamp (rejected with 400)
        const staleRes = await request(app)
          .post('/api/v1/webhooks/resend')
          .set('svix-id', id)
          .set('svix-timestamp', staleTimestamp)
          .set('svix-signature', 'v1,some_signature')
          .send(payload);

        expect(staleRes.status).toBe(400);
        expect(staleRes.body.error).toBeDefined();

        // 2. Tampered signature (rejected with 400)
        const currentTimestamp = String(Math.floor(Date.now() / 1000));
        const tamperedRes = await request(app)
          .post('/api/v1/webhooks/resend')
          .set('svix-id', id)
          .set('svix-timestamp', currentTimestamp)
          .set('svix-signature', 'v1,totally_invalid_signature_tampered==')
          .send(payload);

        expect(tamperedRes.status).toBe(400);
        expect(tamperedRes.body.error).toBeDefined();
      } finally {
        process.env.RESEND_WEBHOOK_SECRET = prevSecret;
      }
    });

    it('processes email.bounced webhook, adds to suppression list, and updates EmailLog status', async () => {
      const bounceEmail = `webhook_bounce_${Date.now()}@testcourse.com`;
      const providerMessageId = `resend_msg_${uuidv7()}`;

      // Create an existing EmailLog in database
      await prisma.emailLog.create({
        data: {
          id: uuidv7(),
          recipient: bounceEmail,
          template: 'EMAIL_VERIFICATION',
          subject: 'Verify your account',
          status: EmailLogStatus.SENT,
          providerMessageId,
        },
      });

      // Post bounced webhook payload with bypass header for test execution
      const res = await request(app)
        .post('/api/v1/webhooks/resend')
        .set('x-resend-signature-bypass', 'true')
        .send({
          type: 'email.bounced',
          id: `evt_bounce_${Date.now()}`,
          data: {
            email_id: providerMessageId,
            to: [bounceEmail],
            bounce: {
              message: '550 5.1.1 User unknown',
            },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      // Verify email was added to EmailSuppression
      const suppression = await prisma.emailSuppression.findUnique({
        where: { email: bounceEmail.toLowerCase() },
      });
      expect(suppression).not.toBeNull();
      expect(suppression?.reason).toBe('BOUNCE');

      // Verify EmailLog status was updated to BOUNCED
      const updatedLog = await prisma.emailLog.findFirst({
        where: { recipient: bounceEmail },
      });
      expect(updatedLog?.status).toBe(EmailLogStatus.BOUNCED);
      expect(updatedLog?.errorMessage).toBe('550 5.1.1 User unknown');
    });

    it('processes email.complained webhook and suppresses recipient', async () => {
      const complaintEmail = `webhook_complaint_${Date.now()}@testcourse.com`;
      const providerMessageId = `resend_msg_${uuidv7()}`;

      await prisma.emailLog.create({
        data: {
          id: uuidv7(),
          recipient: complaintEmail,
          template: 'ORDER_RECEIPT',
          subject: 'Receipt',
          status: EmailLogStatus.SENT,
          providerMessageId,
        },
      });

      const res = await request(app)
        .post('/api/v1/webhooks/resend')
        .set('x-resend-signature-bypass', 'true')
        .send({
          type: 'email.complained',
          id: `evt_complaint_${Date.now()}`,
          data: {
            email_id: providerMessageId,
            to: [complaintEmail],
          },
        });

      expect(res.status).toBe(200);

      const suppression = await prisma.emailSuppression.findUnique({
        where: { email: complaintEmail.toLowerCase() },
      });
      expect(suppression).not.toBeNull();
      expect(suppression?.reason).toBe('COMPLAINT');

      const log = await prisma.emailLog.findFirst({
        where: { recipient: complaintEmail },
      });
      expect(log?.status).toBe(EmailLogStatus.COMPLAINED);
    });

    it('webhook endpoint deduplicates events using WebhookEvent table', async () => {
      const eventId = `evt_dedup_${Date.now()}`;
      const payload = {
        type: 'email.delivered',
        id: eventId,
        data: { to: 'student@example.com' },
      };

      // First call
      const res1 = await request(app)
        .post('/api/v1/webhooks/resend')
        .set('x-resend-signature-bypass', 'true')
        .send(payload);
      expect(res1.status).toBe(200);
      expect(res1.body.duplicate).toBeUndefined();

      // Second call with same event ID
      const res2 = await request(app)
        .post('/api/v1/webhooks/resend')
        .set('x-resend-signature-bypass', 'true')
        .send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body.duplicate).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. CONTACT FORM SUBMISSION
  // ---------------------------------------------------------------------------
  describe('6. Public Contact Form Endpoint', () => {
    beforeEach(async () => {
      await redisClient.flushdb();
    });

    it('successfully processes valid contact submission and stores in database', async () => {
      const res = await request(app).post('/api/v1/contact').send({
        name: 'Suresh Raina',
        email: 'suresh.raina@testcourse.com',
        subject: 'Inquiry regarding corporate batch enrollment',
        message:
          'Hello, we would like to enroll 15 mechanical engineers in the hydraulics masterclass.',
        website: '', // Empty honeypot
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('received your inquiry');
      expect(res.body.data.submissionId).toBeDefined();

      // Verify record in ContactSubmission table
      const submission = await prisma.contactSubmission.findUnique({
        where: { id: res.body.data.submissionId },
      });
      expect(submission).not.toBeNull();
      expect(submission?.name).toBe('Suresh Raina');
      expect(submission?.email).toBe('suresh.raina@testcourse.com');
      expect(submission?.status).toBe('PENDING');
    });

    it('rejects contact submission with invalid fields via Zod validation', async () => {
      const res = await request(app).post('/api/v1/contact').send({
        name: '',
        email: 'invalid-email',
        subject: '',
        message: 'short',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('honeypot trap: drops automated bot submission silently with 200 without creating DB entry', async () => {
      const initialCount = await prisma.contactSubmission.count();

      const res = await request(app).post('/api/v1/contact').send({
        name: 'Spam Bot 3000',
        email: 'bot@spamnetwork.com',
        subject: 'Buy cheap watches',
        message: 'Check out our spam website for fake products.',
        website: 'https://spam-bot-trap.com', // Filled honeypot
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const finalCount = await prisma.contactSubmission.count();
      expect(finalCount).toBe(initialCount); // Zero new records added
    });
  });

  // ---------------------------------------------------------------------------
  // 7. DEV EMAIL PREVIEWS ROUTE
  // ---------------------------------------------------------------------------
  describe('7. Dev Email Previews Route', () => {
    const originalEnable = env.ENABLE_DEV_ROUTES;
    const originalNodeEnv = env.NODE_ENV;

    afterEach(() => {
      (env as any).ENABLE_DEV_ROUTES = originalEnable;
      (env as any).NODE_ENV = originalNodeEnv;
    });

    it('serves interactive dev email previews gallery when ENABLE_DEV_ROUTES is enabled', async () => {
      (env as any).ENABLE_DEV_ROUTES = true;
      (env as any).NODE_ENV = 'development';
      const devApp = createApp();

      const res = await request(devApp).get('/dev/email-previews');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Email Template Previews');
      expect(res.text).toContain('1. Email Verification');
      expect(res.text).toContain('4. Order Receipt & Invoice');
    });

    it('serves raw HTML for iframe email inspection', async () => {
      (env as any).ENABLE_DEV_ROUTES = true;
      (env as any).NODE_ENV = 'development';
      const devApp = createApp();

      const res = await request(devApp).get('/dev/email-previews/raw?template=order-receipt');
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/html');
      expect(res.text).toContain('Hydraulic Engineering Academy');
      expect(res.text).toContain('Invoice Number');
    });

    it('returns 404 when ENABLE_DEV_ROUTES is false', async () => {
      (env as any).ENABLE_DEV_ROUTES = false;
      const disabledApp = createApp();
      const res = await request(disabledApp).get('/dev/email-previews');
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. PAYMENT & REFUND RESILIENCE: EMAIL FAILURE NEVER BLOCKS TRANSACTIONS (W1)
  // ---------------------------------------------------------------------------
  describe('8. Payment & Refund Resilience: Email Failure Never Blocks Financial Transactions (W1)', () => {
    it('order fulfillment, active entitlement, and invoice creation commit and complete successfully even when email provider and BullMQ queue fail simultaneously', async () => {
      // 1. Create student user, course product, and order in PENDING status
      const user = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: `student_w1_${Date.now()}@testcourse.com`,
          name: 'Resilient Student W1',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          slug: `course-resilience-w1-${Date.now()}`,
          title: 'Hydraulic Systems Resilience Masterclass',
          description: 'Testing non-blocking email behavior',
          pricePaise: 499900,
          status: 'PUBLISHED',
          validityDays: null, // Lifetime
        },
      });

      const order = await prisma.order.create({
        data: {
          id: uuidv7(),
          userId: user.id,
          productId: product.id,
          status: OrderStatus.PENDING,
          subtotalPaise: 423644,
          taxPaise: 76256,
          totalPaise: 499900,
          currency: 'INR',
          idempotencyKey: `idem_w1_${Date.now()}_${uuidv7()}`,
        },
      });

      // 2. Simulate catastrophic failure where BOTH queue and email provider fail/reject
      const emailSpy = vi
        .spyOn(emailService, 'sendOrderReceiptEmail')
        .mockRejectedValue(new Error('BullMQ Redis connection timeout & Resend API 500 fatal'));
      const dispatchSpy = vi
        .spyOn(emailService, 'dispatchEmail')
        .mockRejectedValue(new Error('Queue worker failure'));

      try {
        const paymentId = `pay_w1_fail_${Date.now()}`;
        const result = await orderService.markOrderPaid(order.id, {
          paymentId,
          amountPaise: 499900,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          rawGatewayPayload: { paymentId, status: 'captured' },
        });

        // 3. Confirm fulfillment succeeded and returned PAID order
        expect(result.order.status).toBe(OrderStatus.PAID);
        expect(result.invoice).toBeDefined();

        // 4. Verify in database: Order is PAID with paidAt timestamp
        const dbOrder = await prisma.order.findUnique({
          where: { id: order.id },
        });
        expect(dbOrder?.status).toBe(OrderStatus.PAID);
        expect(dbOrder?.paidAt).not.toBeNull();

        // 5. Verify in database: Entitlement is granted and ACTIVE
        const dbEntitlement = await prisma.entitlement.findFirst({
          where: {
            userId: user.id,
            productId: product.id,
          },
        });
        expect(dbEntitlement).not.toBeNull();
        expect(dbEntitlement?.status).toBe(EntitlementStatus.ACTIVE);

        // 6. Verify in database: Sequential invoice was generated and committed
        const dbInvoice = await prisma.invoice.findFirst({
          where: { orderId: order.id },
        });
        expect(dbInvoice).not.toBeNull();
        expect(dbInvoice?.invoiceNumber).toBeDefined();
        expect(dbInvoice?.totalPaise).toBe(499900);
      } finally {
        emailSpy.mockRestore();
        dispatchSpy.mockRestore();
      }
    });

    it('refund processing completes, updates order to REFUNDED, and revokes entitlement even when refund confirmation email throws', async () => {
      // 1. Create student user and course product
      const user = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: `student_refund_w1_${Date.now()}@testcourse.com`,
          name: 'Refund Student W1',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          slug: `course-refund-w1-${Date.now()}`,
          title: 'Hydraulic Refund Masterclass',
          description: 'Testing non-blocking refund email behavior',
          pricePaise: 299900,
          status: 'PUBLISHED',
          validityDays: null,
        },
      });

      // 2. Create paid order with captured payment and active entitlement
      const order = await prisma.order.create({
        data: {
          id: uuidv7(),
          userId: user.id,
          productId: product.id,
          status: OrderStatus.PAID,
          subtotalPaise: 254152,
          taxPaise: 45748,
          totalPaise: 299900,
          currency: 'INR',
          paidAt: new Date(),
          idempotencyKey: `idem_rfnd_w1_${Date.now()}_${uuidv7()}`,
        },
      });

      const gatewayPaymentId = `pay_rfnd_w1_${Date.now()}`;
      await prisma.payment.create({
        data: {
          id: uuidv7(),
          orderId: order.id,
          razorpayPaymentId: gatewayPaymentId,
          amountPaise: 299900,
          status: 'CAPTURED',
          method: 'netbanking',
        },
      });

      await prisma.entitlement.create({
        data: {
          id: uuidv7(),
          userId: user.id,
          productId: product.id,
          orderId: order.id,
          status: EntitlementStatus.ACTIVE,
          source: 'PURCHASE',
        },
      });

      // 3. Spy on emailService.sendRefundConfirmationEmail to simulate email system crashing
      const refundEmailSpy = vi
        .spyOn(emailService, 'sendRefundConfirmationEmail')
        .mockRejectedValue(new Error('Resend API down during refund notification'));

      try {
        const gatewayRefundId = `rfnd_w1_${Date.now()}`;
        const refundResult = await orderService.handleRefundProcessed({
          id: gatewayRefundId,
          payment_id: gatewayPaymentId,
          amount: 299900,
        });

        // 4. Confirm refund processing succeeded
        expect(refundResult.success).toBe(true);
        expect(refundResult.isFullRefund).toBe(true);

        // 5. Verify database state: Refund marked PROCESSED
        const dbRefund = await prisma.refund.findUnique({
          where: { razorpayRefundId: gatewayRefundId },
        });
        expect(dbRefund?.status).toBe(RefundStatus.PROCESSED);

        // 6. Verify database state: Order marked REFUNDED
        const dbOrder = await prisma.order.findUnique({
          where: { id: order.id },
        });
        expect(dbOrder?.status).toBe(OrderStatus.REFUNDED);

        // 7. Verify database state: Entitlement revoked
        const dbEntitlement = await prisma.entitlement.findFirst({
          where: {
            userId: user.id,
            productId: product.id,
          },
        });
        expect(dbEntitlement?.status).toBe(EntitlementStatus.REVOKED);
      } finally {
        refundEmailSpy.mockRestore();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 9. QUEUE THROTTLING & BACKLOG CAPACITY ALERTS (W5)
  // ---------------------------------------------------------------------------
  describe('9. Queue Throttling & Backlog Capacity Alerts (Phase 9 A1)', () => {
    it('BullMQ worker configuration enforces Resend rate limiter (5 req/s) per Phase 9 A1', () => {
      // Resend documentation citation: https://resend.com/docs/api-reference/rate-limits
      // Limiter set to 5 sends/second per Phase 9 requirement A1
      const testWorker = emailService.startTestWorker();
      try {
        expect(testWorker.opts.limiter).toBeDefined();
        expect(testWorker.opts.limiter?.max).toBe(5);
        expect(testWorker.opts.limiter?.duration).toBe(1000);
      } finally {
        testWorker.close();
      }
    });

    it('honors 429 response retry-after header and backs off gracefully instead of failing (A1)', async () => {
      const originalFetch = global.fetch;
      try {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'retry-after': '3' }),
          json: async () => ({ message: 'Rate limit exceeded' }),
        }) as any;

        const resendProvider = new ResendEmailProvider({
          apiKey: 're_test_key_123',
          fromAddress: 'updates@course.dev',
        });

        // Verify that RateLimitExceededError carries the parsed retryAfterSeconds
        try {
          await resendProvider.sendEmail({
            to: 'student@example.com',
            subject: 'Test Rate Limit',
            html: '<p>Test</p>',
            text: 'Test',
            template: 'SYSTEM_NOTIFICATION',
          });
          expect.fail('Should have thrown RateLimitExceededError');
        } catch (err: any) {
          expect(err).toBeInstanceOf(RateLimitExceededError);
          expect(err.retryAfterSeconds).toBe(3);
        }

        // Verify processJob updates EmailLog with RATE_LIMITED message without setting status to FAILED
        const emailLog = await prisma.emailLog.create({
          data: {
            id: uuidv7(),
            recipient: 'student-rl@example.com',
            template: 'SYSTEM_NOTIFICATION',
            subject: 'Rate Limit Test',
            status: 'QUEUED',
            attempts: 0,
            idempotencyKey: `rl_test_${uuidv7()}`,
          },
        });

        emailService.setProviderForTesting(resendProvider);
        await expect(
          emailService.processJob(
            {
              emailLogId: emailLog.id,
              options: {
                to: 'student-rl@example.com',
                subject: 'Rate limit test',
                html: '<p>Hi</p>',
                text: 'Hi',
                template: 'SYSTEM_NOTIFICATION',
              },
            },
            0,
            4,
            'job-429-test',
          ),
        ).rejects.toThrow(RateLimitExceededError);

        const updatedLog = await prisma.emailLog.findUnique({ where: { id: emailLog.id } });
        expect(updatedLog?.status).not.toBe('FAILED');
        expect(updatedLog?.errorMessage).toContain('RATE_LIMITED_429');
        expect(updatedLog?.errorMessage).toContain('retrying in 3s');
      } finally {
        global.fetch = originalFetch;
        emailService.setProviderForTesting(new ConsoleEmailProvider());
      }
    });

    it('emits a warning log when email queue backlog exceeds configured threshold', async () => {
      const queue = emailService.getQueue();
      if (!queue) return;

      const warnSpy = vi.spyOn(logger, 'warn');
      const originalThreshold = emailService.getBacklogThreshold();

      try {
        // Lower threshold for testing to 1 job
        emailService.setBacklogThresholdForTesting(1);
        emailService.setDirectModeForTesting(false);

        // Enqueue 2 jobs: first job enters queue, second job checks queue and detects backlog >= 1
        await emailService.dispatchEmail({
          to: `backlog_alert_1_${Date.now()}@testcourse.com`,
          subject: 'Backlog Alert Job 1',
          html: '<p>Backlog 1</p>',
          text: 'Backlog 1',
        });

        await emailService.dispatchEmail({
          to: `backlog_alert_2_${Date.now()}@testcourse.com`,
          subject: 'Backlog Alert Job 2',
          html: '<p>Backlog 2</p>',
          text: 'Backlog 2',
        });

        const warningEmitted = warnSpy.mock.calls.some(
          (args) => typeof args[1] === 'string' && args[1].includes('backlog threshold exceeded'),
        );
        expect(warningEmitted).toBe(true);
      } finally {
        emailService.setBacklogThresholdForTesting(originalThreshold);
        emailService.setDirectModeForTesting(true);
        warnSpy.mockRestore();
        await queue.drain();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 10. CONTACT FORM TURNSTILE STARTUP SECURITY VERIFICATION (W6)
  // ---------------------------------------------------------------------------
  describe('10. Contact Form Turnstile Startup Security Verification (W6)', () => {
    it('checkTurnstileConfiguration logs startup warning when in production and Turnstile secret key is missing', () => {
      const originalNodeEnv = env.NODE_ENV;
      const originalKey = env.TURNSTILE_SECRET_KEY;
      const warnSpy = vi.spyOn(logger, 'warn');

      try {
        (env as any).NODE_ENV = 'production';
        (env as any).TURNSTILE_SECRET_KEY = undefined;

        checkTurnstileConfiguration();

        const warningEmitted = warnSpy.mock.calls.some(
          (args) =>
            typeof args[0] === 'string' &&
            args[0].includes('TURNSTILE_SECRET_KEY is missing or unconfigured in production'),
        );
        expect(warningEmitted).toBe(true);
      } finally {
        (env as any).NODE_ENV = originalNodeEnv;
        (env as any).TURNSTILE_SECRET_KEY = originalKey;
        warnSpy.mockRestore();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 11. DURABLE RECEIPTS, ASYNC DISPATCH & SWEEPER (PHASE 9 A2)
  // ---------------------------------------------------------------------------
  describe('11. Durable Receipts, Async Dispatch & Sweeper (Phase 9 A2)', () => {
    it('provider down during purchase: commits PAID, access granted, invoice generated, then recovery sweeper sends exactly one receipt', async () => {
      // 1. Create test user and product
      const testEmail = `durable-receipt-${Date.now()}@example.com`;
      const user = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: testEmail,
          passwordHash: 'dummy_hash',
          name: 'Durable Receipt User',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          title: 'Durable Receipts Masterclass',
          slug: `durable-${Date.now()}`,
          description: 'Testing durable receipts',
          pricePaise: 49900,
          currency: 'INR',
          status: 'PUBLISHED',
          validityDays: 365,
        },
      });

      const order = await prisma.order.create({
        data: {
          id: uuidv7(),
          userId: user.id,
          productId: product.id,
          subtotalPaise: 49900,
          taxPaise: 0,
          totalPaise: 49900,
          currency: 'INR',
          status: OrderStatus.PENDING,
          idempotencyKey: `dur_ord_${uuidv7()}`,
          razorpayOrderId: `order_dur_${uuidv7().substring(0, 14)}`,
        },
      });

      // 2. Simulate email provider DOWN during purchase
      const failingProvider = {
        sendEmail: vi.fn().mockRejectedValue(new Error('Resend Service Unavailable (503)')),
      };
      emailService.setProviderForTesting(failingProvider);

      // 3. Complete payment transaction
      const paymentResult = await orderService.markOrderPaid(order.id, {
        paymentId: `pay_dur_${uuidv7().substring(0, 14)}`,
        amountPaise: 49900,
        currency: 'INR',
        status: 'captured',
        method: 'upi',
      });

      // Verify order commits PAID, entitlement granted, invoice generated
      expect(paymentResult.order.status).toBe(OrderStatus.PAID);
      expect(paymentResult.entitlement).toBeDefined();
      expect(paymentResult.entitlement?.status).toBe(EntitlementStatus.ACTIVE);
      expect(paymentResult.invoice).toBeDefined();

      // Check EmailLog: no receipt successfully SENT
      const receiptKey = `ORDER_RECEIPT:${order.id}`;
      const logBeforeRecovery = await prisma.emailLog.findUnique({
        where: { idempotencyKey: receiptKey },
      });
      expect(logBeforeRecovery?.status).not.toBe(EmailLogStatus.SENT);

      // 4. Provider RECOVERS
      const workingProvider = new ConsoleEmailProvider();
      const sendSpy = vi.spyOn(workingProvider, 'sendEmail');
      emailService.setProviderForTesting(workingProvider);

      // 5. Run sweeper job
      const sweptCount = await invoiceService.sweepUnemailedPaidOrders();
      expect(sweptCount).toBeGreaterThanOrEqual(1);

      // 6. Assert receipt is now SENT
      const logAfterSweeper = await prisma.emailLog.findUnique({
        where: { idempotencyKey: receiptKey },
      });
      expect(logAfterSweeper?.status).toBe(EmailLogStatus.SENT);
      const studentReceiptCalls = sendSpy.mock.calls.filter((c) => c[0].to === testEmail);
      expect(studentReceiptCalls.length).toBe(1);

      // 7. Running sweeper again does not send duplicate
      sendSpy.mockClear();
      await invoiceService.sweepUnemailedPaidOrders();
      const duplicateCalls = sendSpy.mock.calls.filter((c) => c[0].to === testEmail);
      expect(duplicateCalls.length).toBe(0);

      // Clean up provider
      emailService.setProviderForTesting(new ConsoleEmailProvider());
    });

    it('invoice download regenerates PDF on demand if pdfUrl is missing or file is gone from disk', async () => {
      // 1. Create paid order and invoice
      const testEmail = `download-pdf-${Date.now()}@example.com`;
      const user = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: testEmail,
          passwordHash: 'dummy_hash',
          name: 'Download PDF User',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          title: 'PDF On-Demand Course',
          slug: `pdf-${Date.now()}`,
          description: 'Testing PDF generation',
          pricePaise: 19900,
          currency: 'INR',
          status: 'PUBLISHED',
          validityDays: 365,
        },
      });

      const order = await prisma.order.create({
        data: {
          id: uuidv7(),
          userId: user.id,
          productId: product.id,
          subtotalPaise: 19900,
          taxPaise: 0,
          totalPaise: 19900,
          currency: 'INR',
          status: OrderStatus.PAID,
          idempotencyKey: `pdf_ord_${uuidv7()}`,
          razorpayOrderId: `order_pdf_${uuidv7().substring(0, 14)}`,
        },
      });

      const invMeta = await invoiceService.generateInvoiceNumberUnderLock(prisma as any);
      const invoice = await prisma.invoice.create({
        data: {
          id: uuidv7(),
          orderId: order.id,
          invoiceNumber: invMeta.invoiceNumber,
          financialYear: invMeta.financialYear,
          sequenceNumber: invMeta.sequenceNumber,
          subtotalPaise: 19900,
          taxPaise: 0,
          totalPaise: 19900,
          billingDetails: {},
          pdfUrl: null, // Deliberately null
        },
      });

      // Ensure file does not exist on disk
      const safeFileName = `invoice-${invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`;
      const diskPath = path.join(INVOICES_DIR, safeFileName);
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }

      // Generate auth token for student
      const token = signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenVersion: 0,
      });

      // Call download endpoint
      const res = await request(app)
        .get(`/api/v1/invoices/${invoice.id}/download`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(fs.existsSync(diskPath)).toBe(true);

      // Check DB was updated with pdfUrl
      const updatedInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
      expect(updatedInvoice?.pdfUrl).toBeDefined();

      // Clean up file
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
    });
  });
});
