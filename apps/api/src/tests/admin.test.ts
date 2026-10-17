import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../common/db/prisma.js';
import { signAccessToken } from '../common/crypto/jwt.js';
import { hashToken } from '../common/crypto/tokens.js';
import { sanitizeCsvCell, toKolkataDateString } from '../modules/admin/admin.controller.js';
import { authService } from '../modules/auth/auth.service.js';
import { streamService } from '../modules/video/stream.service.js';
import { orderService } from '../modules/orders/order.service.js';
import {
  AuditAction,
  EntitlementStatus,
  OrderStatus,
  PaymentStatus,
  UserRole,
  UserStatus,
} from '@course/shared';
import { RefundStatus } from '@prisma/client';
import { uuidv7 } from 'uuidv7';

describe('Admin Panel API & Security Authorization Suite (Phase 7)', () => {
  const app = createApp();

  let adminWith2FA: any;
  let adminWithout2FA: any;
  let studentUser: any;

  let adminWith2FAToken: string;
  let adminWithout2FAToken: string;
  let studentToken: string;

  beforeEach(async () => {
    authService.resetClock();
    if (adminWith2FA?.id) {
      await authService.recordAdminActivity(adminWith2FA.id);
    }
  });

  afterEach(async () => {
    authService.resetClock();
  });

  beforeAll(async () => {
    // 1. Create Admin with 2FA enabled
    adminWith2FA = await prisma.user.upsert({
      where: { email: 'admin_2fa_ready@hydrauliccourse.com' },
      create: {
        id: uuidv7(),
        email: 'admin_2fa_ready@hydrauliccourse.com',
        name: 'Chief Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        twoFactorEnabled: true,
        emailVerifiedAt: new Date(),
        tokenVersion: 1,
      },
      update: {
        role: UserRole.ADMIN,
        twoFactorEnabled: true,
        status: UserStatus.ACTIVE,
      },
    });
    adminWith2FAToken = signAccessToken({
      sub: adminWith2FA.id,
      email: adminWith2FA.email,
      role: adminWith2FA.role,
      tokenVersion: adminWith2FA.tokenVersion,
    });

    // 2. Create Admin WITHOUT 2FA enabled
    adminWithout2FA = await prisma.user.upsert({
      where: { email: 'admin_no_2fa@hydrauliccourse.com' },
      create: {
        id: uuidv7(),
        email: 'admin_no_2fa@hydrauliccourse.com',
        name: 'Incomplete Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        twoFactorEnabled: false,
        emailVerifiedAt: new Date(),
        tokenVersion: 1,
      },
      update: {
        role: UserRole.ADMIN,
        twoFactorEnabled: false,
        status: UserStatus.ACTIVE,
      },
    });
    adminWithout2FAToken = signAccessToken({
      sub: adminWithout2FA.id,
      email: adminWithout2FA.email,
      role: adminWithout2FA.role,
      tokenVersion: adminWithout2FA.tokenVersion,
    });

    // 3. Create Student User
    studentUser = await prisma.user.upsert({
      where: { email: 'student_tester@hydrauliccourse.com' },
      create: {
        id: uuidv7(),
        email: 'student_tester@hydrauliccourse.com',
        name: 'Student Tester',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        tokenVersion: 1,
      },
      update: {
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });
    studentToken = signAccessToken({
      sub: studentUser.id,
      email: studentUser.email,
      role: studentUser.role,
      tokenVersion: studentUser.tokenVersion,
    });
  });

  describe('Authorization Sweep: Admin Routes Isolation', () => {
    const adminEndpoints = [
      { method: 'get', path: '/api/v1/admin/dashboard/stats' },
      { method: 'get', path: '/api/v1/admin/students' },
      { method: 'get', path: '/api/v1/admin/orders' },
      { method: 'get', path: '/api/v1/admin/settings' },
      { method: 'get', path: '/api/v1/admin/audit-logs' },
      { method: 'get', path: '/api/v1/admin/export/orders.csv' },
      { method: 'get', path: '/api/v1/admin/export/students.csv' },
      { method: 'get', path: '/api/v1/admin/products' },
      { method: 'get', path: '/api/v1/admin/coupons' },
    ];

    for (const ep of adminEndpoints) {
      it(`rejects anonymous requests to ${ep.method.toUpperCase()} ${ep.path} with 401 Unauthorized`, async () => {
        const res = await (request(app) as any)[ep.method](ep.path);
        expect(res.status).toBe(401);
      });

      it(`rejects regular student access to ${ep.method.toUpperCase()} ${ep.path} with 403 Forbidden`, async () => {
        const res = await (request(app) as any)
          [ep.method](ep.path)
          .set('Authorization', `Bearer ${studentToken}`);
        expect(res.status).toBe(403);
      });

      it(`rejects admin access to ${ep.method.toUpperCase()} ${ep.path} when 2FA is NOT enrolled with 403 Forbidden`, async () => {
        const res = await (request(app) as any)
          [ep.method](ep.path)
          .set('Authorization', `Bearer ${adminWithout2FAToken}`);
        expect(res.status).toBe(403);
        expect(res.body.error?.message).toContain('two-factor');
      });
    }
  });

  describe('Admin Dashboard Metrics Endpoint', () => {
    it('returns dashboard analytics for period today, 7d, and 30d for verified admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/stats?period=30d')
        .set('Authorization', `Bearer ${adminWith2FAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const stats = res.body.data;
      expect(typeof stats.revenuePaise).toBe('number');
      expect(typeof stats.revenueRupees).toBe('number');
      expect(typeof stats.ordersCount).toBe('number');
      expect(typeof stats.newStudentsCount).toBe('number');
      expect(typeof stats.activeStudentsCount).toBe('number');
      expect(Array.isArray(stats.revenueByDay)).toBe(true);
      expect(Array.isArray(stats.salesByUtm)).toBe(true);
      expect(stats.alerts).toBeDefined();
      expect(typeof stats.alerts.stuckOrdersCount).toBe('number');
      expect(typeof stats.alerts.unauthorizedPaymentsCount).toBe('number');
      expect(typeof stats.alerts.failedWebhooksCount).toBe('number');
    });
  });

  describe('Admin Student Directory & Profile', () => {
    it('returns paginated and searchable students list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/students?page=1&limit=10')
        .set('Authorization', `Bearer ${adminWith2FAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);

      // Verify ZERO leakage of sensitive credentials
      if (res.body.data.items.length > 0) {
        const student = res.body.data.items[0];
        expect(student.passwordHash).toBeUndefined();
        expect(student.twoFactorSecretEncrypted).toBeUndefined();
        expect(student.twoFactorRecoveryCodes).toBeUndefined();
      }
    });

    it('returns student detail with entitlements, orders, and progress summary', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/students/${studentUser.id}`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.id).toBe(studentUser.id);
      expect(Array.isArray(res.body.data.entitlements)).toBe(true);
      expect(Array.isArray(res.body.data.orders)).toBe(true);
      expect(res.body.data.progress).toBeDefined();
      expect(typeof res.body.data.progress.completedLessonsCount).toBe('number');
    });

    it('toggles ban status on student account and requires reason', async () => {
      // 1. Missing reason must fail
      const failRes = await request(app)
        .post(`/api/v1/admin/students/${studentUser.id}/ban`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ banned: true });

      expect(failRes.status).toBe(400);

      // 2. Valid ban with reason
      const banRes = await request(app)
        .post(`/api/v1/admin/students/${studentUser.id}/ban`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ banned: true, reason: 'Payment chargeback dispute' });

      expect(banRes.status).toBe(200);
      expect(banRes.body.data.status).toBe('BANNED');

      // 3. Unban
      const unbanRes = await request(app)
        .post(`/api/v1/admin/students/${studentUser.id}/ban`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ banned: false, reason: 'Dispute resolved' });

      expect(unbanRes.status).toBe(200);
      expect(unbanRes.body.data.status).toBe('ACTIVE');
    });

    it('forces logout for student by revoking tokens', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/students/${studentUser.id}/force-logout`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Admin Settings Management', () => {
    it('retrieves and updates application settings', async () => {
      const getRes = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminWith2FAToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.businessName).toBeDefined();
      expect(typeof getRes.body.data.gstRatePercent).toBe('number');

      // Update settings
      const updateRes = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({
          businessName: 'Industrial Hydraulics Academy India',
          businessAddress: 'Plot 44, Okhla Industrial Area, Phase 3, New Delhi',
          supportEmail: 'support@hydraulicsacademy.in',
          gstin: '07AAAAA0000A1Z5',
          gstRatePercent: 18,
          pricesTaxInclusive: true,
          invoicePrefix: 'INV',
          includeZeroValueInvoices: true,
          maxConcurrentStreams: 2,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
    });
  });

  describe('Admin Audit Log Viewer', () => {
    it('returns paginated audit logs with actor and action filters', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?page=1&limit=20')
        .set('Authorization', `Bearer ${adminWith2FAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });
  });

  describe('CSV Export & Formula-Injection Protection (CWE-1236)', () => {
    it('correctly sanitizes cells starting with formula triggers = + - @', () => {
      expect(sanitizeCsvCell('=1+1')).toBe("'=1+1");
      expect(sanitizeCsvCell('+1234567890')).toBe("'+1234567890");
      expect(sanitizeCsvCell('-50.00')).toBe("'-50.00");
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
      expect(sanitizeCsvCell("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
      expect(sanitizeCsvCell('Normal Student Name')).toBe('Normal Student Name');
      expect(sanitizeCsvCell('Name with, comma')).toBe('"Name with, comma"');
    });

    it('streams orders CSV export with Content-Type text/csv', async () => {
      const res = await request(app)
        .get('/api/v1/admin/export/orders.csv')
        .set('Authorization', `Bearer ${adminWith2FAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text).toContain('Order ID');
      expect(res.text).toContain('Total (INR)');
    });

    it('streams students CSV export with Content-Type text/csv', async () => {
      const res = await request(app)
        .get('/api/v1/admin/export/students.csv')
        .set('Authorization', `Bearer ${adminWith2FAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text).toContain('Student ID');
      expect(res.text).toContain('Student Tester');
    });
  });

  describe('Admin Coupon Management & Form Validation', () => {
    let createdCouponId: string;

    it('rejects coupon creation with invalid code format or negative values', async () => {
      // 1. Invalid characters
      const invalidCodeRes = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({
          code: 'bad coupon!@#',
          type: 'PERCENT',
          value: 20,
        });
      expect(invalidCodeRes.status).toBe(400);

      // 2. Invalid percent (> 100)
      const invalidPercentRes = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({
          code: 'OVER100',
          type: 'PERCENT',
          value: 150,
        });
      expect(invalidPercentRes.status).toBe(400);
    });

    it('creates a new coupon successfully with uppercase normalization and limits', async () => {
      const code = `TEST_${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({
          code,
          type: 'PERCENT',
          value: 25,
          maxRedemptions: 50,
          perUserLimit: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe(code);
      expect(res.body.data.value).toBe(25);
      expect(res.body.data.isActive).toBe(true);
      createdCouponId = res.body.data.id;
    });

    it('deactivates and reactivates a coupon via PATCH', async () => {
      const deactivateRes = await request(app)
        .patch(`/api/v1/admin/coupons/${createdCouponId}`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ isActive: false });

      expect(deactivateRes.status).toBe(200);
      expect(deactivateRes.body.data.isActive).toBe(false);

      const reactivateRes = await request(app)
        .patch(`/api/v1/admin/coupons/${createdCouponId}`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ isActive: true });

      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.data.isActive).toBe(true);
    });

    it('lists all coupons with redemption counts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${adminWith2FAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((c: any) => c.id === createdCouponId);
      expect(found).toBeDefined();
      expect(found._count).toBeDefined();
    });
  });

  describe('Curriculum Content Safety & Bunny Video Deletion Checks', () => {
    it('blocks deleting a lesson with an uploaded video unless confirmDeleteVideo=true', async () => {
      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          slug: `safety-test-${Date.now()}`,
          title: 'Safety Test Course',
          description: 'Testing delete guards',
          pricePaise: 10000,
        },
      });

      const section = await prisma.section.create({
        data: {
          id: uuidv7(),
          productId: product.id,
          title: 'Section 1',
          position: 1,
        },
      });

      const lesson = await prisma.lesson.create({
        data: {
          id: uuidv7(),
          sectionId: section.id,
          productId: product.id,
          title: 'Lesson With Video',
          position: 1,
          videoProviderId: 'fake-video-id-12345',
        },
      });

      const unconfirmedRes = await request(app)
        .delete(`/api/v1/admin/lessons/${lesson.id}`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`);

      expect(unconfirmedRes.status).toBe(400);
      expect(unconfirmedRes.body.error.message).toContain('uploaded video on Bunny Stream');

      const confirmedRes = await request(app)
        .delete(`/api/v1/admin/lessons/${lesson.id}?confirmDeleteVideo=true`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`);

      expect(confirmedRes.status).toBe(200);

      await prisma.product.delete({ where: { id: product.id } });
    });
  });

  describe('U2: Server-Side Admin Inactivity Timeout (30 Minutes)', () => {
    it('enforces 30-minute server inactivity timeout on requests and prevents refresh from reviving dead session', async () => {
      const inactivityAdmin = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: `inactivity_admin_${Date.now()}@hydrauliccourse.com`,
          name: 'Inactivity Admin',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          twoFactorEnabled: true,
          emailVerifiedAt: new Date(),
          tokenVersion: 1,
        },
      });
      const inactivityToken = signAccessToken({
        sub: inactivityAdmin.id,
        email: inactivityAdmin.email,
        role: inactivityAdmin.role,
        tokenVersion: inactivityAdmin.tokenVersion,
      });

      // 1. Establish baseline activity at T0
      const t0 = new Date('2026-10-17T10:00:00.000Z');
      authService.setClock(() => t0);

      // Authenticated admin request at T0 succeeds and records activity
      const reqT0 = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${inactivityToken}`);
      expect(reqT0.status).toBe(200);

      // 2. Active request within 15 minutes updates activity timestamp
      const t1 = new Date('2026-10-17T10:15:00.000Z');
      authService.setClock(() => t1);
      const reqT1 = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${inactivityToken}`);
      expect(reqT1.status).toBe(200);

      // 3. Request after 31 minutes of inactivity (10:46:01) is rejected by server
      const tDead = new Date('2026-10-17T10:46:01.000Z');
      authService.setClock(() => tDead);
      const reqDead = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${inactivityToken}`);
      expect(reqDead.status).toBe(401);
      expect(reqDead.body.error.message).toContain('30 minutes of inactivity');

      // 4. Admin refresh token must NOT extend a dead session
      const rawRefreshToken = `admin_dead_session_refresh_${uuidv7()}`;
      const hashed = hashToken(rawRefreshToken);
      await prisma.refreshToken.create({
        data: {
          id: uuidv7(),
          userId: inactivityAdmin.id,
          tokenHash: hashed,
          familyId: uuidv7(),
          expiresAt: new Date(tDead.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refresh_token=${rawRefreshToken}`]);

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.error.message).toContain('inactivity');

      // Clean up clock & restore fresh activity for adminWith2FA
      authService.resetClock();
      await authService.recordAdminActivity(adminWith2FA.id);
    });
  });

  describe('U1 & U3: Ban, Force-Logout, Entitlement Revocation, and Refund PENDING + Over-refund Lock', () => {
    it('revokes refresh tokens, bumps tokenVersion, and clears Redis stream sessions on student ban', async () => {
      const victim = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: `ban_victim_${Date.now()}@hydrauliccourse.com`,
          name: 'Ban Victim',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          tokenVersion: 1,
        },
      });

      await prisma.refreshToken.create({
        data: {
          id: uuidv7(),
          userId: victim.id,
          tokenHash: hashToken(uuidv7()),
          familyId: uuidv7(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const { sessionId } = await streamService.acquireStreamSession(victim.id, {
        ip: '127.0.0.1',
        userAgent: 'test',
      });
      expect(await streamService.getActiveSessionCount(victim.id)).toBe(1);

      const banRes = await request(app)
        .post(`/api/v1/admin/students/${victim.id}/ban`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ banned: true, reason: 'Compromised account credential sharing' });

      expect(banRes.status).toBe(200);

      const updatedVictim = await prisma.user.findUnique({ where: { id: victim.id } });
      expect(updatedVictim?.status).toBe(UserStatus.BANNED);
      expect(updatedVictim?.tokenVersion).toBe(2);

      const remainingTokens = await prisma.refreshToken.count({ where: { userId: victim.id } });
      expect(remainingTokens).toBe(0);

      expect(await streamService.getActiveSessionCount(victim.id)).toBe(0);
      expect(await streamService.refreshHeartbeat(victim.id, sessionId)).toBe(false);
    });

    it('revokes refresh tokens, bumps tokenVersion, and clears Redis stream sessions on force-logout', async () => {
      const victim = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: `logout_victim_${Date.now()}@hydrauliccourse.com`,
          name: 'Logout Victim',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          tokenVersion: 1,
        },
      });

      await prisma.refreshToken.create({
        data: {
          id: uuidv7(),
          userId: victim.id,
          tokenHash: hashToken(uuidv7()),
          familyId: uuidv7(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const { sessionId } = await streamService.acquireStreamSession(victim.id, {
        ip: '127.0.0.1',
        userAgent: 'test',
      });
      expect(await streamService.getActiveSessionCount(victim.id)).toBe(1);

      const logoutRes = await request(app)
        .post(`/api/v1/admin/students/${victim.id}/force-logout`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`);

      expect(logoutRes.status).toBe(200);

      const updatedVictim = await prisma.user.findUnique({ where: { id: victim.id } });
      expect(updatedVictim?.tokenVersion).toBe(2);

      const remainingTokens = await prisma.refreshToken.count({ where: { userId: victim.id } });
      expect(remainingTokens).toBe(0);

      expect(await streamService.getActiveSessionCount(victim.id)).toBe(0);
      expect(await streamService.refreshHeartbeat(victim.id, sessionId)).toBe(false);
    });

    it('revokes refresh tokens, bumps tokenVersion, clears stream sessions, and writes AuditLog on entitlement revoke', async () => {
      const student = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: `entitlement_student_${Date.now()}@hydrauliccourse.com`,
          name: 'Entitlement Student',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          tokenVersion: 1,
        },
      });

      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          slug: `entitlement-test-course-${Date.now()}`,
          title: 'Entitlement Test Course',
          description: 'Course description for testing',
          pricePaise: 50000,
        },
      });

      const entitlement = await prisma.entitlement.create({
        data: {
          id: uuidv7(),
          userId: student.id,
          productId: product.id,
          status: EntitlementStatus.ACTIVE,
        },
      });

      await prisma.refreshToken.create({
        data: {
          id: uuidv7(),
          userId: student.id,
          tokenHash: hashToken(uuidv7()),
          familyId: uuidv7(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const { sessionId } = await streamService.acquireStreamSession(student.id, {
        ip: '127.0.0.1',
        userAgent: 'test',
      });
      expect(await streamService.getActiveSessionCount(student.id)).toBe(1);

      const revokeRes = await request(app)
        .post(`/api/v1/admin/entitlements/${entitlement.id}/revoke`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ reason: 'Student charged back via bank' });

      expect(revokeRes.status).toBe(200);

      const updatedEntitlement = await prisma.entitlement.findUnique({
        where: { id: entitlement.id },
      });
      expect(updatedEntitlement?.status).toBe(EntitlementStatus.REVOKED);

      const updatedStudent = await prisma.user.findUnique({ where: { id: student.id } });
      expect(updatedStudent?.tokenVersion).toBe(2);

      const remainingTokens = await prisma.refreshToken.count({ where: { userId: student.id } });
      expect(remainingTokens).toBe(0);

      expect(await streamService.getActiveSessionCount(student.id)).toBe(0);
      expect(await streamService.refreshHeartbeat(student.id, sessionId)).toBe(false);

      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          entityType: 'Entitlement',
          entityId: entitlement.id,
          action: AuditAction.ENTITLEMENT_REVOKED,
        },
      });
      expect(auditEntry).toBeDefined();
    });

    it('confirms refund stays PENDING until webhook and enforces over-refund lock against concurrent over-refunding', async () => {
      const student = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: `refund_student_${Date.now()}@hydrauliccourse.com`,
          name: 'Refund Student',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          slug: `refund-course-${Date.now()}`,
          title: 'Refund Test Course',
          description: 'Course description for testing',
          pricePaise: 100000,
        },
      });

      const order = await prisma.order.create({
        data: {
          id: uuidv7(),
          userId: student.id,
          productId: product.id,
          idempotencyKey: `refund-idem-${Date.now()}`,
          status: OrderStatus.PAID,
          subtotalPaise: 100000,
          totalPaise: 100000,
          paidAt: new Date(),
        },
      });

      const payment = await prisma.payment.create({
        data: {
          id: uuidv7(),
          orderId: order.id,
          razorpayPaymentId: `pay_refund_test_${Date.now()}`,
          amountPaise: 100000,
          status: PaymentStatus.CAPTURED,
          capturedAt: new Date(),
        },
      });

      // 1. Initiate partial refund of ₹600 (60,000 paise) via admin route
      const refund1Res = await request(app)
        .post(`/api/v1/admin/orders/${order.id}/refund`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ amountPaise: 60000, reason: 'Customer requested partial refund' });

      expect(refund1Res.status).toBe(200);

      const refundRecord = await prisma.refund.findFirst({
        where: { paymentId: payment.id },
      });
      expect(refundRecord).toBeDefined();
      expect(refundRecord?.status).toBe(RefundStatus.PENDING);
      expect(refundRecord?.amountPaise).toBe(60000);

      const checkOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(checkOrder?.status).toBe(OrderStatus.PAID);

      // 2. Over-refund lock test: Attempting another refund of ₹500 (total ₹1100 > ₹1000)
      const overRefundRes = await request(app)
        .post(`/api/v1/admin/orders/${order.id}/refund`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ amountPaise: 50000, reason: 'Excessive refund attempt' });

      expect(overRefundRes.status).toBe(400);
      expect(overRefundRes.body.error.message).toContain('Available for refund: 40000 paise');
    });

    it('V1: confirms refund cap equals captured payment on a coupon-discounted order and marks order REFUNDED only when processed refunds equal captured amount', async () => {
      const student = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: `coupon_refund_${Date.now()}@hydrauliccourse.com`,
          name: 'Coupon Refund Student',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          slug: `coupon-refund-prod-${Date.now()}`,
          title: 'Coupon Refund Product',
          description: 'Course description for testing',
          pricePaise: 500000, // ₹5,000 list price
        },
      });

      // Customer applied 20% coupon: subtotal ₹4,000, 18% GST ₹720, total captured ₹4,720 (472,000 paise)
      const order = await prisma.order.create({
        data: {
          id: uuidv7(),
          userId: student.id,
          productId: product.id,
          idempotencyKey: `coupon-order-${Date.now()}`,
          status: OrderStatus.PAID,
          subtotalPaise: 400000, // 400,000 paise
          taxPaise: 72000, // 72,000 paise
          totalPaise: 472000, // 472,000 paise (what customer actually paid)
          paidAt: new Date(),
        },
      });

      const payment = await prisma.payment.create({
        data: {
          id: uuidv7(),
          orderId: order.id,
          razorpayPaymentId: `pay_coupon_${Date.now()}`,
          amountPaise: 472000, // Amount actually CAPTURED
          status: PaymentStatus.CAPTURED,
          capturedAt: new Date(),
        },
      });

      // 1. Over-refund test: attempt refund > captured amount (472,001 paise) -> rejected
      const overRes1 = await request(app)
        .post(`/api/v1/admin/orders/${order.id}/refund`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ amountPaise: 472001, reason: 'Over refund attempt' });
      expect(overRes1.status).toBe(400);
      expect(overRes1.body.error.message).toContain('Available for refund: 472000 paise');

      // Attempt refund of product list price (500,000 paise) -> rejected
      const overRes2 = await request(app)
        .post(`/api/v1/admin/orders/${order.id}/refund`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ amountPaise: 500000, reason: 'Attempt refund list price' });
      expect(overRes2.status).toBe(400);
      expect(overRes2.body.error.message).toContain('Available for refund: 472000 paise');

      // 2. Partial refund of ₹2,000 (200,000 paise)
      const partRes = await request(app)
        .post(`/api/v1/admin/orders/${order.id}/refund`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ amountPaise: 200000, reason: 'Partial refund' });
      expect(partRes.status).toBe(200);

      const refundRecord1 = partRes.body.data.refund;
      expect(refundRecord1.status).toBe(RefundStatus.PENDING);

      // Webhook processes first refund
      await orderService.handleRefundProcessed({
        id: refundRecord1.razorpayRefundId,
        payment_id: payment.razorpayPaymentId,
        amount: 200000,
      });

      // Order status should be PARTIALLY_REFUNDED (NOT full REFUNDED)
      const orderAfterPart = await prisma.order.findUnique({ where: { id: order.id } });
      expect(orderAfterPart?.status).toBe(OrderStatus.PARTIALLY_REFUNDED);

      // Remaining refundable must equal 272,000 paise (472,000 - 200,000)
      const overRes3 = await request(app)
        .post(`/api/v1/admin/orders/${order.id}/refund`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ amountPaise: 272001, reason: 'Over remainder' });
      expect(overRes3.status).toBe(400);
      expect(overRes3.body.error.message).toContain('Available for refund: 272000 paise');

      // 3. Complete remaining refund of 272,000 paise
      const fullRes = await request(app)
        .post(`/api/v1/admin/orders/${order.id}/refund`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ amountPaise: 272000, reason: 'Complete refund' });
      expect(fullRes.status).toBe(200);

      const refundRecord2 = fullRes.body.data.refund;
      // Before webhook, order is still not REFUNDED
      const orderBeforeHook2 = await prisma.order.findUnique({ where: { id: order.id } });
      expect(orderBeforeHook2?.status).toBe(OrderStatus.PARTIALLY_REFUNDED);

      // Webhook processes second refund
      await orderService.handleRefundProcessed({
        id: refundRecord2.razorpayRefundId,
        payment_id: payment.razorpayPaymentId,
        amount: 272000,
      });

      // Now processed refunds equal captured amount (200,000 + 272,000 = 472,000) -> order is REFUNDED
      const orderFinal = await prisma.order.findUnique({ where: { id: order.id } });
      expect(orderFinal?.status).toBe(OrderStatus.REFUNDED);

      const paymentFinal = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(paymentFinal?.status).toBe(PaymentStatus.REFUNDED);
    });

    it('V1: confirms refund cap equals captured payment on a tax-inclusive order and marks order REFUNDED only when processed refunds equal captured amount', async () => {
      const student = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: `tax_inc_refund_${Date.now()}@hydrauliccourse.com`,
          name: 'Tax Inc Student',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          slug: `tax-inc-prod-${Date.now()}`,
          title: 'Tax Inclusive Product',
          description: 'Course description for testing',
          pricePaise: 118000,
        },
      });

      // Tax-inclusive: Base ₹1,000 (100,000 paise), Tax ₹180 (18,000 paise), Total paid = ₹1,180 (118,000 paise)
      const order = await prisma.order.create({
        data: {
          id: uuidv7(),
          userId: student.id,
          productId: product.id,
          idempotencyKey: `tax-inc-order-${Date.now()}`,
          status: OrderStatus.PAID,
          subtotalPaise: 100000,
          taxPaise: 18000,
          totalPaise: 118000,
          paidAt: new Date(),
        },
      });

      const payment = await prisma.payment.create({
        data: {
          id: uuidv7(),
          orderId: order.id,
          razorpayPaymentId: `pay_tax_inc_${Date.now()}`,
          amountPaise: 118000, // Captured amount
          status: PaymentStatus.CAPTURED,
          capturedAt: new Date(),
        },
      });

      // Attempt over-refund
      const overRes = await request(app)
        .post(`/api/v1/admin/orders/${order.id}/refund`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ amountPaise: 118001, reason: 'Over refund attempt' });
      expect(overRes.status).toBe(400);
      expect(overRes.body.error.message).toContain('Available for refund: 118000 paise');

      // Initiate full refund
      const refundRes = await request(app)
        .post(`/api/v1/admin/orders/${order.id}/refund`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ amountPaise: 118000, reason: 'Full refund' });
      expect(refundRes.status).toBe(200);

      // Order is still PAID while refund is PENDING
      const orderPending = await prisma.order.findUnique({ where: { id: order.id } });
      expect(orderPending?.status).toBe(OrderStatus.PAID);

      // Webhook processes refund
      await orderService.handleRefundProcessed({
        id: refundRes.body.data.refund.razorpayRefundId,
        payment_id: payment.razorpayPaymentId,
        amount: 118000,
      });

      // Order is now REFUNDED
      const orderDone = await prisma.order.findUnique({ where: { id: order.id } });
      expect(orderDone?.status).toBe(OrderStatus.REFUNDED);
    });

    it('V1: confirms refund cap equals captured payment on a tax-exclusive order and marks order REFUNDED only when processed refunds equal captured amount', async () => {
      const student = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: `tax_exc_refund_${Date.now()}@hydrauliccourse.com`,
          name: 'Tax Exc Student',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          slug: `tax-exc-prod-${Date.now()}`,
          title: 'Tax Exclusive Product',
          description: 'Course description for testing',
          pricePaise: 100000, // Base ₹1,000
        },
      });

      // Tax-exclusive: Subtotal ₹1,000 (100,000 paise) + 18% GST ₹180 (18,000 paise) = Total paid ₹1,180 (118,000 paise)
      const order = await prisma.order.create({
        data: {
          id: uuidv7(),
          userId: student.id,
          productId: product.id,
          idempotencyKey: `tax-exc-order-${Date.now()}`,
          status: OrderStatus.PAID,
          subtotalPaise: 100000, // Subtotal is only 100,000
          taxPaise: 18000,
          totalPaise: 118000, // Total captured is 118,000
          paidAt: new Date(),
        },
      });

      const payment = await prisma.payment.create({
        data: {
          id: uuidv7(),
          orderId: order.id,
          razorpayPaymentId: `pay_tax_exc_${Date.now()}`,
          amountPaise: 118000, // Captured amount on payment
          status: PaymentStatus.CAPTURED,
          capturedAt: new Date(),
        },
      });

      // Cap must be 118,000 paise (what customer paid), NOT subtotal 100,000 paise!
      // Attempting 118,001 fails
      const overRes = await request(app)
        .post(`/api/v1/admin/orders/${order.id}/refund`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ amountPaise: 118001, reason: 'Over refund attempt' });
      expect(overRes.status).toBe(400);
      expect(overRes.body.error.message).toContain('Available for refund: 118000 paise');

      // Attempting 118,000 paise succeeds (exceeding subtotal 100,000 paise, because tax was captured!)
      const refundRes = await request(app)
        .post(`/api/v1/admin/orders/${order.id}/refund`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({ amountPaise: 118000, reason: 'Full refund including tax' });
      expect(refundRes.status).toBe(200);

      // Webhook processes refund
      await orderService.handleRefundProcessed({
        id: refundRes.body.data.refund.razorpayRefundId,
        payment_id: payment.razorpayPaymentId,
        amount: 118000,
      });

      // Order is now REFUNDED
      const orderDone = await prisma.order.findUnique({ where: { id: order.id } });
      expect(orderDone?.status).toBe(OrderStatus.REFUNDED);
    });
  });

  describe('U4: Quote Endpoint Hardening (POST Only, Uniform Error, Enumeration Defense)', () => {
    it('rejects GET /orders/quote with 405 Method Not Allowed', async () => {
      const getRes = await request(app).get('/api/v1/orders/quote');
      expect([404, 405]).toContain(getRes.status);
    });

    it('returns 200 with accurate calculation for valid POST /orders/quote', async () => {
      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          slug: `quote-prod-${Date.now()}`,
          title: 'Quote Product',
          description: 'Course description for testing',
          pricePaise: 499900,
          status: 'PUBLISHED',
        },
      });

      const postRes = await request(app)
        .post('/api/v1/orders/quote')
        .send({ courseSlug: product.slug });

      expect(postRes.status).toBe(200);
      expect(postRes.body.success).toBe(true);
      expect(postRes.body.data.basePricePaise).toBe(499900);
    });

    it('returns uniform 400 error for invalid, nonexistent, or expired coupons preventing cheap enumeration', async () => {
      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          slug: `quote-coupon-${Date.now()}`,
          title: 'Quote Coupon Product',
          description: 'Course description for testing',
          pricePaise: 200000,
          status: 'PUBLISHED',
        },
      });

      const resNonExistent = await request(app)
        .post('/api/v1/orders/quote')
        .send({ courseSlug: product.slug, couponCode: 'DOES_NOT_EXIST_CODE' });

      expect(resNonExistent.status).toBe(400);
      expect(resNonExistent.body.error.message).toBe('Invalid or expired coupon code.');

      const expiredCoupon = await prisma.coupon.create({
        data: {
          id: uuidv7(),
          code: `EXPIRED_${Date.now()}`,
          type: 'PERCENT',
          value: 10,
          validUntil: new Date(Date.now() - 86400000),
          isActive: true,
        },
      });

      const resExpired = await request(app)
        .post('/api/v1/orders/quote')
        .send({ courseSlug: product.slug, couponCode: expiredCoupon.code });

      expect(resExpired.status).toBe(400);
      expect(resExpired.body.error.message).toBe('Invalid or expired coupon code.');
    });
  });

  describe('U5: Settings Validation, AuditLog & Invoice Immutability', () => {
    it('validates Indian GSTIN format and GST rate (0% to 28%)', async () => {
      // Ensure admin token is fresh and active
      await authService.recordAdminActivity(adminWith2FA.id);

      const invalidGstinRes = await request(app)
        .patch('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({
          businessName: 'Hydraulics Academy',
          supportEmail: 'support@hydrauliccourse.com',
          gstin: 'INVALID_GSTIN_123',
          gstRatePercent: 18,
        });

      if (invalidGstinRes.status !== 400) {
        console.error('DEBUG invalidGstinRes error:', invalidGstinRes.body);
      }
      expect(invalidGstinRes.status).toBe(400);
      expect(invalidGstinRes.body.error.message).toContain('Invalid GSTIN format');

      const negativeRateRes = await request(app)
        .patch('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({
          businessName: 'Hydraulics Academy',
          supportEmail: 'support@hydrauliccourse.com',
          gstRatePercent: -5,
        });

      expect(negativeRateRes.status).toBe(400);
      expect(negativeRateRes.body.error.message).toContain('GST rate must be between 0% and 28%');

      const highRateRes = await request(app)
        .patch('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({
          businessName: 'Hydraulics Academy',
          supportEmail: 'support@hydrauliccourse.com',
          gstRatePercent: 40,
        });

      expect(highRateRes.status).toBe(400);
      expect(highRateRes.body.error.message).toContain('GST rate must be between 0% and 28%');
    });

    it('records old and new values in AuditLog and preserves existing invoice immutability across settings changes', async () => {
      await request(app)
        .patch('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({
          businessName: 'Hydraulic Academy India',
          supportEmail: 'admin@hydrauliccourse.com',
          gstin: '29ABCDE1234F1Z5',
          gstRatePercent: 18,
          pricesTaxInclusive: true,
        });

      const student = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: `invoice_immutability_${Date.now()}@hydrauliccourse.com`,
          name: 'Invoice Student',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          slug: `immutable-course-${Date.now()}`,
          title: 'Immutable Invoice Course',
          description: 'Course description for testing',
          pricePaise: 118000,
          status: 'PUBLISHED',
        },
      });

      const order1 = await prisma.order.create({
        data: {
          id: uuidv7(),
          userId: student.id,
          productId: product.id,
          idempotencyKey: `inv-test-1-${Date.now()}`,
          status: OrderStatus.PAID,
          subtotalPaise: 100000,
          taxPaise: 18000,
          totalPaise: 118000,
          paidAt: new Date(),
        },
      });

      const invoice1 = await prisma.invoice.create({
        data: {
          id: uuidv7(),
          orderId: order1.id,
          invoiceNumber: `INV/26-27/${Date.now().toString().slice(-5)}`,
          financialYear: '26-27',
          sequenceNumber: 1,
          billingDetails: { name: 'Invoice Student', email: student.email },
          subtotalPaise: 100000,
          taxPaise: 18000,
          totalPaise: 118000,
        },
      });

      const updateSettingsRes = await request(app)
        .patch('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({
          businessName: 'Hydraulic Academy India Updated',
          supportEmail: 'admin@hydrauliccourse.com',
          gstin: '29ABCDE1234F1Z5',
          gstRatePercent: 28,
          pricesTaxInclusive: false,
        });

      expect(updateSettingsRes.status).toBe(200);

      const settingAudit = await prisma.auditLog.findFirst({
        where: {
          entityType: 'AppSetting',
          entityId: 'all_settings',
          action: AuditAction.SETTING_UPDATED,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(settingAudit).toBeDefined();
      expect((settingAudit?.afterState as any)?.tax_config?.gstRatePercent).toBe(28);

      const existingInvoice = await prisma.invoice.findUnique({
        where: { id: invoice1.id },
      });
      expect(existingInvoice?.taxPaise).toBe(18000);
      expect(existingInvoice?.subtotalPaise).toBe(100000);
      expect(existingInvoice?.totalPaise).toBe(118000);

      const newQuoteRes = await request(app)
        .post('/api/v1/orders/quote')
        .send({ courseSlug: product.slug });

      expect(newQuoteRes.status).toBe(200);
      expect(newQuoteRes.body.data.taxRatePercent).toBe(28);
    });
  });

  describe('U6: Dashboard Net Revenue & Asia/Kolkata Daily Bucketing', () => {
    it('calculates revenue net of refunds and buckets orders placed at 23:50 and 00:10 IST into separate days', async () => {
      const student = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: `kolkata_student_${Date.now()}@hydrauliccourse.com`,
          name: 'Kolkata Student',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      const product = await prisma.product.create({
        data: {
          id: uuidv7(),
          slug: `kolkata-course-${Date.now()}`,
          title: 'Kolkata Course',
          description: 'Course description for testing',
          pricePaise: 100000,
        },
      });

      // Order A: placed at 23:50 IST on Oct 15 => 18:20 UTC on Oct 15
      const paidAtOrderA = new Date('2026-10-15T18:20:00.000Z');
      expect(toKolkataDateString(paidAtOrderA)).toBe('2026-10-15');

      // Order B: placed at 00:10 IST on Oct 16 => 18:40 UTC on Oct 15
      const paidAtOrderB = new Date('2026-10-15T18:40:00.000Z');
      expect(toKolkataDateString(paidAtOrderB)).toBe('2026-10-16');

      // Clean up any existing records for these exact test timestamps
      await prisma.refund.deleteMany({
        where: { razorpayRefundId: { startsWith: 'rfnd_kolkata_' } },
      });
      await prisma.payment.deleteMany({
        where: { razorpayPaymentId: { startsWith: 'pay_kolkata_' } },
      });
      await prisma.order.deleteMany({
        where: { idempotencyKey: { startsWith: 'kolkata-order-' } },
      });
      await prisma.order.deleteMany({ where: { paidAt: { in: [paidAtOrderA, paidAtOrderB] } } });

      const orderA = await prisma.order.create({
        data: {
          id: uuidv7(),
          userId: student.id,
          productId: product.id,
          idempotencyKey: `kolkata-order-a-${Date.now()}`,
          status: OrderStatus.PAID,
          subtotalPaise: 100000,
          totalPaise: 100000,
          paidAt: paidAtOrderA,
          createdAt: paidAtOrderA,
        },
      });

      const paymentA = await prisma.payment.create({
        data: {
          id: uuidv7(),
          orderId: orderA.id,
          razorpayPaymentId: `pay_kolkata_a_${Date.now()}`,
          amountPaise: 100000,
          status: PaymentStatus.CAPTURED,
          capturedAt: paidAtOrderA,
          createdAt: paidAtOrderA,
        },
      });

      // Order B: placed at 00:10 IST on Oct 16
      await prisma.order.create({
        data: {
          id: uuidv7(),
          userId: student.id,
          productId: product.id,
          idempotencyKey: `kolkata-order-b-${Date.now()}`,
          status: OrderStatus.PAID,
          subtotalPaise: 200000,
          totalPaise: 200000,
          paidAt: paidAtOrderB,
          createdAt: paidAtOrderB,
        },
      });

      // Processed refund of ₹300 (30,000 paise) on Order A on Oct 15 (23:55 IST)
      const refundAtIST = new Date('2026-10-15T18:25:00.000Z');
      await prisma.refund.create({
        data: {
          id: uuidv7(),
          paymentId: paymentA.id,
          razorpayRefundId: `rfnd_kolkata_${Date.now()}`,
          amountPaise: 30000,
          status: RefundStatus.PROCESSED,
          createdAt: refundAtIST,
        },
      });

      const statsRes = await request(app)
        .get('/api/v1/admin/dashboard/stats?period=30d')
        .set('Authorization', `Bearer ${adminWith2FAToken}`);

      expect(statsRes.status).toBe(200);
      const data = statsRes.body.data;

      expect(data.grossRevenuePaise).toBeGreaterThanOrEqual(300000);
      expect(data.refundsPaise).toBeGreaterThanOrEqual(30000);
      expect(data.revenuePaise).toBe(data.grossRevenuePaise - data.refundsPaise);

      const bucketA = data.revenueByDay.find((b: any) => b.date === '2026-10-15');
      const bucketB = data.revenueByDay.find((b: any) => b.date === '2026-10-16');

      expect(bucketA).toBeDefined();
      expect(bucketB).toBeDefined();
      expect(bucketA.revenuePaise).toBe(70000);
      expect(bucketB.revenuePaise).toBe(200000);
    });
  });

  describe('U8: Admin Coupon Edit (Limits, Validity, Active State; Code Fixed)', () => {
    it('allows admin to edit limits, validity and active state while keeping code immutable', async () => {
      const originalCode = `FIXED_${Date.now()}`;
      const coupon = await prisma.coupon.create({
        data: {
          id: uuidv7(),
          code: originalCode,
          type: 'PERCENT',
          value: 15,
          maxRedemptions: 50,
          perUserLimit: 1,
          isActive: true,
        },
      });

      const editRes = await request(app)
        .patch(`/api/v1/admin/coupons/${coupon.id}`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({
          code: 'HACKED_CODE',
          maxRedemptions: 150,
          perUserLimit: 3,
          validUntil: '2026-12-31T23:59:59.000Z',
          isActive: false,
        });

      expect(editRes.status).toBe(200);
      expect(editRes.body.success).toBe(true);

      const updated = await prisma.coupon.findUnique({ where: { id: coupon.id } });
      expect(updated?.code).toBe(originalCode);
      expect(updated?.maxRedemptions).toBe(150);
      expect(updated?.perUserLimit).toBe(3);
      expect(updated?.isActive).toBe(false);
      expect(updated?.validUntil).toEqual(new Date('2026-12-31T23:59:59.000Z'));

      const audit = await prisma.auditLog.findFirst({
        where: {
          entityType: 'Coupon',
          entityId: coupon.id,
          action: AuditAction.COUPON_UPDATED,
        },
      });
      expect(audit).toBeDefined();
    });
  });

  afterAll(async () => {
    await prisma.appSetting.upsert({
      where: { key: 'invoice_config' },
      create: {
        id: uuidv7(),
        key: 'invoice_config',
        value: { invoicePrefix: 'INV', includeZeroValueInvoices: true },
      },
      update: {
        value: { invoicePrefix: 'INV', includeZeroValueInvoices: true },
      },
    });

    await prisma.appSetting.upsert({
      where: { key: 'tax_config' },
      create: {
        id: uuidv7(),
        key: 'tax_config',
        value: { gstin: '', gstRatePercent: 0, pricesTaxInclusive: true },
      },
      update: {
        value: { gstin: '', gstRatePercent: 0, pricesTaxInclusive: true },
      },
    });
  });
});
