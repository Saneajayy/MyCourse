import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../common/db/prisma.js';
import { uuidv7 } from 'uuidv7';
import { hashPassword } from '../common/crypto/argon2.js';
import { signAccessToken } from '../common/crypto/jwt.js';
import {
  UserRole,
  UserStatus,
  ProductStatus,
  OrderStatus,
  PaymentStatus,
  EntitlementStatus,
  CouponType,
} from '@course/shared';
import { setPaymentGateway } from '../modules/payments/payment.service.js';
import { FakePaymentGateway } from '../modules/payments/fake-payment.gateway.js';
import { orderService } from '../modules/orders/order.service.js';
import { invoiceService, getFinancialYear } from '../modules/invoices/invoice.service.js';

describe('Phase 4 Orders, Payments, Invoicing, and Entitlements Suite', () => {
  const app = createApp();
  const fakeGateway = new FakePaymentGateway();

  // Test users
  let verifiedStudentId: string;
  let verifiedStudentToken: string;

  let unverifiedStudentId: string;
  let unverifiedStudentToken: string;

  let adminId: string;
  let adminToken: string;

  // Base test product
  let testProductId: string;
  const coursePricePaise = 499900; // ₹4,999.00

  // Tracking dynamic entities created across test scenarios for clean teardown
  const createdUserIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdCouponIds: string[] = [];

  async function createTestStudent(emailPrefix: string) {
    const id = uuidv7();
    const email = `${emailPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@coursetest.com`;
    await prisma.user.create({
      data: {
        id,
        email,
        name: 'Test Student',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash: await hashPassword('SecurePassword#2026!'),
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
      },
    });
    const token = signAccessToken({
      sub: id,
      email,
      role: UserRole.STUDENT,
      tokenVersion: 0,
    });
    createdUserIds.push(id);
    return { id, token, email };
  }

  async function createTestProduct(
    title: string,
    validityDays: number | null = 365,
    allowRenewals = true,
    renewalWindowDays = 30,
  ) {
    const id = uuidv7();
    const product = await prisma.product.create({
      data: {
        id,
        slug: `course-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title,
        description: 'Test product for payment flows',
        pricePaise: coursePricePaise,
        currency: 'INR',
        validityDays,
        allowRenewals,
        renewalWindowDays,
        status: ProductStatus.PUBLISHED,
      },
    });
    createdProductIds.push(id);
    return product;
  }

  beforeAll(async () => {
    // Configure fake payment gateway
    setPaymentGateway(fakeGateway);

    const passwordHash = await hashPassword('SecurePassword#2026!');

    // 1. Create Verified Student
    verifiedStudentId = uuidv7();
    await prisma.user.create({
      data: {
        id: verifiedStudentId,
        email: `verified_${Date.now()}@coursetest.com`,
        name: 'Verified Student',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
      },
    });
    verifiedStudentToken = signAccessToken({
      sub: verifiedStudentId,
      email: `verified_${Date.now()}@coursetest.com`,
      role: UserRole.STUDENT,
      tokenVersion: 0,
    });

    // 2. Create Unverified Student
    unverifiedStudentId = uuidv7();
    await prisma.user.create({
      data: {
        id: unverifiedStudentId,
        email: `unverified_${Date.now()}@coursetest.com`,
        name: 'Unverified Student',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: null, // UNVERIFIED
        twoFactorEnabled: false,
      },
    });
    unverifiedStudentToken = signAccessToken({
      sub: unverifiedStudentId,
      email: `unverified_${Date.now()}@coursetest.com`,
      role: UserRole.STUDENT,
      tokenVersion: 0,
    });

    // 3. Create Admin with 2FA enabled (satisfies requireAdmin2FA middleware)
    adminId = uuidv7();
    await prisma.user.create({
      data: {
        id: adminId,
        email: `admin_${Date.now()}@coursetest.com`,
        name: 'Admin Tester',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: true,
      },
    });
    adminToken = signAccessToken({
      sub: adminId,
      email: `admin_${Date.now()}@coursetest.com`,
      role: UserRole.ADMIN,
      tokenVersion: 0,
    });

    // 4. Create Base Published Test Product (365 days access, renewal allowed, 30 days renewal window)
    testProductId = uuidv7();
    await prisma.product.create({
      data: {
        id: testProductId,
        slug: `course-payment-test-${Date.now()}`,
        title: 'Industrial Fluid Power Mastery',
        description: 'Complete hands-on masterclass on proportional hydraulics.',
        pricePaise: coursePricePaise,
        currency: 'INR',
        validityDays: 365,
        allowRenewals: true,
        renewalWindowDays: 30,
        status: ProductStatus.PUBLISHED,
      },
    });

    // Seed app settings if missing
    await prisma.appSetting.upsert({
      where: { key: 'business_profile' },
      create: {
        id: uuidv7(),
        key: 'business_profile',
        value: {
          businessName: 'Hydraulic Engineering Academy',
          businessAddress: '123 Industrial Area, Phase 2, New Delhi, India',
          supportEmail: 'support@hydrauliccourse.com',
        },
      },
      update: {},
    });

    await prisma.appSetting.upsert({
      where: { key: 'tax_config' },
      create: {
        id: uuidv7(),
        key: 'tax_config',
        value: {
          gstin: '07AAAAA0000A1Z5',
          gstRatePercent: 18,
          pricesTaxInclusive: true,
        },
      },
      update: {},
    });

    await prisma.appSetting.upsert({
      where: { key: 'invoice_config' },
      create: {
        id: uuidv7(),
        key: 'invoice_config',
        value: {
          invoicePrefix: 'INV',
          currentSequence: 0,
          financialYear: getFinancialYear(),
        },
      },
      update: {},
    });
  });

  afterAll(async () => {
    const allUserIds = [verifiedStudentId, unverifiedStudentId, adminId, ...createdUserIds];
    const allProductIds = [testProductId, ...createdProductIds];

    // Teardown created test entities
    await prisma.couponRedemption.deleteMany({
      where: { userId: { in: allUserIds } },
    });
    await prisma.entitlement.deleteMany({
      where: { userId: { in: allUserIds } },
    });
    await prisma.invoice.deleteMany({
      where: { order: { userId: { in: allUserIds } } },
    });
    await prisma.refund.deleteMany({
      where: { payment: { order: { userId: { in: allUserIds } } } },
    });
    await prisma.payment.deleteMany({
      where: { order: { userId: { in: allUserIds } } },
    });
    await prisma.order.deleteMany({
      where: { userId: { in: allUserIds } },
    });
    await prisma.coupon.deleteMany({
      where: {
        OR: [{ productId: { in: allProductIds } }, { id: { in: createdCouponIds } }],
      },
    });
    await prisma.product.deleteMany({
      where: { id: { in: allProductIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: allUserIds } },
    });
  });

  // ---------------------------------------------------------------------------
  // 1. EMAIL VERIFICATION & IDEMPOTENCY-KEY ENFORCEMENT
  // ---------------------------------------------------------------------------
  describe('Email Verification & Idempotency-Key Enforcement', () => {
    it('blocks unverified email students from creating orders with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${unverifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({
          productId: testProductId,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Email must be verified before purchasing courses');
    });

    it('rejects order creation without Idempotency-Key header with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .send({
          productId: testProductId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Idempotency-Key header is required');
    });

    it('creates an order successfully with verified email and returns gateway order details', async () => {
      const idemKey = uuidv7();
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', idemKey)
        .send({
          productId: testProductId,
          utmSource: 'youtube',
          utmCampaign: 'hydraulic_mastery_launch',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.totalPaise).toBe(coursePricePaise);
      expect(res.body.data.order.utmSource).toBe('youtube');
      expect(res.body.data.order.utmCampaign).toBe('hydraulic_mastery_launch');
      expect(res.body.data.razorpayOrderId).toMatch(/^order_fake_/);
      expect(res.body.data.isReplay).toBe(false);

      // Replay with the same Idempotency-Key returns the exact same order (HTTP 200)
      const replayRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', idemKey)
        .send({
          productId: testProductId,
        });

      expect(replayRes.status).toBe(200);
      expect(replayRes.body.data.order.id).toBe(res.body.data.order.id);
      expect(replayRes.body.data.isReplay).toBe(true);

      // Replay with same key but different payload fails with 409 Conflict
      const conflictRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', idemKey)
        .send({
          productId: uuidv7(), // Different product
        });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error.message).toContain('Idempotency key has already been used');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. PAYMENT SIGNATURE VERIFICATION (BROWSER & WEBHOOK)
  // ---------------------------------------------------------------------------
  describe('Payment Signature Verification & Tampering Resistance', () => {
    let orderId: string;
    let rzpOrderId: string;
    const fakePayId = `pay_test_${Date.now()}`;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({
          productId: testProductId,
        });
      orderId = res.body.data.order.id;
      rzpOrderId = res.body.data.razorpayOrderId;

      fakeGateway.registerPayment({
        id: fakePayId,
        orderId: rzpOrderId,
        amountPaise: coursePricePaise,
        currency: 'INR',
        status: 'captured',
        method: 'upi',
      });
    });

    it('rejects browser verify with invalid or tampered signature with 400 Bad Request', async () => {
      const tamperedRes = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .send({
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: fakePayId,
          razorpaySignature: 'tampered_signature_1234567890abcdef1234567890abcdef',
        });

      expect(tamperedRes.status).toBe(400);
      expect(tamperedRes.body.error.message).toContain('Invalid payment signature');
    });

    it('rejects browser verify if gateway amount does not match order amount', async () => {
      const tamperedPayId = `pay_tampered_${Date.now()}`;
      fakeGateway.registerPayment({
        id: tamperedPayId,
        orderId: rzpOrderId,
        amountPaise: 10000, // Tampered down to ₹100 instead of ₹4,999
        currency: 'INR',
        status: 'captured',
      });

      const validSigForTampered = fakeGateway.signPayment(rzpOrderId, tamperedPayId);

      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .send({
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: tamperedPayId,
          razorpaySignature: validSigForTampered,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment amount mismatch');
    });

    it('accepts browser verify with valid signature, marks order PAID, and grants entitlement', async () => {
      const validSignature = fakeGateway.signPayment(rzpOrderId, fakePayId);

      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .send({
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: fakePayId,
          razorpaySignature: validSignature,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.status).toBe(OrderStatus.PAID);
      expect(res.body.data.entitlement.status).toBe(EntitlementStatus.ACTIVE);
      expect(res.body.data.invoice.invoiceNumber).toMatch(/^INV\/[0-9]{4}-[0-9]{4}\/[0-9]{5}$/);

      // Verify DB state
      const dbEntitlement = await prisma.entitlement.findFirst({
        where: { userId: verifiedStudentId, productId: testProductId },
      });
      expect(dbEntitlement?.status).toBe(EntitlementStatus.ACTIVE);
    });

    it('rejects webhook with missing or tampered signature with 401 Unauthorized', async () => {
      const payload = { event: 'payment.captured' };

      const resMissing = await request(app).post('/api/v1/webhooks/razorpay').send(payload);
      expect(resMissing.status).toBe(401);

      const resTampered = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('x-razorpay-signature', 'tampered_signature_hex')
        .send(payload);
      expect(resTampered.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. CONCURRENT VERIFY CALLS & IDEMPOTENT NO DOUBLE-GRANT PROOF
  // ---------------------------------------------------------------------------
  describe('Concurrent Calls & Webhook vs Verify Interleaving', () => {
    it('executes 5 concurrent verify calls for the same order without double-granting access or duplicate invoices', async () => {
      const concurrentProduct = await createTestProduct('Concurrent Hydraulic Systems');

      // Create new order
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({ productId: concurrentProduct.id });

      expect(orderRes.status).toBe(201);
      const ordId = orderRes.body.data.order.id;
      const rzpOrdId = orderRes.body.data.razorpayOrderId;
      const concurrentPayId = `pay_concurrent_${Date.now()}`;

      fakeGateway.registerPayment({
        id: concurrentPayId,
        orderId: rzpOrdId,
        amountPaise: coursePricePaise,
        currency: 'INR',
        status: 'captured',
      });

      const signature = fakeGateway.signPayment(rzpOrdId, concurrentPayId);

      // Launch 5 concurrent verify requests simultaneously
      const verifyPromises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/v1/payments/verify')
          .set('Authorization', `Bearer ${verifiedStudentToken}`)
          .send({
            razorpayOrderId: rzpOrdId,
            razorpayPaymentId: concurrentPayId,
            razorpaySignature: signature,
          }),
      );

      const results = await Promise.all(verifyPromises);

      // All 5 requests must return 200 OK
      for (const res of results) {
        expect(res.status).toBe(200);
      }

      // Prove in DB: Exactly ONE payment record, ONE invoice, and ONE entitlement exists for this order
      const paymentsCount = await prisma.payment.count({ where: { orderId: ordId } });
      const invoicesCount = await prisma.invoice.count({ where: { orderId: ordId } });
      const entitlementsCount = await prisma.entitlement.count({ where: { orderId: ordId } });

      expect(paymentsCount).toBe(1);
      expect(invoicesCount).toBe(1);
      expect(entitlementsCount).toBe(1);
    });

    it('handles webhook before verify, and verify before webhook idempotently', async () => {
      const interleavedProduct = await createTestProduct('Interleaved Systems A');

      // Order: Webhook arrives first, then user completes browser verify
      const orderARes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({ productId: interleavedProduct.id });

      expect(orderARes.status).toBe(201);
      const rzpOrdA = orderARes.body.data.razorpayOrderId;
      const payA = `pay_order_a_${Date.now()}`;

      const webhookPayloadA = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: payA,
              order_id: rzpOrdA,
              amount: coursePricePaise,
              currency: 'INR',
              status: 'captured',
              method: 'netbanking',
            },
          },
        },
      };

      const rawA = JSON.stringify(webhookPayloadA);
      const sigA = fakeGateway.signWebhook(rawA);

      // 1. Webhook delivers first
      const whResA = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', sigA)
        .send(webhookPayloadA);

      expect(whResA.status).toBe(200);

      // 2. Browser verify arrives after webhook
      fakeGateway.registerPayment({
        id: payA,
        orderId: rzpOrdA,
        amountPaise: coursePricePaise,
        currency: 'INR',
        status: 'captured',
      });
      const browserSigA = fakeGateway.signPayment(rzpOrdA, payA);

      const browserResA = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .send({
          razorpayOrderId: rzpOrdA,
          razorpayPaymentId: payA,
          razorpaySignature: browserSigA,
        });

      expect(browserResA.status).toBe(200);
      expect(browserResA.body.data.alreadyPaid).toBe(true);

      // 3. Duplicate webhook delivery
      const dupWhRes = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', sigA)
        .send(webhookPayloadA);

      expect(dupWhRes.status).toBe(200);
      expect(dupWhRes.body.message).toContain('already processed');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. COUPONS ENGINE & CONCURRENCY OVER-REDEMPTION RACE
  // ---------------------------------------------------------------------------
  describe('Coupons Engine & Concurrency Over-Redemption Race', () => {
    it('prevents coupon over-redemption under concurrent race conditions (maxRedemptions limit)', async () => {
      const raceProduct = await createTestProduct('Coupon Race Hydraulics');
      const couponCode = `RACE_${Date.now()}`;
      const createdCoupon = await prisma.coupon.create({
        data: {
          id: uuidv7(),
          code: couponCode,
          type: CouponType.PERCENT,
          value: 100, // 100% coupon redeems atomically at checkout
          maxRedemptions: 2, // Strictly 2 redemptions permitted
          perUserLimit: 1,
          isActive: true,
        },
      });
      createdCouponIds.push(createdCoupon.id);

      // Create 5 different verified students
      const students = await Promise.all(
        Array.from({ length: 5 }, (_, i) => createTestStudent(`coupon_race_${i}`)),
      );

      // Launch 5 concurrent order checkouts attempting to redeem this coupon
      const attempts = students.map((student) =>
        request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${student.token}`)
          .set('Idempotency-Key', uuidv7())
          .send({
            productId: raceProduct.id,
            couponCode,
          }),
      );

      const results = await Promise.all(attempts);

      const successCount = results.filter((r) => r.status === 201).length;
      const failCount = results.filter((r) => r.status === 400).length;

      // Exactly 2 redemptions must succeed, the remaining 3 must fail with max redemptions exceeded
      expect(successCount).toBe(2);
      expect(failCount).toBe(3);

      const dbRedemptions = await prisma.couponRedemption.count({
        where: { couponId: createdCoupon.id },
      });
      expect(dbRedemptions).toBe(2);
    });

    it('100% coupon skips gateway and grants instant access', async () => {
      const freeProduct = await createTestProduct('Free Scholarship Hydraulics');
      const freeCouponCode = `FREE100_${Date.now()}`;
      const createdCoupon = await prisma.coupon.create({
        data: {
          id: uuidv7(),
          code: freeCouponCode,
          type: CouponType.PERCENT,
          value: 100, // 100% discount
          maxRedemptions: 10,
          perUserLimit: 1,
          isActive: true,
        },
      });
      createdCouponIds.push(createdCoupon.id);

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({
          productId: freeProduct.id,
          couponCode: freeCouponCode,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.totalPaise).toBe(0);
      expect(res.body.data.order.status).toBe(OrderStatus.PAID);
      expect(res.body.data.razorpayOrderId).toBeNull(); // Skipped gateway
      expect(res.body.data.invoice.totalPaise).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. DOUBLE-PURCHASE PREVENTION & RENEWAL WINDOW
  // ---------------------------------------------------------------------------
  describe('Double-Purchase Prevention & Renewal Window Rules', () => {
    it('blocks purchase when user has active access with more than 30 days remaining', async () => {
      const renewalProduct = await createTestProduct('Renewal Testing Course', 365, true, 30);

      // Grant active entitlement with 100 days remaining
      const futureExpiry = new Date(Date.now() + 100 * 86400 * 1000);
      await prisma.entitlement.create({
        data: {
          id: uuidv7(),
          userId: verifiedStudentId,
          productId: renewalProduct.id,
          status: EntitlementStatus.ACTIVE,
          expiresAt: futureExpiry,
        },
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({ productId: renewalProduct.id });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Renewal is only permitted within the last 30 days');
    });

    it('allows renewal when user is in the last 30 days and extends from max(now, current expiry)', async () => {
      const renewalProduct = await createTestProduct('Renewal Allowed Course', 365, true, 30);

      // Set active entitlement with 10 days remaining
      const currentExpiry = new Date(Date.now() + 10 * 86400 * 1000);
      await prisma.entitlement.create({
        data: {
          id: uuidv7(),
          userId: verifiedStudentId,
          productId: renewalProduct.id,
          status: EntitlementStatus.ACTIVE,
          expiresAt: currentExpiry,
        },
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({ productId: renewalProduct.id });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const rzpOrderId = res.body.data.razorpayOrderId;
      const renewPayId = `pay_renew_${Date.now()}`;
      fakeGateway.registerPayment({
        id: renewPayId,
        orderId: rzpOrderId,
        amountPaise: coursePricePaise,
        currency: 'INR',
        status: 'captured',
      });

      const sig = fakeGateway.signPayment(rzpOrderId, renewPayId);
      const verifyRes = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .send({
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: renewPayId,
          razorpaySignature: sig,
        });

      expect(verifyRes.status).toBe(200);

      // Verify entitlement expiry was extended: currentExpiry (10 days) + 365 days = ~375 days from now
      const extendedEntitlement = await prisma.entitlement.findFirst({
        where: {
          userId: verifiedStudentId,
          productId: renewalProduct.id,
          status: EntitlementStatus.ACTIVE,
        },
        orderBy: { updatedAt: 'desc' },
      });

      const expectedMinExpiry = new Date(currentExpiry.getTime() + 360 * 86400 * 1000);
      expect(new Date(extendedEntitlement!.expiresAt!).getTime()).toBeGreaterThan(
        expectedMinExpiry.getTime(),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 6. REFUNDS & ENTITLEMENT REVOCATION
  // ---------------------------------------------------------------------------
  describe('Admin Refund Flows & Entitlement State Machine', () => {
    it('executes partial refund without revoking course access', async () => {
      const refundProduct = await createTestProduct('Refund Testing Hydraulics');

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({ productId: refundProduct.id });

      expect(orderRes.status).toBe(201);
      const rzpOrderId = orderRes.body.data.razorpayOrderId;
      const payId = `pay_refund_${Date.now()}`;

      fakeGateway.registerPayment({
        id: payId,
        orderId: rzpOrderId,
        amountPaise: coursePricePaise,
        currency: 'INR',
        status: 'captured',
      });

      const sig = fakeGateway.signPayment(rzpOrderId, payId);
      await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .send({
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: payId,
          razorpaySignature: sig,
        });

      const order = await prisma.order.findFirst({
        where: { id: orderRes.body.data.order.id },
        include: { payments: true },
      });

      const payment = order!.payments[0];

      const res = await request(app)
        .post(`/api/v1/admin/payments/${payment.id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amountPaise: 100000, // ₹1,000 partial refund
          reason: 'Goodwill discount applied post-purchase',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isFullRefund).toBe(false);

      const updatedOrder = await prisma.order.findUnique({ where: { id: order!.id } });
      expect(updatedOrder?.status).toBe(OrderStatus.PARTIALLY_REFUNDED);

      const entitlement = await prisma.entitlement.findFirst({
        where: { userId: verifiedStudentId, productId: refundProduct.id },
      });
      expect(entitlement?.status).toBe(EntitlementStatus.ACTIVE); // Still active!
    });

    it('executes full refund and revokes entitlement access', async () => {
      const order = await prisma.order.findFirst({
        where: { userId: verifiedStudentId, status: OrderStatus.PARTIALLY_REFUNDED },
        include: { payments: { include: { refunds: true } } },
      });

      const payment = order!.payments[0];
      const remainingAmount = payment.amountPaise - 100000;

      const res = await request(app)
        .post(`/api/v1/admin/payments/${payment.id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amountPaise: remainingAmount,
          reason: 'Full refund requested',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isFullRefund).toBe(true);

      const updatedOrder = await prisma.order.findUnique({ where: { id: order!.id } });
      expect(updatedOrder?.status).toBe(OrderStatus.REFUNDED);

      const entitlement = await prisma.entitlement.findFirst({
        where: { userId: verifiedStudentId, productId: order!.productId },
      });
      expect(entitlement?.status).toBe(EntitlementStatus.REVOKED); // Access revoked!
    });
  });

  // ---------------------------------------------------------------------------
  // 7. STUCK ORDER RECONCILIATION
  // ---------------------------------------------------------------------------
  describe('Stuck Order Reconciliation', () => {
    it('reconciles stuck order with captured payment on gateway', async () => {
      const stuckRzpId = `order_stuck_${Date.now()}`;
      const stuckOrderId = uuidv7();

      // Create stuck order in CREATED status older than 15 minutes
      await prisma.order.create({
        data: {
          id: stuckOrderId,
          userId: verifiedStudentId,
          productId: testProductId,
          idempotencyKey: uuidv7(),
          status: OrderStatus.CREATED,
          subtotalPaise: coursePricePaise,
          totalPaise: coursePricePaise,
          razorpayOrderId: stuckRzpId,
          createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago
        },
      });

      // Register payment on gateway as captured (simulating user closed browser after payment)
      const stuckPayId = `pay_stuck_${Date.now()}`;
      fakeGateway.registerPayment({
        id: stuckPayId,
        orderId: stuckRzpId,
        amountPaise: coursePricePaise,
        currency: 'INR',
        status: 'captured',
      });

      const reconcileResult = await orderService.reconcileStuckOrders();
      expect(reconcileResult.reconciled).toBeGreaterThanOrEqual(1);

      const fixedOrder = await prisma.order.findUnique({ where: { id: stuckOrderId } });
      expect(fixedOrder?.status).toBe(OrderStatus.PAID);
      expect(fixedOrder?.paidAt).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 8. INVOICE NUMBERING UNDER CONCURRENCY & PDF DOWNLOAD
  // ---------------------------------------------------------------------------
  describe('Sequential Invoice Numbering Under Concurrency & PDF Download', () => {
    it('generates strictly sequential invoice numbers without gaps under concurrent execution', async () => {
      const generatedInvoices = await Promise.all(
        Array.from({ length: 5 }, () =>
          prisma.$transaction((tx) =>
            invoiceService.generateInvoiceNumberUnderLock(tx, new Date()),
          ),
        ),
      );

      const sequences = generatedInvoices.map((i) => i.sequenceNumber);
      const invoiceNumbers = generatedInvoices.map((i) => i.invoiceNumber);

      // Verify all sequence numbers are unique and ascending
      const uniqueSeq = new Set(sequences);
      expect(uniqueSeq.size).toBe(5);

      const uniqueNumbers = new Set(invoiceNumbers);
      expect(uniqueNumbers.size).toBe(5);
    });

    it('allows student to download invoice PDF', async () => {
      const studentInvoice = await prisma.invoice.findFirst({
        where: { order: { userId: verifiedStudentId } },
      });

      expect(studentInvoice).toBeDefined();

      const res = await request(app)
        .get(`/api/v1/invoices/${studentInvoice!.id}/download`)
        .set('Authorization', `Bearer ${verifiedStudentToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
    });
  });
});
