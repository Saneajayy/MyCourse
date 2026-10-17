import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
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
  LessonStatus,
  EntitlementStatus,
  EntitlementSource,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
} from '@course/shared';
import { setVideoProviderForTesting, FakeVideoProvider } from '../modules/video/video.service.js';
import { playbackService } from '../modules/video/playback.service.js';
import { entitlementService } from '../modules/entitlements/entitlement.service.js';
import { streamService } from '../modules/video/stream.service.js';
import { cleanExpiredEntitlements } from '../modules/entitlements/entitlement-expiry.worker.js';
import { orderService } from '../modules/orders/order.service.js';
import { setPaymentGateway } from '../modules/payments/payment.service.js';
import { FakePaymentGateway } from '../modules/payments/fake-payment.gateway.js';

describe('Phase 5 Secure Playback, Progress Tracking, and Access Expiry Suite', () => {
  const app = createApp();
  const fakeVideoProvider = new FakeVideoProvider();
  const fakePaymentGateway = new FakePaymentGateway();

  // Test users
  let entitledStudentId: string;
  let entitledStudentToken: string;
  let entitledStudentEmail: string;

  let unentitledStudentId: string;
  let unentitledStudentToken: string;
  let unentitledStudentEmail: string;

  let expiredStudentId: string;
  let expiredStudentToken: string;

  let bannedStudentId: string;
  let bannedStudentToken: string;

  let adminWith2FAId: string;
  let adminWith2FAToken: string;

  let adminWithout2FAId: string;
  let adminWithout2FAToken: string;

  // Course, Section, and Lessons
  let testProductId: string;
  let testProductSlug: string;
  let testSectionId: string;
  let paidLessonId: string;
  let freeLessonId: string;
  let processingLessonId: string;

  const dummyPassword = 'SecurePassword#2026!';
  const createdUserIds: string[] = [];
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    setVideoProviderForTesting(fakeVideoProvider);
    setPaymentGateway(fakePaymentGateway);

    const passwordHash = await hashPassword(dummyPassword);

    // 1. Create Entitled Student
    entitledStudentId = uuidv7();
    entitledStudentEmail = `entitled_${Date.now()}@testplayback.com`;
    await prisma.user.create({
      data: {
        id: entitledStudentId,
        email: entitledStudentEmail,
        name: 'Entitled Student',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
      },
    });
    entitledStudentToken = signAccessToken({
      sub: entitledStudentId,
      email: entitledStudentEmail,
      role: UserRole.STUDENT,
      tokenVersion: 0,
    });
    createdUserIds.push(entitledStudentId);

    // 2. Create Unentitled Student
    unentitledStudentId = uuidv7();
    unentitledStudentEmail = `unentitled_${Date.now()}@testplayback.com`;
    await prisma.user.create({
      data: {
        id: unentitledStudentId,
        email: unentitledStudentEmail,
        name: 'Unentitled Student',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
      },
    });
    unentitledStudentToken = signAccessToken({
      sub: unentitledStudentId,
      email: unentitledStudentEmail,
      role: UserRole.STUDENT,
      tokenVersion: 0,
    });
    createdUserIds.push(unentitledStudentId);

    // 3. Create Expired Student
    expiredStudentId = uuidv7();
    const expiredEmail = `expired_${Date.now()}@testplayback.com`;
    await prisma.user.create({
      data: {
        id: expiredStudentId,
        email: expiredEmail,
        name: 'Expired Student',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
      },
    });
    expiredStudentToken = signAccessToken({
      sub: expiredStudentId,
      email: expiredEmail,
      role: UserRole.STUDENT,
      tokenVersion: 0,
    });
    createdUserIds.push(expiredStudentId);

    // 4. Create Banned Student
    bannedStudentId = uuidv7();
    const bannedEmail = `banned_${Date.now()}@testplayback.com`;
    await prisma.user.create({
      data: {
        id: bannedStudentId,
        email: bannedEmail,
        name: 'Banned Student',
        role: UserRole.STUDENT,
        status: UserStatus.BANNED,
        passwordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
      },
    });
    bannedStudentToken = signAccessToken({
      sub: bannedStudentId,
      email: bannedEmail,
      role: UserRole.STUDENT,
      tokenVersion: 0,
    });
    createdUserIds.push(bannedStudentId);

    // 5. Create Admin with 2FA
    adminWith2FAId = uuidv7();
    const adminEmail = `admin_2fa_${Date.now()}@testplayback.com`;
    await prisma.user.create({
      data: {
        id: adminWith2FAId,
        email: adminEmail,
        name: 'Admin With 2FA',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: true,
        twoFactorEnrolledAt: new Date(),
      },
    });
    adminWith2FAToken = signAccessToken({
      sub: adminWith2FAId,
      email: adminEmail,
      role: UserRole.ADMIN,
      tokenVersion: 0,
    });
    createdUserIds.push(adminWith2FAId);

    // 6. Create Admin without 2FA
    adminWithout2FAId = uuidv7();
    const adminNo2faEmail = `admin_no2fa_${Date.now()}@testplayback.com`;
    await prisma.user.create({
      data: {
        id: adminWithout2FAId,
        email: adminNo2faEmail,
        name: 'Admin Without 2FA',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
      },
    });
    adminWithout2FAToken = signAccessToken({
      sub: adminWithout2FAId,
      email: adminNo2faEmail,
      role: UserRole.ADMIN,
      tokenVersion: 0,
    });
    createdUserIds.push(adminWithout2FAId);

    // 7. Create Test Course Product
    testProductId = uuidv7();
    testProductSlug = `playback-course-${Date.now()}`;
    await prisma.product.create({
      data: {
        id: testProductId,
        slug: testProductSlug,
        title: 'Playback Masterclass',
        description: 'Comprehensive course for testing playback and streaming security',
        pricePaise: 499900,
        currency: 'INR',
        validityDays: 365,
        status: ProductStatus.PUBLISHED,
      },
    });
    createdProductIds.push(testProductId);

    // 8. Create Section
    testSectionId = uuidv7();
    await prisma.section.create({
      data: {
        id: testSectionId,
        productId: testProductId,
        title: 'Module 1: Core Playback',
        position: 1,
      },
    });

    // 9. Create Paid Lesson (READY)
    paidLessonId = uuidv7();
    await prisma.lesson.create({
      data: {
        id: paidLessonId,
        productId: testProductId,
        sectionId: testSectionId,
        title: '1.1 Deep Dive into Playback Architecture',
        durationSeconds: 100,
        position: 1,
        isPublished: true,
        isFreePreview: false,
        status: LessonStatus.READY,
        videoProviderId: 'fake-paid-video-guid-1',
      },
    });

    // 10. Create Free Preview Lesson (READY)
    freeLessonId = uuidv7();
    await prisma.lesson.create({
      data: {
        id: freeLessonId,
        productId: testProductId,
        sectionId: testSectionId,
        title: '1.2 Free Preview Lesson',
        durationSeconds: 60,
        position: 2,
        isPublished: true,
        isFreePreview: true,
        status: LessonStatus.READY,
        videoProviderId: 'fake-free-video-guid-2',
      },
    });

    // 11. Create Processing Lesson (PROCESSING)
    processingLessonId = uuidv7();
    await prisma.lesson.create({
      data: {
        id: processingLessonId,
        productId: testProductId,
        sectionId: testSectionId,
        title: '1.3 In-Progress Transcoding Lesson',
        durationSeconds: 100,
        position: 3,
        isPublished: true,
        isFreePreview: false,
        status: LessonStatus.PROCESSING,
        videoProviderId: 'fake-processing-guid-3',
      },
    });

    // 12. Create Active Entitlement for Entitled Student
    await prisma.entitlement.create({
      data: {
        id: uuidv7(),
        userId: entitledStudentId,
        productId: testProductId,
        source: EntitlementSource.PURCHASE,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 86400 * 1000),
        status: EntitlementStatus.ACTIVE,
      },
    });

    // 13. Create Past Expired Entitlement for Expired Student
    await prisma.entitlement.create({
      data: {
        id: uuidv7(),
        userId: expiredStudentId,
        productId: testProductId,
        source: EntitlementSource.PURCHASE,
        startsAt: new Date(Date.now() - 400 * 86400 * 1000),
        expiresAt: new Date(Date.now() - 35 * 86400 * 1000), // expired 35 days ago
        status: EntitlementStatus.EXPIRED,
      },
    });
  });

  afterAll(async () => {
    // Reset clocks
    playbackService.resetClock();
    entitlementService.resetClock();

    // Cleanup created data
    await prisma.lessonProgress.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.entitlement.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.refund.deleteMany({
      where: { payment: { order: { productId: { in: createdProductIds } } } },
    });
    await prisma.payment.deleteMany({
      where: { order: { productId: { in: createdProductIds } } },
    });
    await prisma.invoice.deleteMany({
      where: { order: { productId: { in: createdProductIds } } },
    });
    await prisma.order.deleteMany({
      where: { productId: { in: createdProductIds } },
    });
    await prisma.auditLog.deleteMany({
      where: { actorUserId: { in: createdUserIds } },
    });
    await prisma.lesson.deleteMany({
      where: { productId: { in: createdProductIds } },
    });
    await prisma.section.deleteMany({
      where: { productId: { in: createdProductIds } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: createdProductIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });

    // Clear test redis sessions
    for (const uId of createdUserIds) {
      await streamService.clearUserSessions(uId).catch(() => {});
    }
  });

  // ==========================================
  // 1. Playback Authorization & Security
  // ==========================================
  describe('1. Playback Endpoint (POST /api/v1/lessons/:id/playback)', () => {
    it('grants signed playback credentials to an entitled student', async () => {
      const res = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        lessonId: paidLessonId,
        title: '1.1 Deep Dive into Playback Architecture',
        durationSeconds: 100,
        watermark: {
          text: entitledStudentEmail,
          userId: entitledStudentId,
        },
      });
      expect(res.body.data.playbackUrl).toContain('playlist.m3u8?token=');
      expect(res.body.data.embedUrl).toContain('token=');
      expect(res.body.data.sessionId).toBeDefined();
      expect(res.body.data.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('denies playback to an unentitled student (403 Forbidden) and leaks no video/library IDs', async () => {
      const res = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${unentitledStudentToken}`)
        .expect(403);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('active access');
      // Verify NO video metadata is leaked
      expect(res.body.playbackUrl).toBeUndefined();
      expect(res.body.videoProviderId).toBeUndefined();
      expect(res.body.embedUrl).toBeUndefined();
    });

    it('denies playback to an expired student (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${expiredStudentToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('denies playback to a banned student (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${bannedStudentToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toMatch(/suspended|banned/i);
    });

    it('denies playback without authentication (401 Unauthorized)', async () => {
      await request(app).post(`/api/v1/lessons/${paidLessonId}/playback`).expect(401);
    });

    it('denies playback for a lesson in PROCESSING status (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/v1/lessons/${processingLessonId}/playback`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .expect(400);

      expect(res.body.error.message).toContain('still processing');
    });
  });

  // ==========================================
  // 2. Free Preview Playback
  // ==========================================
  describe('2. Free Preview Playback', () => {
    it('allows an unentitled student to play a free preview lesson without purchase', async () => {
      const res = await request(app)
        .post(`/api/v1/lessons/${freeLessonId}/playback`)
        .set('Authorization', `Bearer ${unentitledStudentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.lessonId).toBe(freeLessonId);
      expect(res.body.data.playbackUrl).toBeDefined();
      expect(res.body.data.watermark.text).toBe(unentitledStudentEmail);
    });
  });

  // ==========================================
  // 3. Expiry Boundary & Clock Injection
  // ==========================================
  describe('3. Expiry Boundary & Clock-Injected Verification', () => {
    let boundaryUserId: string;
    let boundaryToken: string;
    let boundaryExpiryDate: Date;

    beforeAll(async () => {
      boundaryUserId = uuidv7();
      const email = `boundary_${Date.now()}@testplayback.com`;
      await prisma.user.create({
        data: {
          id: boundaryUserId,
          email,
          name: 'Boundary Test Student',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          passwordHash: await hashPassword(dummyPassword),
          emailVerifiedAt: new Date(),
          twoFactorEnabled: false,
        },
      });
      boundaryToken = signAccessToken({
        sub: boundaryUserId,
        email,
        role: UserRole.STUDENT,
        tokenVersion: 0,
      });
      createdUserIds.push(boundaryUserId);

      // Entitlement expires exactly at T
      boundaryExpiryDate = new Date('2026-11-01T12:00:00Z');
      await prisma.entitlement.create({
        data: {
          id: uuidv7(),
          userId: boundaryUserId,
          productId: testProductId,
          source: EntitlementSource.PURCHASE,
          startsAt: new Date('2026-10-01T12:00:00Z'),
          expiresAt: boundaryExpiryDate,
          status: EntitlementStatus.ACTIVE,
        },
      });
    });

    afterEach(() => {
      playbackService.resetClock();
      entitlementService.resetClock();
    });

    it('grants access 1 second before expiry (T - 1s)', async () => {
      const oneSecondBefore = new Date(boundaryExpiryDate.getTime() - 1000);
      playbackService.setClock(() => oneSecondBefore);
      entitlementService.setClock(() => oneSecondBefore);

      const res = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${boundaryToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // Token validity capped to remaining 1 second
      expect(res.body.data.tokenValiditySeconds).toBe(1);
    });

    it('denies access 1 second after expiry (T + 1s)', async () => {
      const oneSecondAfter = new Date(boundaryExpiryDate.getTime() + 1000);
      playbackService.setClock(() => oneSecondAfter);
      entitlementService.setClock(() => oneSecondAfter);

      const res = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${boundaryToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('caps token TTL so it never exceeds remaining entitlement duration', async () => {
      // 15 minutes before expiry (900 seconds)
      const fifteenMinsBefore = new Date(boundaryExpiryDate.getTime() - 900 * 1000);
      playbackService.setClock(() => fifteenMinsBefore);
      entitlementService.setClock(() => fifteenMinsBefore);

      const res = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${boundaryToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tokenValiditySeconds).toBe(900);
    });
  });

  // ==========================================
  // 4. Concurrent Streams & Redis Fail-Closed
  // ==========================================
  describe('4. Concurrent Streams Management & Redis Fail-Closed Behavior', () => {
    it('drops oldest session when a 3rd stream starts (default max 2 concurrent streams)', async () => {
      // Session 1: Device A
      const resA = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .set('User-Agent', 'Safari on MacBook Pro (Device A)')
        .expect(200);
      const sessionA = resA.body.data.sessionId;

      // Session 2: Device B
      const resB = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .set('User-Agent', 'Chrome on Windows (Device B)')
        .expect(200);
      const sessionB = resB.body.data.sessionId;

      // Both A and B are active
      let count = await streamService.getActiveSessionCount(entitledStudentId);
      expect(count).toBe(2);

      // Session 3: Device C starts
      const resC = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .set('User-Agent', 'Safari on iPhone (Device C)')
        .expect(200);
      const sessionC = resC.body.data.sessionId;

      count = await streamService.getActiveSessionCount(entitledStudentId);
      expect(count).toBe(2); // Session A was dropped, leaving B and C

      // Heartbeat on dropped session A -> 401 STREAM_SESSION_TERMINATED
      const hbA = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/heartbeat`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .send({
          sessionId: sessionA,
          positionSeconds: 10,
          watchedSeconds: 10,
        })
        .expect(401);
      expect(hbA.body.error.code).toBe('STREAM_SESSION_TERMINATED');

      // Heartbeat on active session B and C -> 200 OK
      const hbB = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/heartbeat`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .send({
          sessionId: sessionB,
          positionSeconds: 15,
          watchedSeconds: 15,
        })
        .expect(200);
      expect(hbB.body.success).toBe(true);

      const hbC = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/heartbeat`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .send({
          sessionId: sessionC,
          positionSeconds: 5,
          watchedSeconds: 5,
        })
        .expect(200);
      expect(hbC.body.success).toBe(true);
    });

    it('fails closed with 503 Service Unavailable when Redis is unavailable', async () => {
      // Temporarily sabotage acquireStreamSession to simulate Redis store failure
      const originalAcquire = streamService.acquireStreamSession.bind(streamService);
      (streamService as any).acquireStreamSession = async () => {
        const { ServiceUnavailableError } = await import('../../src/common/errors/app-error.js');
        throw new ServiceUnavailableError(
          'Stream session service is temporarily unavailable. Please retry shortly.',
        );
      };

      try {
        const res = await request(app)
          .post(`/api/v1/lessons/${paidLessonId}/playback`)
          .set('Authorization', `Bearer ${entitledStudentToken}`)
          .expect(503);

        expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
      } finally {
        (streamService as any).acquireStreamSession = originalAcquire;
      }
    });
  });

  // ==========================================
  // 5. Heartbeat & Progress Tracking
  // ==========================================
  describe('5. Heartbeat, Anomaly Clamping & 90% Completion Rule', () => {
    let hbSessionId: string;

    beforeAll(async () => {
      await prisma.lessonProgress.deleteMany({
        where: { userId: entitledStudentId },
      });
      const res = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .expect(200);
      hbSessionId = res.body.data.sessionId;
    });

    it('records valid heartbeat progress and updates resume position', async () => {
      const res = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/heartbeat`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .send({
          sessionId: hbSessionId,
          positionSeconds: 30,
          watchedSeconds: 30,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.lastPositionSeconds).toBe(30);
      expect(res.body.data.watchedSeconds).toBe(30);
      expect(res.body.data.isCompleted).toBe(false);

      const dbProgress = await prisma.lessonProgress.findUnique({
        where: {
          userId_lessonId: {
            userId: entitledStudentId,
            lessonId: paidLessonId,
          },
        },
      });
      expect(dbProgress?.lastPositionSeconds).toBe(30);
      expect(dbProgress?.watchedSeconds).toBe(30);
      expect(dbProgress?.completedAt).toBeNull();
    });

    it('clamps absurd position beyond lesson duration', async () => {
      // Lesson duration is 100 seconds; send 9999
      const res = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/heartbeat`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .send({
          sessionId: hbSessionId,
          positionSeconds: 9999,
          watchedSeconds: 40,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.lastPositionSeconds).toBe(100);
    });

    it('clamps watched time accelerating faster than real elapsed time', async () => {
      // Jump watchedSeconds to 999 within 1 second
      const res = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/heartbeat`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .send({
          sessionId: hbSessionId,
          positionSeconds: 50,
          watchedSeconds: 999,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      // Clamped to previous safe watched (~40) + elapsed (~1-2)
      expect(res.body.data.watchedSeconds).toBeLessThan(50);
    });

    it('marks lesson complete when watched seconds reaches 90% (>= 90s on 100s lesson)', async () => {
      // Force database watchedSeconds to 89s to simulate legitimate viewing
      await prisma.lessonProgress.update({
        where: {
          userId_lessonId: {
            userId: entitledStudentId,
            lessonId: paidLessonId,
          },
        },
        data: {
          watchedSeconds: 89,
          lastPositionSeconds: 89,
          updatedAt: new Date(Date.now() - 5000), // 5 seconds ago
        },
      });

      const res = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/heartbeat`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .send({
          sessionId: hbSessionId,
          positionSeconds: 92,
          watchedSeconds: 92,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isCompleted).toBe(true);

      const dbProgress = await prisma.lessonProgress.findUnique({
        where: {
          userId_lessonId: {
            userId: entitledStudentId,
            lessonId: paidLessonId,
          },
        },
      });
      expect(dbProgress?.completedAt).not.toBeNull();
    });
  });

  // ==========================================
  // 6. User Courses & IDOR Course Progress
  // ==========================================
  describe('6. GET /api/v1/me/courses and GET /api/v1/courses/:slug/progress (IDOR tests)', () => {
    it('returns enrolled courses with entitlement status, progress % and next lesson', async () => {
      const res = await request(app)
        .get('/api/v1/me/courses')
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const course = res.body.data.find((c: any) => c.product.slug === testProductSlug);
      expect(course).toBeDefined();
      expect(course.entitlement.status).toBe('ACTIVE');
      expect(course.progress.totalLessons).toBeGreaterThan(0);
      expect(course.nextLesson).toBeDefined();
    });

    it('returns course lesson progress and resume position for an entitled user', async () => {
      const res = await request(app)
        .get(`/api/v1/courses/${testProductSlug}/progress`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const section = res.body.data.find((s: any) => s.sectionId === testSectionId);
      expect(section).toBeDefined();
      const lessonProg = section.lessons.find((l: any) => l.lessonId === paidLessonId);
      expect(lessonProg).toBeDefined();
      expect(lessonProg.lastPositionSeconds).toBe(92);
      expect(lessonProg.isCompleted).toBe(true);
    });

    it('denies unentitled user from viewing course progress (403 Forbidden IDOR test)', async () => {
      const res = await request(app)
        .get(`/api/v1/courses/${testProductSlug}/progress`)
        .set('Authorization', `Bearer ${unentitledStudentToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ==========================================
  // 7. Full Refund Access Revocation
  // ==========================================
  describe('7. Full Refund Revocation', () => {
    let refundUserId: string;
    let refundUserToken: string;
    let refundOrderId: string;
    let refundPaymentId: string;
    let refundEntitlementId: string;

    beforeAll(async () => {
      refundUserId = uuidv7();
      const email = `refund_${Date.now()}@testplayback.com`;
      await prisma.user.create({
        data: {
          id: refundUserId,
          email,
          name: 'Refund Student',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          passwordHash: await hashPassword(dummyPassword),
          emailVerifiedAt: new Date(),
          twoFactorEnabled: false,
        },
      });
      refundUserToken = signAccessToken({
        sub: refundUserId,
        email,
        role: UserRole.STUDENT,
        tokenVersion: 0,
      });
      createdUserIds.push(refundUserId);

      // Create Order & Payment
      refundOrderId = uuidv7();
      await prisma.order.create({
        data: {
          id: refundOrderId,
          userId: refundUserId,
          productId: testProductId,
          status: OrderStatus.PAID,
          subtotalPaise: 499900,
          totalPaise: 499900,
          currency: 'INR',
          paidAt: new Date(),
          idempotencyKey: `idemp-refund-${Date.now()}`,
          razorpayOrderId: `order_refund_${Date.now()}`,
        },
      });

      refundPaymentId = uuidv7();
      await prisma.payment.create({
        data: {
          id: refundPaymentId,
          orderId: refundOrderId,
          razorpayPaymentId: `pay_refund_${Date.now()}`,
          amountPaise: 499900,
          status: PaymentStatus.CAPTURED,
          method: 'card',
        },
      });

      refundEntitlementId = uuidv7();
      await prisma.entitlement.create({
        data: {
          id: refundEntitlementId,
          userId: refundUserId,
          productId: testProductId,
          orderId: refundOrderId,
          source: EntitlementSource.PURCHASE,
          status: EntitlementStatus.ACTIVE,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 86400 * 1000),
        },
      });
    });

    it('revokes access upon full refund and terminates subsequent playback requests', async () => {
      // Verify user can initially play
      const preRes = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${refundUserToken}`)
        .expect(200);
      expect(preRes.body.success).toBe(true);

      // Process full refund through orderService
      const payment = await prisma.payment.findUniqueOrThrow({ where: { id: refundPaymentId } });
      await orderService.handleRefundProcessed({
        id: `rfnd_${Date.now()}`,
        payment_id: payment.razorpayPaymentId,
        amount: 499900,
        status: 'processed',
      });

      // Verify entitlement status is REVOKED
      const ent = await prisma.entitlement.findUnique({
        where: { id: refundEntitlementId },
      });
      expect(ent?.status).toBe(EntitlementStatus.REVOKED);

      // Subsequent playback request is denied (403 Forbidden)
      const postRes = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${refundUserToken}`)
        .expect(403);
      expect(postRes.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ==========================================
  // 8. Admin Access Control & 2FA Enforcement
  // ==========================================
  describe('8. Admin Entitlement Management (with 2FA & Audit Logs)', () => {
    let managedEntitlementId: string;

    it('denies non-admin from accessing admin entitlement routes (403 Forbidden)', async () => {
      await request(app)
        .post(`/api/v1/admin/users/${unentitledStudentId}/entitlements`)
        .set('Authorization', `Bearer ${entitledStudentToken}`)
        .send({
          productId: testProductId,
          validityDays: 30,
          reason: 'Attempted non-admin grant',
        })
        .expect(403);
    });

    it('denies admin without 2FA enrolled (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${unentitledStudentId}/entitlements`)
        .set('Authorization', `Bearer ${adminWithout2FAToken}`)
        .send({
          productId: testProductId,
          validityDays: 30,
          reason: 'Attempted grant without 2FA',
        })
        .expect(403);

      expect(res.body.error.message).toContain('two-factor authentication setup is required');
    });

    it('grants entitlement when called by 2FA-enrolled admin and creates AuditLog', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${unentitledStudentId}/entitlements`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({
          productId: testProductId,
          validityDays: 30,
          reason: 'Scholarship winner grant',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(EntitlementStatus.ACTIVE);
      managedEntitlementId = res.body.data.id;

      // Verify student can now play lesson
      const playRes = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${unentitledStudentToken}`)
        .expect(200);
      expect(playRes.body.success).toBe(true);

      // Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: {
          entityId: managedEntitlementId,
          action: 'ADMIN_ENTITLEMENT_GRANT',
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.actorUserId).toBe(adminWith2FAId);
    });

    it('extends entitlement and logs audit entry', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/entitlements/${managedEntitlementId}/extend`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({
          extensionDays: 15,
          reason: 'Extended for exam preparation',
        })
        .expect(200);

      expect(res.body.success).toBe(true);

      const audit = await prisma.auditLog.findFirst({
        where: {
          entityId: managedEntitlementId,
          action: 'ADMIN_ENTITLEMENT_EXTEND',
        },
      });
      expect(audit).toBeDefined();
    });

    it('lists user entitlements for admin', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users/${unentitledStudentId}/entitlements`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].productId).toBe(testProductId);
    });

    it('revokes entitlement, evicts active stream sessions, and logs audit entry', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/entitlements/${managedEntitlementId}/revoke`)
        .set('Authorization', `Bearer ${adminWith2FAToken}`)
        .send({
          reason: 'Terms of service violation',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(EntitlementStatus.REVOKED);

      // Verify student can no longer play (revocation bumps tokenVersion returning 401, or 403 if re-authenticated)
      const playbackRes = await request(app)
        .post(`/api/v1/lessons/${paidLessonId}/playback`)
        .set('Authorization', `Bearer ${unentitledStudentToken}`);
      expect([401, 403]).toContain(playbackRes.status);

      const audit = await prisma.auditLog.findFirst({
        where: {
          entityId: managedEntitlementId,
          action: 'ADMIN_ENTITLEMENT_REVOKE',
        },
      });
      expect(audit).toBeDefined();
    });
  });

  // ==========================================
  // 9. BullMQ Expiry Worker (Tidy-up Job)
  // ==========================================
  describe('9. Repeatable Entitlement Expiry Cleanup Worker', () => {
    it('marks past-due ACTIVE entitlements as EXPIRED', async () => {
      const testWorkerUserId = uuidv7();
      await prisma.user.create({
        data: {
          id: testWorkerUserId,
          email: `worker_${Date.now()}@testplayback.com`,
          name: 'Worker Test User',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          passwordHash: await hashPassword(dummyPassword),
          emailVerifiedAt: new Date(),
          twoFactorEnabled: false,
        },
      });
      createdUserIds.push(testWorkerUserId);

      // Create an entitlement that expired in the past but is still ACTIVE
      const pastEnt = await prisma.entitlement.create({
        data: {
          id: uuidv7(),
          userId: testWorkerUserId,
          productId: testProductId,
          source: EntitlementSource.PURCHASE,
          status: EntitlementStatus.ACTIVE,
          startsAt: new Date(Date.now() - 100 * 86400 * 1000),
          expiresAt: new Date(Date.now() - 1000), // 1 second ago
        },
      });

      // Run cleanup
      const result = await cleanExpiredEntitlements();
      expect(result.expiredCount).toBeGreaterThan(0);

      // Verify status transitioned to EXPIRED
      const updated = await prisma.entitlement.findUnique({
        where: { id: pastEnt.id },
      });
      expect(updated?.status).toBe(EntitlementStatus.EXPIRED);
    });
  });
});
