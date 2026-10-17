import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../common/db/prisma.js';
import * as dbModule from '../common/db/prisma.js';
import { redisClient } from '../common/redis/redis.js';
import * as redisModule from '../common/redis/redis.js';
import { uuidv7 } from 'uuidv7';
import { hashPassword } from '../common/crypto/argon2.js';
import { signAccessToken } from '../common/crypto/jwt.js';
import {
  UserRole,
  UserStatus,
  ProductStatus,
  LessonStatus,
  EntitlementStatus,
} from '@course/shared';
import { setVideoProviderForTesting, FakeVideoProvider } from '../modules/video/video.service.js';
import { setPaymentGateway } from '../modules/payments/payment.service.js';
import { FakePaymentGateway } from '../modules/payments/fake-payment.gateway.js';
import { createRateLimiter } from '../common/middleware/rate-limiter.js';
import { streamService } from '../modules/video/stream.service.js';
import express from 'express';
import { errorHandler } from '../common/middleware/error-handler.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';

describe('Phase 9 Failure Modes and Graceful Degradation Suite', () => {
  const app = createApp();
  let fakeVideoProvider: FakeVideoProvider;
  let fakePaymentGateway: FakePaymentGateway;

  let testStudentId: string;
  let testStudentToken: string;
  let testAdminId: string;
  let testAdminToken: string;
  let testProductId: string;
  let testLessonId: string;

  beforeAll(async () => {
    fakeVideoProvider = new FakeVideoProvider();
    setVideoProviderForTesting(fakeVideoProvider);
    fakePaymentGateway = new FakePaymentGateway();
    setPaymentGateway(fakePaymentGateway);

    const passwordHash = await hashPassword('FailureModeSecure#2026');

    // 1. Seed Student User
    testStudentId = uuidv7();
    const studentEmail = `failure_student_${Date.now()}@test.com`;
    await prisma.user.create({
      data: {
        id: testStudentId,
        email: studentEmail,
        name: 'Failure Test Student',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
      },
    });

    testStudentToken = signAccessToken({
      sub: testStudentId,
      email: studentEmail,
      role: UserRole.STUDENT,
      tokenVersion: 0,
    });

    // 2. Seed Admin User
    testAdminId = uuidv7();
    const adminEmail = `failure_admin_${Date.now()}@test.com`;
    await prisma.user.create({
      data: {
        id: testAdminId,
        email: adminEmail,
        name: 'Failure Test Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: true,
        twoFactorEnrolledAt: new Date(),
      },
    });

    testAdminToken = signAccessToken({
      sub: testAdminId,
      email: adminEmail,
      role: UserRole.ADMIN,
      tokenVersion: 0,
    });

    // 3. Seed Course Product & Section & Ready Lesson
    testProductId = uuidv7();
    await prisma.product.create({
      data: {
        id: testProductId,
        slug: `fail-course-${Date.now()}`,
        title: 'Failure Mode Course',
        description: 'Test resilience against downstream failures',
        pricePaise: 499900,
        currency: 'INR',
        status: ProductStatus.PUBLISHED,
        validityDays: 365,
      },
    });

    const testSection = await prisma.section.create({
      data: {
        id: uuidv7(),
        productId: testProductId,
        title: 'Core Module',
        position: 1,
      },
    });

    testLessonId = uuidv7();
    await prisma.lesson.create({
      data: {
        id: testLessonId,
        sectionId: testSection.id,
        productId: testProductId,
        title: 'Degradation Lesson',
        position: 1,
        durationSeconds: 600,
        isFreePreview: false,
        isPublished: true,
        status: LessonStatus.READY,
        videoProviderId: 'video_fail_test_123',
      },
    });

    // 4. Grant Entitlement to Student
    await prisma.entitlement.create({
      data: {
        id: uuidv7(),
        userId: testStudentId,
        productId: testProductId,
        status: EntitlementStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86400000 * 30),
      },
    });
  });

  afterAll(async () => {
    // Cleanup seeded records
    await prisma.lessonProgress.deleteMany({ where: { userId: testStudentId } });
    await prisma.entitlement.deleteMany({ where: { userId: testStudentId } });
    await prisma.lesson.deleteMany({ where: { productId: testProductId } });
    await prisma.section.deleteMany({ where: { productId: testProductId } });
    await prisma.order.deleteMany({ where: { userId: testStudentId } });
    await prisma.product.deleteMany({ where: { id: testProductId } });
    await prisma.user.deleteMany({ where: { id: { in: [testStudentId, testAdminId] } } });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Redis Down Failure Mode', () => {
    it('playback fails closed with 503 when Redis stream session acquisition is unreachable', async () => {
      // Mock Redis failure on stream session check
      vi.spyOn(redisClient, 'hgetall').mockRejectedValue(
        new Error('ECONNREFUSED: Connection to Redis 6380 refused'),
      );

      const res = await request(app)
        .post(`/api/v1/lessons/${testLessonId}/playback`)
        .set('Authorization', `Bearer ${testStudentToken}`);

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(res.body.error.message).toContain(
        'Stream session validation service is currently unavailable',
      );
    });

    it('playback heartbeat fails closed with 503 when Redis is down', async () => {
      vi.spyOn(redisClient, 'hget').mockRejectedValue(
        new Error('ECONNRESET: Redis connection lost'),
      );

      const res = await request(app)
        .post(`/api/v1/lessons/${testLessonId}/heartbeat`)
        .set('Authorization', `Bearer ${testStudentToken}`)
        .send({
          sessionId: uuidv7(),
          positionSeconds: 45,
          watchedSeconds: 45,
        });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('sensitive rate limiter fails closed with 503 on Redis store failure', async () => {
      const testApp = express();
      const sensitiveLimiter = createRateLimiter({
        points: 5,
        duration: 60,
        keyPrefix: 'test_sensitive',
        isSensitive: true,
      });

      testApp.post('/api/sensitive-action', sensitiveLimiter, (_req, res) => {
        res.json({ success: true });
      });
      testApp.use(errorHandler);

      // Simulate rate limiter store failure by rejecting consume
      vi.spyOn(RateLimiterMemory.prototype, 'consume').mockRejectedValue(
        new Error('REDIS_STORE_FAILURE: Cluster unreachable'),
      );

      const res = await request(testApp).post('/api/sensitive-action');
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(res.body.error.message).toContain(
        'Security rate-limit verification service unavailable',
      );
    });
  });

  describe('2. Database Slow or Unavailable Failure Mode', () => {
    it('/readyz health probe fails with 503 when database is unavailable', async () => {
      vi.spyOn(dbModule, 'checkDatabaseHealth').mockResolvedValue(false);
      vi.spyOn(redisModule, 'checkRedisHealth').mockResolvedValue(true);

      const res = await request(app).get('/readyz');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.data.ready).toBe(false);
      expect(res.body.data.checks.database.status).toBe('down');
      expect(res.body.data.checks.redis.status).toBe('up');
    });

    it('prevents partial grants when database error interrupts transaction midway', async () => {
      const idempotencyKey = uuidv7();

      // Spy on prisma.$transaction to simulate DB failure midway
      const originalTx = prisma.$transaction.bind(prisma);
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return originalTx(async (tx: any) => {
          vi.spyOn(tx.order, 'create').mockImplementation(() => {
            throw new Error('Database transaction timeout / constraint failure');
          });
          return callback(tx);
        });
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${testStudentToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          productId: testProductId,
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);

      // Verify no order was committed
      const committedOrder = await prisma.order.findUnique({
        where: { idempotencyKey },
      });
      expect(committedOrder).toBeNull();
    });
  });

  describe('3. Payment Gateway Timeout Failure Mode', () => {
    it('order creation rolls back cleanly when payment gateway times out', async () => {
      const idempotencyKey = uuidv7();

      // Mock gateway timeout
      vi.spyOn(fakePaymentGateway, 'createOrder').mockRejectedValue(
        new Error('Payment gateway socket timeout after 10000ms'),
      );

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${testStudentToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          productId: testProductId,
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);

      // Verify transaction rolled back: no order exists in DB with this idempotency key
      const abortedOrder = await prisma.order.findUnique({
        where: { idempotencyKey },
      });
      expect(abortedOrder).toBeNull();
    });
  });

  describe('4. Video Provider Outage Failure Mode', () => {
    it('upload-ticket request degrades gracefully with 500 when video provider is down', async () => {
      vi.spyOn(fakeVideoProvider, 'generateUploadTicket').mockRejectedValue(
        new Error('Bunny Stream API 502 Bad Gateway: Upstream provider down'),
      );

      const res = await request(app)
        .post(`/api/v1/admin/lessons/${testLessonId}/upload-ticket`)
        .set('Authorization', `Bearer ${testAdminToken}`)
        .set('X-Admin-2FA', 'verified');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('playback token request degrades gracefully when video provider signing fails', async () => {
      vi.spyOn(fakeVideoProvider, 'generatePlaybackToken').mockRejectedValue(
        new Error('Bunny Stream Token Signing Service Unavailable'),
      );

      const res = await request(app)
        .post(`/api/v1/lessons/${testLessonId}/playback`)
        .set('Authorization', `Bearer ${testStudentToken}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
