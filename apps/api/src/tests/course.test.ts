import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../common/db/prisma.js';
import { uuidv7 } from 'uuidv7';
import { hashPassword } from '../common/crypto/argon2.js';
import { signAccessToken } from '../common/crypto/jwt.js';
import { UserRole, UserStatus, ProductStatus, LessonStatus } from '@course/shared';
import { setVideoProviderForTesting, FakeVideoProvider } from '../modules/video/video.service.js';
import { bunnyWebhookController } from '../modules/webhooks/bunny.webhook.js';
import crypto from 'crypto';

describe('Phase 3 Course Management & Bunny Stream Video Pipeline Suite', () => {
  const app = createApp();
  const fakeProvider = new FakeVideoProvider();

  // Test users
  let studentToken = '';
  let unenrolledAdminToken = '';
  let enrolledAdminToken = '';

  let enrolledAdminId = '';
  let unenrolledAdminId = '';
  let studentId = '';

  // Test Course entities
  let testProductId = '';
  let testProductSlug = '';
  let testSectionId = '';
  let testSection2Id = '';
  let freeLessonId = '';
  let paidLessonId = '';
  let paidLessonVideoGuid = '';
  let freeLessonVideoGuid = '';

  beforeAll(async () => {
    // Configure fake video provider for deterministic testing
    setVideoProviderForTesting(fakeProvider);

    const dummyPasswordHash = await hashPassword('SecurePassword#2026!');

    // 1. Create Student User
    studentId = uuidv7();
    await prisma.user.create({
      data: {
        id: studentId,
        email: `student_${Date.now()}@coursetest.com`,
        name: 'Normal Student',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash: dummyPasswordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
      },
    });
    studentToken = signAccessToken({
      sub: studentId,
      email: 'student@coursetest.com',
      role: UserRole.STUDENT,
      tokenVersion: 0,
    });

    // 2. Create Unenrolled Admin User (2FA NOT enabled)
    unenrolledAdminId = uuidv7();
    await prisma.user.create({
      data: {
        id: unenrolledAdminId,
        email: `unenrolled_admin_${Date.now()}@coursetest.com`,
        name: 'Unenrolled Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: dummyPasswordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
      },
    });
    unenrolledAdminToken = signAccessToken({
      sub: unenrolledAdminId,
      email: 'unenrolled@coursetest.com',
      role: UserRole.ADMIN,
      tokenVersion: 0,
    });

    // 3. Create Enrolled Admin User (2FA ENABLED)
    enrolledAdminId = uuidv7();
    await prisma.user.create({
      data: {
        id: enrolledAdminId,
        email: `enrolled_admin_${Date.now()}@coursetest.com`,
        name: 'Enrolled Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: dummyPasswordHash,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: true,
        twoFactorEnrolledAt: new Date(),
      },
    });
    enrolledAdminToken = signAccessToken({
      sub: enrolledAdminId,
      email: 'enrolled@coursetest.com',
      role: UserRole.ADMIN,
      tokenVersion: 0,
    });
  });

  afterAll(async () => {
    // Clean up test database records
    if (testProductId) {
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }
    const cleanupUserIds = [studentId, unenrolledAdminId, enrolledAdminId].filter((id) => Boolean(id));
    if (cleanupUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: { in: cleanupUserIds },
        },
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 1. ADMIN-ONLY & 2FA ACCESS RESTRICTION ENFORCEMENT
  // ---------------------------------------------------------------------------
  describe('Admin Role & 2FA Enforcement on Management Routes', () => {
    it('rejects unauthenticated requests to /api/v1/admin/products with 401', async () => {
      const res = await request(app).get('/api/v1/admin/products');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects student requests to /api/v1/admin/products with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('do not have permission');
    });

    it('rejects unenrolled admin (missing 2FA) with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${unenrolledAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Mandatory two-factor authentication setup is required');
    });

    it('allows 2FA-enrolled admin to access /api/v1/admin/products with 200 OK', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${enrolledAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. PRODUCT, SECTION, AND LESSON CRUD WORKFLOW
  // ---------------------------------------------------------------------------
  describe('Admin Course Content CRUD', () => {
    it('creates a new course product in DRAFT state', async () => {
      testProductSlug = `hydraulics-masterclass-${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send({
          title: 'Industrial Hydraulic Systems & Troubleshooting',
          slug: testProductSlug,
          description:
            'Comprehensive industrial hydraulics engineering masterclass from basic fluid mechanics to electro-hydraulic valves.',
          pricePaise: 1999900,
          compareAtPricePaise: 3999900,
          currency: 'INR',
          validityDays: 365,
          allowRenewals: true,
          renewalWindowDays: 30,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe(testProductSlug);
      expect(res.body.data.status).toBe(ProductStatus.DRAFT);
      testProductId = res.body.data.id;
    });

    it('creates sections within the product', async () => {
      // Section 1
      const res1 = await request(app)
        .post(`/api/v1/admin/products/${testProductId}/sections`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send({
          title: 'Module 1: Hydraulic Fluid Dynamics & Pumps',
        });

      expect(res1.status).toBe(201);
      expect(res1.body.data.position).toBe(1);
      testSectionId = res1.body.data.id;

      // Section 2
      const res2 = await request(app)
        .post(`/api/v1/admin/products/${testProductId}/sections`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send({
          title: 'Module 2: Proportional & Servo Valves',
        });

      expect(res2.status).toBe(201);
      expect(res2.body.data.position).toBe(2);
      testSection2Id = res2.body.data.id;
    });

    it('creates lessons within a section', async () => {
      // Free Preview Lesson
      const resFree = await request(app)
        .post(`/api/v1/admin/sections/${testSectionId}/lessons`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send({
          productId: testProductId,
          title: 'Lesson 1.1: Introduction to Pascal Law & Hydraulic Power',
          description: 'Fundamental principles of pressure and force multiplication.',
          isFreePreview: true,
        });

      expect(resFree.status).toBe(201);
      expect(resFree.body.data.isFreePreview).toBe(true);
      expect(resFree.body.data.position).toBe(1);
      freeLessonId = resFree.body.data.id;

      // Paid Lesson
      const resPaid = await request(app)
        .post(`/api/v1/admin/sections/${testSectionId}/lessons`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send({
          productId: testProductId,
          title: 'Lesson 1.2: Variable Displacement Axial Piston Pumps',
          description: 'Deep dive teardown and swashplate displacement calculation.',
          isFreePreview: false,
        });

      expect(resPaid.status).toBe(201);
      expect(resPaid.body.data.isFreePreview).toBe(false);
      expect(resPaid.body.data.position).toBe(2);
      paidLessonId = resPaid.body.data.id;
    });
  });

  // ---------------------------------------------------------------------------
  // 3. REORDERING LOGIC
  // ---------------------------------------------------------------------------
  describe('Course Sections and Lessons Reordering Logic', () => {
    it('reorders sections sequentially and updates database positions', async () => {
      // Reverse sections order: [testSection2Id, testSectionId]
      const res = await request(app)
        .post(`/api/v1/admin/products/${testProductId}/sections/reorder`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send({
          orderedIds: [testSection2Id, testSectionId],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const s2 = res.body.data.find((s: any) => s.id === testSection2Id);
      const s1 = res.body.data.find((s: any) => s.id === testSectionId);
      expect(s2.position).toBe(1);
      expect(s1.position).toBe(2);

      // Revert back to original order
      await request(app)
        .post(`/api/v1/admin/products/${testProductId}/sections/reorder`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send({
          orderedIds: [testSectionId, testSection2Id],
        });
    });

    it('rejects reorder with foreign or non-existent section ID with 400', async () => {
      const foreignId = uuidv7();
      const res = await request(app)
        .post(`/api/v1/admin/products/${testProductId}/sections/reorder`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send({
          orderedIds: [testSectionId, foreignId],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('does not belong to product');
    });

    it('reorders lessons within a section', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/sections/${testSectionId}/lessons/reorder`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send({
          orderedIds: [paidLessonId, freeLessonId],
        });

      expect(res.status).toBe(200);
      const lPaid = res.body.data.find((l: any) => l.id === paidLessonId);
      const lFree = res.body.data.find((l: any) => l.id === freeLessonId);
      expect(lPaid.position).toBe(1);
      expect(lFree.position).toBe(2);

      // Put free lesson back first
      await request(app)
        .post(`/api/v1/admin/sections/${testSectionId}/lessons/reorder`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send({
          orderedIds: [freeLessonId, paidLessonId],
        });
    });
  });

  // ---------------------------------------------------------------------------
  // 4. DIRECT TUS UPLOAD TICKET GENERATION & BUNNY STREAM SIGNATURE FORMULA
  // ---------------------------------------------------------------------------
  describe('Bunny Stream Direct Browser Upload Ticket Generation', () => {
    it('generates a direct TUS upload authorization ticket without routing video file through Express', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/lessons/${paidLessonId}/upload-ticket`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const ticket = res.body.data;
      expect(ticket.uploadUrl).toBe('https://video.bunnycdn.com/tusupload');
      expect(ticket.libraryId).toBeDefined();
      expect(ticket.videoId).toBeDefined();
      expect(ticket.authorizationSignature).toHaveLength(64); // SHA-256 hex string
      expect(ticket.authorizationExpire).toBeGreaterThan(Math.floor(Date.now() / 1000));

      paidLessonVideoGuid = ticket.videoId;

      // Verify that lesson in database now has the video provider ID attached and status is PROCESSING
      const updatedLesson = await prisma.lesson.findUnique({ where: { id: paidLessonId } });
      expect(updatedLesson?.videoProviderId).toBe(paidLessonVideoGuid);
      expect(updatedLesson?.status).toBe(LessonStatus.PROCESSING);
    });

    it('generates an upload ticket for free preview lesson as well', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/lessons/${freeLessonId}/upload-ticket`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send();

      expect(res.status).toBe(200);
      freeLessonVideoGuid = res.body.data.videoId;
      expect(freeLessonVideoGuid).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. STATUS TRANSITIONS & BUNNY WEBHOOK VERIFICATION (HMAC-SHA256)
  // ---------------------------------------------------------------------------
  describe('Bunny Webhook Verification & Video Status Transitions', () => {
    it('rejects webhook with missing or invalid HMAC signature with 401 Unauthorized', async () => {
      const payload = {
        VideoLibraryId: 12345,
        VideoGuid: paidLessonVideoGuid,
        Status: 3,
      };

      const res = await request(app)
        .post('/api/v1/webhooks/bunny')
        .set('x-bunnystream-signature', 'invalid_hex_signature_3234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid webhook signature');
    });

    it('processes valid webhook: transitions video from PROCESSING to READY and updates duration', async () => {
      // Pre-set video details in fake provider to simulate Bunny finishing encoding (14 minutes = 840s)
      fakeProvider.setVideoStatus(paidLessonVideoGuid, 'READY', 840);

      const payload = {
        VideoLibraryId: 12345,
        VideoGuid: paidLessonVideoGuid,
        Status: 3, // Status 3 = Finished
      };

      const rawPayload = JSON.stringify(payload);
      const signature = fakeProvider.signWebhookPayload(rawPayload);

      const res = await request(app)
        .post('/api/v1/webhooks/bunny')
        .set('Content-Type', 'application/json')
        .set('x-bunnystream-signature', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(3);

      // Verify database lesson is now READY with duration 840s
      const readyLesson = await prisma.lesson.findUnique({ where: { id: paidLessonId } });
      expect(readyLesson?.status).toBe(LessonStatus.READY);
      expect(readyLesson?.durationSeconds).toBe(840);
    });

    it('handles duplicate webhook event idempotently without re-processing', async () => {
      const payload = {
        VideoLibraryId: 12345,
        VideoGuid: paidLessonVideoGuid,
        Status: 3, // Same payload as previous test
      };

      const rawPayload = JSON.stringify(payload);
      const signature = fakeProvider.signWebhookPayload(rawPayload);

      const res = await request(app)
        .post('/api/v1/webhooks/bunny')
        .set('Content-Type', 'application/json')
        .set('x-bunnystream-signature', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('already processed');
    });

    it('transitions video status to FAILED when receiving status 5 error webhook', async () => {
      const failedLessonRes = await request(app)
        .post(`/api/v1/admin/sections/${testSectionId}/lessons`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send({
          productId: testProductId,
          title: 'Lesson 1.3: Corrupted Upload Test',
        });

      const failedLessonId = failedLessonRes.body.data.id;
      const ticketRes = await request(app)
        .post(`/api/v1/admin/lessons/${failedLessonId}/upload-ticket`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`)
        .send();

      const failedVideoGuid = ticketRes.body.data.videoId;

      const payload = {
        VideoLibraryId: 12345,
        VideoGuid: failedVideoGuid,
        Status: 5, // Status 5 = Failed
      };

      const rawPayload = JSON.stringify(payload);
      const signature = fakeProvider.signWebhookPayload(rawPayload);

      const res = await request(app)
        .post('/api/v1/webhooks/bunny')
        .set('Content-Type', 'application/json')
        .set('x-bunnystream-signature', signature)
        .send(payload);

      expect(res.status).toBe(200);

      const failedLesson = await prisma.lesson.findUnique({ where: { id: failedLessonId } });
      expect(failedLesson?.status).toBe(LessonStatus.FAILED);

      // Clean up failed lesson
      await prisma.lesson.delete({ where: { id: failedLessonId } });
    });

    it('verifies polling fallback worker syncs pending processing lessons', async () => {
      // Free preview lesson is currently in PROCESSING in DB
      fakeProvider.setVideoStatus(freeLessonVideoGuid, 'READY', 450);

      const result = await bunnyWebhookController.syncProcessingVideos();
      expect(result.checked).toBeGreaterThanOrEqual(1);
      expect(result.updated).toBeGreaterThanOrEqual(1);

      const syncedLesson = await prisma.lesson.findUnique({ where: { id: freeLessonId } });
      expect(syncedLesson?.status).toBe(LessonStatus.READY);
      expect(syncedLesson?.durationSeconds).toBe(450);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. ZERO-LEAKAGE PUBLIC COURSE CATALOG VERIFICATION
  // ---------------------------------------------------------------------------
  describe('Zero-Leakage Public Course Catalog', () => {
    it('does not show draft products in public catalog', async () => {
      const res = await request(app).get('/api/v1/courses');
      expect(res.status).toBe(200);

      const found = res.body.data.find((c: any) => c.slug === testProductSlug);
      expect(found).toBeUndefined(); // Still DRAFT
    });

    it('publishes course product via admin publish endpoint', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/products/${testProductId}/publish`)
        .set('Authorization', `Bearer ${enrolledAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ProductStatus.PUBLISHED);
    });

    it('shows published product in public catalog with correct aggregated lesson counts', async () => {
      const res = await request(app).get('/api/v1/courses');
      expect(res.status).toBe(200);

      const found = res.body.data.find((c: any) => c.slug === testProductSlug);
      expect(found).toBeDefined();
      expect(found.title).toContain('Industrial Hydraulic Systems');
      expect(found.totalLessons).toBe(2);
      expect(found.totalDurationSeconds).toBe(840 + 450); // 1290s
    });

    it('CRITICAL ZERO-LEAKAGE: ensures public curriculum never leaks paid video IDs, URLs, or library IDs', async () => {
      const res = await request(app).get(`/api/v1/courses/${testProductSlug}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const course = res.body.data;
      expect(course.sections).toHaveLength(2);

      const section1 = course.sections.find((s: any) => s.id === testSectionId);
      expect(section1).toBeDefined();
      expect(section1.lessons).toHaveLength(2);

      const freeLesson = section1.lessons.find((l: any) => l.id === freeLessonId);
      const paidLesson = section1.lessons.find((l: any) => l.id === paidLessonId);

      // 1. Free lesson validation
      expect(freeLesson.isFreePreview).toBe(true);
      expect(freeLesson.freePreviewEmbedUrl).toBeDefined();
      expect(freeLesson.freePreviewEmbedUrl).toContain('https://player.mediadelivery.net/embed/');

      // 2. Paid lesson validation: MUST NOT CONTAIN ANY VIDEO IDENTIFIERS
      expect(paidLesson.isFreePreview).toBe(false);
      expect(paidLesson.videoProviderId).toBeUndefined();
      expect(paidLesson.bunnyVideoId).toBeUndefined();
      expect(paidLesson.libraryId).toBeUndefined();
      expect(paidLesson.uploadUrl).toBeUndefined();
      expect(paidLesson.freePreviewEmbedUrl).toBeUndefined();

      // 3. Exhaustive Deep Scan: serialize paid lesson to string and verify no video IDs, URLs, or library IDs appear
      const paidLessonJsonString = JSON.stringify(paidLesson);
      expect(paidLessonJsonString).not.toContain(paidLessonVideoGuid);
      expect(paidLessonJsonString).not.toContain('fake-lib-12345');
      expect(paidLessonJsonString).not.toContain('mediadelivery.net');

      // Also verify that the full response string never leaks the paid video GUID anywhere
      const responseJsonString = JSON.stringify(res.body);
      expect(responseJsonString).not.toContain(paidLessonVideoGuid);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. OPENAPI SPEC & /DOCS ENDPOINT
  // ---------------------------------------------------------------------------
  describe('OpenAPI Documentation Endpoint (/docs)', () => {
    it('serves OpenAPI 3.0.3 specification JSON at /docs/openapi.json', async () => {
      const res = await request(app).get('/docs/openapi.json');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.info.title).toContain('Hydraulic Engineering Academy API');
      expect(res.body.paths['/courses/{slug}']).toBeDefined();
      expect(res.body.paths['/admin/lessons/{id}/upload-ticket']).toBeDefined();
      expect(res.body.paths['/webhooks/bunny']).toBeDefined();
    });

    it('serves interactive Swagger UI HTML at /docs', async () => {
      const res = await request(app).get('/docs');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('SwaggerUIBundle');
      expect(res.text).toContain('/docs/openapi.json');
    });
  });
});
