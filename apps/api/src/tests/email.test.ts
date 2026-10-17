import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { uuidv7 } from 'uuidv7';
import { createApp } from '../app.js';
import { prisma } from '../common/db/prisma.js';
import { redisClient } from '../common/redis/redis.js';
import { env } from '../config/env.js';
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
import { assertEmailRateLimit } from '../common/middleware/email-rate-limiter.js';
import { verifyResendWebhookSignature } from '../modules/webhooks/resend.webhook.js';
import { EmailLogStatus } from '@course/shared';

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
  describe('5. Resend Webhook Verification & Processing', () => {
    const testSecret = 'whsec_dGVzdF9zZWNyZXRfa2V5X2Zvcl9zdml4X2hhc2g=';

    it('verifyResendWebhookSignature validates authentic Svix signature', () => {
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
});
