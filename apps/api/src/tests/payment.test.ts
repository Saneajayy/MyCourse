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
  RefundStatus,
  EntitlementStatus,
  CouponType,
} from '@course/shared';
import { setPaymentGateway } from '../modules/payments/payment.service.js';
import { FakePaymentGateway } from '../modules/payments/fake-payment.gateway.js';
import { orderService } from '../modules/orders/order.service.js';
import { invoiceService, getFinancialYear } from '../modules/invoices/invoice.service.js';
import { env, validateProductionSafety } from '../config/env.js';

describe('Phase 4 Orders, Payments, Invoicing, and Entitlements Suite', () => {
  const app = createApp();
  const fakeGateway = new FakePaymentGateway();

  // Test users
  let verifiedStudentId: string;
  let verifiedStudentToken: string;

  let otherStudentId: string;
  let otherStudentToken: string;

  let unverifiedStudentId: string;
  let unverifiedStudentToken: string;

  let adminId: string;
  let adminToken: string;

  // Base test product
  let testProductId: string;
  const coursePricePaise = 499900; // ₹4,999.00

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
    setPaymentGateway(fakeGateway);

    const passwordHash = await hashPassword('SecurePassword#2026!');

    // 1. Primary Verified Student (Owner)
    verifiedStudentId = uuidv7();
    const studentEmail = `verified_${Date.now()}@coursetest.com`;
    await prisma.user.create({
      data: {
        id: verifiedStudentId,
        email: studentEmail,
        name: 'Verified Student Owner',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
      },
    });
    verifiedStudentToken = signAccessToken({
      sub: verifiedStudentId,
      email: studentEmail,
      role: UserRole.STUDENT,
      tokenVersion: 0,
    });

    // 2. Secondary Student (for R6 IDOR testing)
    otherStudentId = uuidv7();
    const otherEmail = `other_${Date.now()}@coursetest.com`;
    await prisma.user.create({
      data: {
        id: otherStudentId,
        email: otherEmail,
        name: 'Other Student Attacker',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
      },
    });
    otherStudentToken = signAccessToken({
      sub: otherStudentId,
      email: otherEmail,
      role: UserRole.STUDENT,
      tokenVersion: 0,
    });

    // 3. Unverified Student
    unverifiedStudentId = uuidv7();
    const unverifiedEmail = `unverified_${Date.now()}@coursetest.com`;
    await prisma.user.create({
      data: {
        id: unverifiedStudentId,
        email: unverifiedEmail,
        name: 'Unverified Student',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: null,
        twoFactorEnabled: false,
      },
    });
    unverifiedStudentToken = signAccessToken({
      sub: unverifiedStudentId,
      email: unverifiedEmail,
      role: UserRole.STUDENT,
      tokenVersion: 0,
    });

    // 4. Admin with 2FA enabled
    adminId = uuidv7();
    const adminEmail = `admin_${Date.now()}@coursetest.com`;
    await prisma.user.create({
      data: {
        id: adminId,
        email: adminEmail,
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
      email: adminEmail,
      role: UserRole.ADMIN,
      tokenVersion: 0,
    });

    // 5. Base Published Test Product
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

    // Seed app settings
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
          yearFormat: 'short',
          sequencePadding: 5,
          currentSequence: 0,
          financialYear: getFinancialYear(new Date(), 'short'),
          includeZeroValueInvoices: true,
        },
      },
      update: {},
    });
  });

  afterAll(async () => {
    const allUserIds = [
      verifiedStudentId,
      otherStudentId,
      unverifiedStudentId,
      adminId,
      ...createdUserIds,
    ];
    const allProductIds = [testProductId, ...createdProductIds];

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
  // BASELINE PHASE 4 REQUIREMENTS: ORDERS, SIGNATURES & REPLAYS
  // ---------------------------------------------------------------------------
  describe('Email Verification & Idempotency-Key Enforcement', () => {
    it('blocks unverified email students from creating orders with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${unverifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({ productId: testProductId });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Email must be verified before purchasing courses');
    });

    it('rejects order creation without Idempotency-Key header with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .send({ productId: testProductId });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Idempotency-Key header is required');
    });

    it('creates an order successfully with verified email and returns gateway order details with replay check', async () => {
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
        .send({ productId: testProductId });

      expect(replayRes.status).toBe(200);
      expect(replayRes.body.data.order.id).toBe(res.body.data.order.id);
      expect(replayRes.body.data.isReplay).toBe(true);

      // Replay with same key but different payload fails with 409 Conflict
      const conflictRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', idemKey)
        .send({ productId: uuidv7() });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error.message).toContain('Idempotency key has already been used');
    });
  });

  describe('Payment Signature Verification & Tampering Resistance', () => {
    let rzpOrderId: string;
    const fakePayId = `pay_tamper_${Date.now()}`;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({ productId: testProductId });

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
      const tamperedPayId = `pay_tampered_amt_${Date.now()}`;
      fakeGateway.registerPayment({
        id: tamperedPayId,
        orderId: rzpOrderId,
        amountPaise: 10000, // ₹100 instead of ₹4,999
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

  describe('Concurrent Calls & Webhook vs Verify Interleaving', () => {
    it('executes 5 concurrent verify calls for the same order without double-granting access or duplicate invoices', async () => {
      const concurrentProduct = await createTestProduct('Concurrent Hydraulic Systems');

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

      for (const res of results) {
        expect(res.status).toBe(200);
      }

      const paymentsCount = await prisma.payment.count({ where: { orderId: ordId } });
      const invoicesCount = await prisma.invoice.count({ where: { orderId: ordId } });
      const entitlementsCount = await prisma.entitlement.count({ where: { orderId: ordId } });

      expect(paymentsCount).toBe(1);
      expect(invoicesCount).toBe(1);
      expect(entitlementsCount).toBe(1);
    });
  });

  describe('Double-Purchase Prevention & Renewal Window Rules', () => {
    it('blocks purchase when user has active access with more than 30 days remaining', async () => {
      const renewalProduct = await createTestProduct('Renewal Testing Course', 365, true, 30);

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
  // R1: ACCESS GRANTED ONLY ON CAPTURED; AUTHORIZED KEEPS ORDER PENDING
  // ---------------------------------------------------------------------------
  describe('R1: Payment Capture Enforcement & Authorized Status Deferral', () => {
    it('keeps order PENDING and does not grant entitlement or invoice when gateway status is authorized', async () => {
      const authProduct = await createTestProduct('Authorized Payment Hydraulics');

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({ productId: authProduct.id });

      expect(orderRes.status).toBe(201);
      const rzpOrderId = orderRes.body.data.razorpayOrderId;
      const payId = `pay_auth_${Date.now()}`;

      fakeGateway.registerPayment({
        id: payId,
        orderId: rzpOrderId,
        amountPaise: coursePricePaise,
        currency: 'INR',
        status: 'authorized',
      });

      const signature = fakeGateway.signPayment(rzpOrderId, payId);

      const verifyRes = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .send({
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: payId,
          razorpaySignature: signature,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.status).toBe('authorized');
      expect(verifyRes.body.data.order.status).toBe(OrderStatus.PENDING);
      expect(verifyRes.body.data.entitlement).toBeNull();
      expect(verifyRes.body.data.invoice).toBeNull();

      // Verify DB: No active entitlement and no invoice issued
      const dbEntitlement = await prisma.entitlement.findFirst({
        where: { userId: verifiedStudentId, productId: authProduct.id },
      });
      expect(dbEntitlement).toBeNull();

      const dbInvoice = await prisma.invoice.findFirst({
        where: { orderId: orderRes.body.data.order.id },
      });
      expect(dbInvoice).toBeNull();

      // Subsequent payment.captured webhook finishes the order
      fakeGateway.registerPayment({
        id: payId,
        orderId: rzpOrderId,
        amountPaise: coursePricePaise,
        currency: 'INR',
        status: 'captured',
      });

      const captureWebhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: payId,
              order_id: rzpOrderId,
              amount: coursePricePaise,
              currency: 'INR',
              status: 'captured',
              method: 'card',
            },
          },
        },
      };

      const captureSig = fakeGateway.signWebhook(JSON.stringify(captureWebhookPayload));
      const whRes = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', captureSig)
        .set('x-razorpay-event-id', `evt_capture_${Date.now()}`)
        .send(captureWebhookPayload);

      expect(whRes.status).toBe(200);

      const paidOrder = await prisma.order.findUnique({
        where: { id: orderRes.body.data.order.id },
      });
      expect(paidOrder?.status).toBe(OrderStatus.PAID);

      const grantedEntitlement = await prisma.entitlement.findFirst({
        where: { userId: verifiedStudentId, productId: authProduct.id },
      });
      expect(grantedEntitlement?.status).toBe(EntitlementStatus.ACTIVE);

      const generatedInvoice = await prisma.invoice.findFirst({
        where: { orderId: orderRes.body.data.order.id },
      });
      expect(generatedInvoice).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // R2: RETRIES ON PAYMENT.FAILED AND LATE PAYMENTS ON CANCELLED ORDERS
  // ---------------------------------------------------------------------------
  describe('R2: Payment Failure Retries & Late Payments on Cancelled Orders', () => {
    it('payment.failed does not cancel order and allows subsequent successful checkout retry', async () => {
      const retryProduct = await createTestProduct('Retry Hydraulics');

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({ productId: retryProduct.id });

      expect(orderRes.status).toBe(201);
      const rzpOrderId = orderRes.body.data.razorpayOrderId;
      const failedPayId = `pay_fail_${Date.now()}`;

      const failedWebhook = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: failedPayId,
              order_id: rzpOrderId,
              amount: coursePricePaise,
              currency: 'INR',
              status: 'failed',
              error_description: 'Card declined by issuing bank',
            },
          },
        },
      };

      const failSig = fakeGateway.signWebhook(JSON.stringify(failedWebhook));
      const whRes = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', failSig)
        .set('x-razorpay-event-id', `evt_fail_${Date.now()}`)
        .send(failedWebhook);

      expect(whRes.status).toBe(200);

      const openOrder = await prisma.order.findUnique({
        where: { id: orderRes.body.data.order.id },
      });
      expect(openOrder?.status).toBe(OrderStatus.CREATED);

      const failedPayment = await prisma.payment.findUnique({
        where: { razorpayPaymentId: failedPayId },
      });
      expect(failedPayment?.status).toBe(PaymentStatus.FAILED);

      const successPayId = `pay_retry_success_${Date.now()}`;
      fakeGateway.registerPayment({
        id: successPayId,
        orderId: rzpOrderId,
        amountPaise: coursePricePaise,
        currency: 'INR',
        status: 'captured',
        method: 'upi',
      });

      const validSig = fakeGateway.signPayment(rzpOrderId, successPayId);
      const verifyRes = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .send({
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: successPayId,
          razorpaySignature: validSig,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.order.status).toBe(OrderStatus.PAID);
      expect(verifyRes.body.data.entitlement.status).toBe(EntitlementStatus.ACTIVE);
    });

    it('late payment captures on an expired/cancelled order: records payment and grants course access', async () => {
      const lateProduct = await createTestProduct('Late Payment Course');
      const lateOrderId = uuidv7();
      const lateRzpOrderId = `order_late_${Date.now()}`;

      await prisma.order.create({
        data: {
          id: lateOrderId,
          userId: verifiedStudentId,
          productId: lateProduct.id,
          idempotencyKey: uuidv7(),
          status: OrderStatus.CANCELLED,
          subtotalPaise: coursePricePaise,
          totalPaise: coursePricePaise,
          razorpayOrderId: lateRzpOrderId,
        },
      });

      const latePayId = `pay_late_${Date.now()}`;
      fakeGateway.registerPayment({
        id: latePayId,
        orderId: lateRzpOrderId,
        amountPaise: coursePricePaise,
        currency: 'INR',
        status: 'captured',
      });

      const lateWhPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: latePayId,
              order_id: lateRzpOrderId,
              amount: coursePricePaise,
              currency: 'INR',
              status: 'captured',
              method: 'upi',
            },
          },
        },
      };

      const sig = fakeGateway.signWebhook(JSON.stringify(lateWhPayload));
      const whRes = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', sig)
        .set('x-razorpay-event-id', `evt_late_${Date.now()}`)
        .send(lateWhPayload);

      expect(whRes.status).toBe(200);

      const fulfilledOrder = await prisma.order.findUnique({
        where: { id: lateOrderId },
        include: { payments: true, entitlements: true, invoice: true },
      });

      expect(fulfilledOrder?.status).toBe(OrderStatus.PAID);
      expect(fulfilledOrder?.payments[0]?.status).toBe(PaymentStatus.CAPTURED);
      expect(fulfilledOrder?.entitlements[0]?.status).toBe(EntitlementStatus.ACTIVE);
      expect(fulfilledOrder?.invoice).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // R3: PRODUCTION SAFETY - PAYMENT_PROVIDER=fake REFUSES TO BOOT
  // ---------------------------------------------------------------------------
  describe('R3: Production Safety - Rejection of Fake Payment Provider in Production', () => {
    it('refuses to boot in production if PAYMENT_PROVIDER=fake', () => {
      expect(() => {
        validateProductionSafety({
          nodeEnv: 'production',
          paymentProvider: 'fake',
          razorpayKeyId: 'rzp_live_real_key_12345',
        });
      }).toThrow(/PAYMENT_PROVIDER cannot be "fake" in production mode/);
    });

    it('refuses to boot in production with test keys (rzp_test_*)', () => {
      expect(() => {
        validateProductionSafety({
          nodeEnv: 'production',
          paymentProvider: 'razorpay',
          razorpayKeyId: 'rzp_test_mock_key_12345',
        });
      }).toThrow(/Cannot boot in production mode with Razorpay test keys/);
    });

    it('refuses to set FakePaymentGateway in production environment', () => {
      const originalEnv = env.NODE_ENV;
      try {
        (env as any).NODE_ENV = 'production';
        expect(() => {
          setPaymentGateway(new FakePaymentGateway());
        }).toThrow(/Cannot set FakePaymentGateway in production mode/);
      } finally {
        (env as any).NODE_ENV = originalEnv;
        setPaymentGateway(fakeGateway);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // R4: TWO-PHASE REFUNDS & CONCURRENCY OVER-REFUND REJECTION
  // ---------------------------------------------------------------------------
  describe('R4: Two-Phase Refunds, Concurrency Protection, and Failed Refunds', () => {
    let refundPaymentId: string;
    let refundOrderId: string;
    let refundProductId: string;
    let rzpPayId: string;

    beforeAll(async () => {
      const prod = await createTestProduct('Two-Phase Refund Hydraulics');
      refundProductId = prod.id;

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({ productId: refundProductId });

      refundOrderId = orderRes.body.data.order.id;
      const rzpOrdId = orderRes.body.data.razorpayOrderId;
      rzpPayId = `pay_rfnd_flow_${Date.now()}`;

      fakeGateway.registerPayment({
        id: rzpPayId,
        orderId: rzpOrdId,
        amountPaise: coursePricePaise,
        currency: 'INR',
        status: 'captured',
      });

      const sig = fakeGateway.signPayment(rzpOrdId, rzpPayId);
      await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .send({
          razorpayOrderId: rzpOrdId,
          razorpayPaymentId: rzpPayId,
          razorpaySignature: sig,
        });

      const order = await prisma.order.findUnique({
        where: { id: refundOrderId },
        include: { payments: true },
      });
      refundPaymentId = order!.payments[0].id;
    });

    it('initiating refund creates Refund in PENDING status without prematurely modifying order or entitlement', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/payments/${refundPaymentId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amountPaise: 100000,
          reason: 'Customer request',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(RefundStatus.PENDING);

      const order = await prisma.order.findUnique({ where: { id: refundOrderId } });
      expect(order?.status).toBe(OrderStatus.PAID);

      const entitlement = await prisma.entitlement.findFirst({
        where: { userId: verifiedStudentId, productId: refundProductId },
      });
      expect(entitlement?.status).toBe(EntitlementStatus.ACTIVE);
    });

    it('refund.processed webhook updates order to PARTIALLY_REFUNDED while keeping entitlement active', async () => {
      const pendingRefund = await prisma.refund.findFirst({
        where: { paymentId: refundPaymentId, status: RefundStatus.PENDING },
      });

      const refundWebhook = {
        event: 'refund.processed',
        payload: {
          refund: {
            entity: {
              id: pendingRefund!.razorpayRefundId,
              payment_id: rzpPayId,
              amount: 100000,
              status: 'processed',
            },
          },
        },
      };

      const sig = fakeGateway.signWebhook(JSON.stringify(refundWebhook));
      const whRes = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', sig)
        .set('x-razorpay-event-id', `evt_rfnd_proc_${Date.now()}`)
        .send(refundWebhook);

      expect(whRes.status).toBe(200);

      const updatedOrder = await prisma.order.findUnique({ where: { id: refundOrderId } });
      expect(updatedOrder?.status).toBe(OrderStatus.PARTIALLY_REFUNDED);

      const entitlement = await prisma.entitlement.findFirst({
        where: { userId: verifiedStudentId, productId: refundProductId },
      });
      expect(entitlement?.status).toBe(EntitlementStatus.ACTIVE);
    });

    it('rejects refund request exceeding available balance (captured - already refunded)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/payments/${refundPaymentId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amountPaise: 400000,
          reason: 'Excessive refund attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid refund amount');
    });

    it('prevents over-refund under concurrent refund requests (FOR UPDATE lock)', async () => {
      const attempts = Array.from({ length: 2 }, () =>
        request(app)
          .post(`/api/v1/admin/payments/${refundPaymentId}/refund`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            amountPaise: 250000,
            reason: 'Concurrent race refund',
          }),
      );

      const results = await Promise.all(attempts);
      const successes = results.filter((r) => r.status === 200);
      const failures = results.filter((r) => r.status === 400);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].body.error.message).toContain('Invalid refund amount');
    });

    it('refund.failed webhook updates refund status to FAILED without altering order or entitlement', async () => {
      const initRes = await request(app)
        .post(`/api/v1/admin/payments/${refundPaymentId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amountPaise: 5000,
          reason: 'Will fail at gateway',
        });

      expect(initRes.status).toBe(200);
      const failedRefundId = initRes.body.data.refund.razorpayRefundId;

      const failWebhook = {
        event: 'refund.failed',
        payload: {
          refund: {
            entity: {
              id: failedRefundId,
              payment_id: rzpPayId,
              amount: 5000,
              status: 'failed',
              error_description: 'Beneficiary account frozen',
            },
          },
        },
      };

      const sig = fakeGateway.signWebhook(JSON.stringify(failWebhook));
      const whRes = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', sig)
        .set('x-razorpay-event-id', `evt_rfnd_fail_${Date.now()}`)
        .send(failWebhook);

      expect(whRes.status).toBe(200);

      const failedRefund = await prisma.refund.findUnique({
        where: { razorpayRefundId: failedRefundId },
      });
      expect(failedRefund?.status).toBe(RefundStatus.FAILED);
    });

    it('full refund webhook marks order REFUNDED and revokes course entitlement', async () => {
      const payment = await prisma.payment.findUnique({
        where: { id: refundPaymentId },
        include: { refunds: true },
      });

      const alreadyRefunded = payment!.refunds
        .filter((r) => r.status === RefundStatus.PROCESSED || r.status === RefundStatus.PENDING)
        .reduce((sum, r) => sum + r.amountPaise, 0);

      const remaining = payment!.amountPaise - alreadyRefunded;

      const finalRes = await request(app)
        .post(`/api/v1/admin/payments/${refundPaymentId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amountPaise: remaining,
          reason: 'Finalizing full refund',
        });

      expect(finalRes.status).toBe(200);

      const pendingRefunds = await prisma.refund.findMany({
        where: { paymentId: refundPaymentId, status: RefundStatus.PENDING },
      });

      for (const r of pendingRefunds) {
        const whPayload = {
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                id: r.razorpayRefundId,
                payment_id: rzpPayId,
                amount: r.amountPaise,
                status: 'processed',
              },
            },
          },
        };
        const sig = fakeGateway.signWebhook(JSON.stringify(whPayload));
        await request(app)
          .post('/api/v1/webhooks/razorpay')
          .set('Content-Type', 'application/json')
          .set('x-razorpay-signature', sig)
          .set('x-razorpay-event-id', `evt_rfnd_full_${r.id}`)
          .send(whPayload);
      }

      const fullyRefundedOrder = await prisma.order.findUnique({
        where: { id: refundOrderId },
      });
      expect(fullyRefundedOrder?.status).toBe(OrderStatus.REFUNDED);

      const revokedEntitlement = await prisma.entitlement.findFirst({
        where: { userId: verifiedStudentId, productId: refundProductId },
      });
      expect(revokedEntitlement?.status).toBe(EntitlementStatus.REVOKED);
    });
  });

  // ---------------------------------------------------------------------------
  // R5: COUPONS - RESERVATION AT CREATION & RELEASE UPON ORDER EXPIRY
  // ---------------------------------------------------------------------------
  describe('R5: Coupons Atomic Reservation & Release Upon Expiry', () => {
    it('prevents coupon over-redemption under concurrent race conditions (maxRedemptions limit)', async () => {
      const raceProduct = await createTestProduct('Coupon Race Hydraulics');
      const couponCode = `RACE_${Date.now()}`;
      const createdCoupon = await prisma.coupon.create({
        data: {
          id: uuidv7(),
          code: couponCode,
          type: CouponType.PERCENT,
          value: 100,
          maxRedemptions: 2,
          perUserLimit: 1,
          isActive: true,
        },
      });
      createdCouponIds.push(createdCoupon.id);

      const students = await Promise.all(
        Array.from({ length: 5 }, (_, i) => createTestStudent(`coupon_race_${i}`)),
      );

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

      expect(successCount).toBe(2);
      expect(failCount).toBe(3);

      const dbRedemptions = await prisma.couponRedemption.count({
        where: { couponId: createdCoupon.id },
      });
      expect(dbRedemptions).toBe(2);
    });

    it('reserves coupon redemption at order creation and releases it when order expires', async () => {
      const couponProduct = await createTestProduct('Coupon Expiry Hydraulics');
      const singleUseCode = `SINGLE_${Date.now()}`;

      const coupon = await prisma.coupon.create({
        data: {
          id: uuidv7(),
          code: singleUseCode,
          type: CouponType.FLAT,
          value: 100000,
          maxRedemptions: 1,
          perUserLimit: 1,
          isActive: true,
        },
      });
      createdCouponIds.push(coupon.id);

      const orderA = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({
          productId: couponProduct.id,
          couponCode: singleUseCode,
        });

      expect(orderA.status).toBe(201);
      expect(orderA.body.data.order.discountPaise).toBe(100000);

      const orderB = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({
          productId: couponProduct.id,
          couponCode: singleUseCode,
        });

      expect(orderB.status).toBe(400);
      expect(orderB.body.error.message).toContain('maximum redemptions limit');

      await prisma.order.update({
        where: { id: orderA.body.data.order.id },
        data: { createdAt: new Date(Date.now() - 40 * 60 * 1000) },
      });

      const reconcileRes = await orderService.reconcileStuckOrders();
      expect(reconcileRes.expired).toBeGreaterThanOrEqual(1);

      const activeRedemptions = await prisma.couponRedemption.count({
        where: { couponId: coupon.id },
      });
      expect(activeRedemptions).toBe(0);

      const orderBRetry = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({
          productId: couponProduct.id,
          couponCode: singleUseCode,
        });

      expect(orderBRetry.status).toBe(201);
      expect(orderBRetry.body.data.order.discountPaise).toBe(100000);
    });
  });

  // ---------------------------------------------------------------------------
  // R6: OWNERSHIP & IDOR TESTS
  // ---------------------------------------------------------------------------
  describe('R6: Ownership Enforcement & IDOR Protection', () => {
    let studentAOrderId: string;
    let studentARzpOrderId: string;
    let studentAInvoiceId: string;
    let studentAPayId: string;

    beforeAll(async () => {
      const idorProduct = await createTestProduct('IDOR Test Course');

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({ productId: idorProduct.id });

      studentAOrderId = orderRes.body.data.order.id;
      studentARzpOrderId = orderRes.body.data.razorpayOrderId;
      studentAPayId = `pay_idor_${Date.now()}`;

      fakeGateway.registerPayment({
        id: studentAPayId,
        orderId: studentARzpOrderId,
        amountPaise: coursePricePaise,
        currency: 'INR',
        status: 'captured',
      });

      const sig = fakeGateway.signPayment(studentARzpOrderId, studentAPayId);
      const verifyRes = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .send({
          razorpayOrderId: studentARzpOrderId,
          razorpayPaymentId: studentAPayId,
          razorpaySignature: sig,
        });

      studentAInvoiceId = verifyRes.body.data.invoice.id;
    });

    it('rejects verify payment attempt if caller is not the order owner (403 Forbidden)', async () => {
      const newPayId = `pay_idor_hijack_${Date.now()}`;
      fakeGateway.registerPayment({
        id: newPayId,
        orderId: studentARzpOrderId,
        amountPaise: coursePricePaise,
        currency: 'INR',
        status: 'captured',
      });
      const sig = fakeGateway.signPayment(studentARzpOrderId, newPayId);

      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send({
          razorpayOrderId: studentARzpOrderId,
          razorpayPaymentId: newPayId,
          razorpaySignature: sig,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('You do not have permission');
    });

    it('rejects order lookup if caller is not the owner (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${studentAOrderId}`)
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('permission to view this order');
    });

    it('rejects invoice download if caller is not the owner (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${studentAInvoiceId}/download`)
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('permission to download this invoice');
    });

    it('allows admin to lookup order and download invoice for any student', async () => {
      const orderLookup = await request(app)
        .get(`/api/v1/orders/${studentAOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(orderLookup.status).toBe(200);
      expect(orderLookup.body.data.id).toBe(studentAOrderId);

      const invoiceDownload = await request(app)
        .get(`/api/v1/invoices/${studentAInvoiceId}/download`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(invoiceDownload.status).toBe(200);
      expect(invoiceDownload.headers['content-type']).toBe('application/pdf');
    });
  });

  // ---------------------------------------------------------------------------
  // R7: WEBHOOK DEDUPLICATION & MULTI-EVENT HANDLING
  // ---------------------------------------------------------------------------
  describe('R7: Webhook Deduplication (x-razorpay-event-id) & Resilient Handling', () => {
    it('deduplicates deliveries using x-razorpay-event-id header and returns 200 immediately', async () => {
      const eventId = `evt_dedupe_${Date.now()}`;
      const payload = {
        event: 'order.paid',
        payload: {
          order: {
            entity: {
              id: `order_fake_${Date.now()}`,
              amount: coursePricePaise,
              status: 'paid',
            },
          },
        },
      };

      const raw = JSON.stringify(payload);
      const sig = fakeGateway.signWebhook(raw);

      const firstRes = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', sig)
        .set('x-razorpay-event-id', eventId)
        .send(payload);

      expect(firstRes.status).toBe(200);

      const dupRes = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', sig)
        .set('x-razorpay-event-id', eventId)
        .send(payload);

      expect(dupRes.status).toBe(200);
      expect(dupRes.body.message).toContain('already processed');
    });

    it('webhook for unknown order does not return 500 error preventing Razorpay infinite retries', async () => {
      const unknownPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_unknown_${Date.now()}`,
              order_id: 'order_non_existent_999999',
              amount: coursePricePaise,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      };

      const sig = fakeGateway.signWebhook(JSON.stringify(unknownPayload));
      const res = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', sig)
        .set('x-razorpay-event-id', `evt_unknown_${Date.now()}`)
        .send(unknownPayload);

      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // R9: INVOICE NUMBER FORMAT (<= 16 CHARACTERS) & ZERO-VALUE SETTING
  // ---------------------------------------------------------------------------
  describe('R9: Invoice Number Format Constraints & Zero-Value Invoice Setting', () => {
    it('generates invoice numbers strictly <= 16 characters matching letters, digits, hyphen, slash', async () => {
      const invMeta = await prisma.$transaction((tx) =>
        invoiceService.generateInvoiceNumberUnderLock(tx, new Date()),
      );

      expect(invMeta.invoiceNumber.length).toBeLessThanOrEqual(16);
      expect(invMeta.invoiceNumber).toMatch(/^[A-Za-z0-9\-\/]{1,16}$/);
      expect(invMeta.invoiceNumber).toMatch(/^INV\/[0-9]{2}-[0-9]{2}\/[0-9]{5}$/);
    });

    it('respects includeZeroValueInvoices setting for 100% discount orders', async () => {
      const setting = await prisma.appSetting.findUnique({ where: { key: 'invoice_config' } });
      const currentConfig = (setting?.value as any) || {};

      await prisma.appSetting.update({
        where: { key: 'invoice_config' },
        data: {
          value: { ...currentConfig, includeZeroValueInvoices: false },
        },
      });

      const freeProd = await createTestProduct('Zero Value Toggle Test');
      const couponCode = `ZERO_OFF_${Date.now()}`;
      await prisma.coupon.create({
        data: {
          id: uuidv7(),
          code: couponCode,
          type: CouponType.PERCENT,
          value: 100,
          isActive: true,
        },
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${verifiedStudentToken}`)
        .set('Idempotency-Key', uuidv7())
        .send({
          productId: freeProd.id,
          couponCode,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order.totalPaise).toBe(0);
      expect(res.body.data.order.status).toBe(OrderStatus.PAID);
      expect(res.body.data.invoice).toBeNull();

      // Reset setting
      await prisma.appSetting.update({
        where: { key: 'invoice_config' },
        data: {
          value: { ...currentConfig, includeZeroValueInvoices: true },
        },
      });
    });
  });
});
