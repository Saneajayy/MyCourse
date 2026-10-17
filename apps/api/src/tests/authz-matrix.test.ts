import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { uuidv7 } from 'uuidv7';
import { createApp } from '../app.js';
import { prisma } from '../common/db/prisma.js';
import { signAccessToken } from '../common/crypto/jwt.js';
import { invoiceService } from '../modules/invoices/invoice.service.js';
import { UserRole, UserStatus, OrderStatus } from '@course/shared';

describe('B1. Complete Route Inventory & Authorization Matrix Test Suite', () => {
  const app = createApp();

  let studentA: { id: string; email: string; token: string };
  let studentB: { id: string; email: string; token: string };
  let adminNo2FA: { id: string; email: string; token: string };
  let adminWith2FA: { id: string; email: string; token: string };

  let productA: { id: string; slug: string };
  let orderStudentB: { id: string };
  let invoiceStudentB: { id: string };

  beforeAll(async () => {
    // 1. Seed Student A (Normal student)
    const idA = uuidv7();
    const emailA = `student-a-${Date.now()}@example.com`;
    await prisma.user.create({
      data: {
        id: idA,
        email: emailA,
        passwordHash: 'dummy_hash',
        name: 'Student A',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        twoFactorEnabled: false,
        emailVerifiedAt: new Date(),
      },
    });
    studentA = {
      id: idA,
      email: emailA,
      token: signAccessToken({ sub: idA, email: emailA, role: UserRole.STUDENT, tokenVersion: 0 }),
    };

    // 2. Seed Student B (Target of IDOR tests)
    const idB = uuidv7();
    const emailB = `student-b-${Date.now()}@example.com`;
    await prisma.user.create({
      data: {
        id: idB,
        email: emailB,
        passwordHash: 'dummy_hash',
        name: 'Student B',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        twoFactorEnabled: false,
        emailVerifiedAt: new Date(),
      },
    });
    studentB = {
      id: idB,
      email: emailB,
      token: signAccessToken({ sub: idB, email: emailB, role: UserRole.STUDENT, tokenVersion: 0 }),
    };

    // 3. Seed Admin without 2FA
    const idAdminNo2FA = uuidv7();
    const emailAdminNo2FA = `admin-no2fa-${Date.now()}@example.com`;
    await prisma.user.create({
      data: {
        id: idAdminNo2FA,
        email: emailAdminNo2FA,
        passwordHash: 'dummy_hash',
        name: 'Admin Without 2FA',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        twoFactorEnabled: false,
        emailVerifiedAt: new Date(),
      },
    });
    adminNo2FA = {
      id: idAdminNo2FA,
      email: emailAdminNo2FA,
      token: signAccessToken({
        sub: idAdminNo2FA,
        email: emailAdminNo2FA,
        role: UserRole.ADMIN,
        tokenVersion: 0,
      }),
    };

    // 4. Seed Admin with 2FA
    const idAdminWith2FA = uuidv7();
    const emailAdminWith2FA = `admin-with2fa-${Date.now()}@example.com`;
    await prisma.user.create({
      data: {
        id: idAdminWith2FA,
        email: emailAdminWith2FA,
        passwordHash: 'dummy_hash',
        name: 'Admin With 2FA',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        twoFactorEnabled: true,
        emailVerifiedAt: new Date(),
      },
    });
    adminWith2FA = {
      id: idAdminWith2FA,
      email: emailAdminWith2FA,
      token: signAccessToken({
        sub: idAdminWith2FA,
        email: emailAdminWith2FA,
        role: UserRole.ADMIN,
        tokenVersion: 0,
      }),
    };

    // 5. Create Product
    productA = await prisma.product.create({
      data: {
        id: uuidv7(),
        title: 'Authz Matrix Course',
        slug: `authz-course-${Date.now()}`,
        description: 'Test course for authorization matrix',
        pricePaise: 29900,
        currency: 'INR',
        status: 'PUBLISHED',
      },
    });

    // 6. Create Order and Invoice owned by Student B
    orderStudentB = await prisma.order.create({
      data: {
        id: uuidv7(),
        userId: studentB.id,
        productId: productA.id,
        subtotalPaise: 29900,
        taxPaise: 0,
        totalPaise: 29900,
        currency: 'INR',
        status: OrderStatus.PAID,
        idempotencyKey: `ord_b_${uuidv7()}`,
        razorpayOrderId: `order_b_${uuidv7().substring(0, 14)}`,
        paidAt: new Date(),
      },
    });

    const invMeta = await invoiceService.generateInvoiceNumberUnderLock(prisma as any);
    invoiceStudentB = await prisma.invoice.create({
      data: {
        id: uuidv7(),
        orderId: orderStudentB.id,
        invoiceNumber: invMeta.invoiceNumber,
        financialYear: invMeta.financialYear,
        sequenceNumber: invMeta.sequenceNumber,
        subtotalPaise: 29900,
        taxPaise: 0,
        totalPaise: 29900,
        billingDetails: {},
        issuedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Clean up created entities
    await prisma.invoice.deleteMany({ where: { orderId: orderStudentB?.id } });
    await prisma.order.deleteMany({ where: { userId: { in: [studentA?.id, studentB?.id] } } });
    await prisma.product.deleteMany({ where: { id: productA?.id } });
    await prisma.user.deleteMany({
      where: {
        id: { in: [studentA?.id, studentB?.id, adminNo2FA?.id, adminWith2FA?.id].filter(Boolean) },
      },
    });
  });

  // -------------------------------------------------------------------------
  // 1. PUBLIC ROUTES (Anonymous = 200, Student = 200, Admin = 200)
  // -------------------------------------------------------------------------
  describe('1. Public Routes (Catalog, Health, Root)', () => {
    const publicEndpoints = ['/health', '/ready', '/api/v1', '/api/v1/courses'];

    for (const endpoint of publicEndpoints) {
      it(`Anonymous access allowed: GET ${endpoint} -> 200`, async () => {
        const res = await request(app).get(endpoint);
        expect(res.status).toBe(200);
      });

      it(`Student access allowed: GET ${endpoint} -> 200`, async () => {
        const res = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${studentA.token}`);
        expect(res.status).toBe(200);
      });
    }

    it('GET /api/v1/courses/:slug returns 200 for public course slug', async () => {
      const res = await request(app).get(`/api/v1/courses/${productA.slug}`);
      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe(productA.slug);
    });
  });

  // -------------------------------------------------------------------------
  // 2. STUDENT PROTECTED ROUTES (requireAuth)
  // -------------------------------------------------------------------------
  describe('2. Student Protected Routes (requireAuth)', () => {
    const protectedRoutes = [
      { method: 'get', path: '/api/v1/me/courses' },
      { method: 'get', path: '/api/v1/sessions' },
      { method: 'get', path: '/api/v1/orders' },
      { method: 'get', path: '/api/v1/invoices' },
    ];

    for (const route of protectedRoutes) {
      it(`Anonymous blocked: ${route.method.toUpperCase()} ${route.path} -> 401 Unauthorized`, async () => {
        const res = await (request(app) as any)[route.method](route.path);
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
      });

      it(`Student allowed: ${route.method.toUpperCase()} ${route.path} -> 200 OK`, async () => {
        const res = await (request(app) as any)
          [route.method](route.path)
          .set('Authorization', `Bearer ${studentA.token}`);
        expect(res.status).toBe(200);
      });
    }
  });

  // -------------------------------------------------------------------------
  // 3. IDOR PROTECTIONS (Student A cannot access Student B resources)
  // -------------------------------------------------------------------------
  describe('3. IDOR Protections (Student A cannot access Student B resources)', () => {
    it('GET /api/v1/orders/:id -> Student A accessing Student B order returns 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${orderStudentB.id}`)
        .set('Authorization', `Bearer ${studentA.token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('GET /api/v1/orders/:id -> Student B accessing own order returns 200 OK', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${orderStudentB.id}`)
        .set('Authorization', `Bearer ${studentB.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(orderStudentB.id);
    });

    it('GET /api/v1/invoices/:id -> Student A accessing Student B invoice returns 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${invoiceStudentB.id}`)
        .set('Authorization', `Bearer ${studentA.token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('GET /api/v1/invoices/:id/download -> Student A downloading Student B invoice returns 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${invoiceStudentB.id}/download`)
        .set('Authorization', `Bearer ${studentA.token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('POST /api/v1/payments/verify -> Student A verifying Student B order returns 403 or 404', async () => {
      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${studentA.token}`)
        .send({
          razorpayOrderId: `order_b_${orderStudentB.id.substring(0, 14)}`,
          razorpayPaymentId: 'pay_fake_rzp',
          razorpaySignature: 'sig_fake_rzp',
        });

      expect([403, 404]).toContain(res.status);
    });
  });

  // -------------------------------------------------------------------------
  // 4. ADMIN ROUTES (Anonymous -> 401, Student -> 403, Admin without 2FA -> 403, Admin with 2FA -> 200)
  // -------------------------------------------------------------------------
  describe('4. Admin Management Routes (Role check + Mandatory 2FA)', () => {
    const adminEndpoints = [
      '/api/v1/admin/dashboard/stats',
      '/api/v1/admin/orders',
      '/api/v1/admin/students',
      '/api/v1/admin/products',
      '/api/v1/admin/coupons',
      '/api/v1/admin/settings',
      '/api/v1/admin/audit-logs',
      '/api/v1/admin/export/orders.csv',
      '/api/v1/admin/export/students.csv',
    ];

    for (const endpoint of adminEndpoints) {
      it(`Anonymous rejected on ${endpoint} -> 401`, async () => {
        const res = await request(app).get(endpoint);
        expect(res.status).toBe(401);
      });

      it(`Student rejected on ${endpoint} -> 403 Forbidden`, async () => {
        const res = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${studentA.token}`);
        expect(res.status).toBe(403);
        expect(res.body.error.message).toContain('permission');
      });

      it(`Admin WITHOUT 2FA rejected on ${endpoint} -> 403 Forbidden (requires 2FA)`, async () => {
        const res = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminNo2FA.token}`);
        expect(res.status).toBe(403);
        expect(res.body.error.message).toContain('two-factor');
      });

      it(`Admin WITH 2FA allowed on ${endpoint} -> 200 OK`, async () => {
        const res = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminWith2FA.token}`);
        expect(res.status).toBe(200);
      });
    }
  });
});
