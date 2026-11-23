import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../common/db/prisma.js';
import { uuidv7 } from 'uuidv7';
import { hashPassword } from '../common/crypto/argon2.js';
import { signAccessToken } from '../common/crypto/jwt.js';
import { UserRole, UserStatus, ProductStatus, LessonStatus } from '@course/shared';
import { authService } from '../modules/auth/auth.service.js';
import { redisClient } from '../common/redis/redis.js';

describe('Interactions (Likes & Comments) Test Suite', () => {
  const app = createApp();

  let studentId = '';
  let studentToken = '';
  let student2Id = '';
  let student2Token = '';
  let adminId = '';
  let adminToken = '';

  let productId = '';
  let sectionId = '';
  let lessonId = '';

  beforeAll(async () => {
    vi.spyOn(redisClient, 'get').mockResolvedValue(null);
    vi.spyOn(redisClient, 'set').mockResolvedValue('OK');
    vi.spyOn(redisClient, 'del').mockResolvedValue(1);
    try {
      const dummyPasswordHash = await hashPassword('SecurePassword#2026!');

      studentId = uuidv7();
      await prisma.user.create({
        data: {
          id: studentId,
          email: `student_likes_${Date.now()}@test.com`,
          name: 'Test Student',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          passwordHash: dummyPasswordHash,
          tokenVersion: 0,
        },
      });
      studentToken = signAccessToken({
        sub: studentId,
        email: 'student@test.com',
        role: UserRole.STUDENT,
        tokenVersion: 0,
      });

      student2Id = uuidv7();
      await prisma.user.create({
        data: {
          id: student2Id,
          email: `student2_likes_${Date.now()}@test.com`,
          name: 'Second Student',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          passwordHash: dummyPasswordHash,
          tokenVersion: 0,
        },
      });
      student2Token = signAccessToken({
        sub: student2Id,
        email: 'student2@test.com',
        role: UserRole.STUDENT,
        tokenVersion: 0,
      });

      adminId = uuidv7();
      await prisma.user.create({
        data: {
          id: adminId,
          email: `admin_likes_${Date.now()}@test.com`,
          name: 'Instructor Admin',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          twoFactorEnabled: true,
          passwordHash: dummyPasswordHash,
          tokenVersion: 0,
        },
      });
      adminToken = signAccessToken({
        sub: adminId,
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        tokenVersion: 0,
      });

      // Create course, section, and lesson
      productId = uuidv7();
      await prisma.product.create({
        data: {
          id: productId,
          title: 'Hydraulics Course for Interactions',
          description: 'A test description for hydraulics course',
          slug: `hydraulics-interactions-${Date.now()}`,
          status: ProductStatus.PUBLISHED,
          pricePaise: 1000,
        },
      });

      sectionId = uuidv7();
      await prisma.section.create({
        data: {
          id: sectionId,
          productId,
          title: 'Section 1',
          position: 1,
        },
      });

      lessonId = uuidv7();
      await prisma.lesson.create({
        data: {
          id: lessonId,
          sectionId,
          productId,
          title: 'Gear Pump Basics',
          position: 1,
          status: LessonStatus.READY,
          isPublished: true,
        },
      });
    } catch (err) {
      console.error('ERROR in beforeAll:', err);
      throw err;
    }
  });

  beforeEach(() => {
    if (adminId) {
      authService.recordAdminActivity(adminId);
    }
  });

  afterAll(async () => {
    // Cleanup in order
    if (lessonId) {
      await prisma.lessonLike.deleteMany({ where: { lessonId } });
      await prisma.lessonComment.deleteMany({ where: { lessonId } });
      await prisma.lesson.deleteMany({ where: { id: lessonId } });
    }
    if (sectionId) {
      await prisma.section.deleteMany({ where: { id: sectionId } });
    }
    if (productId) {
      await prisma.product.deleteMany({ where: { id: productId } });
    }
    const userIds = [studentId, student2Id, adminId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  it('1. GET /api/v1/lessons/:id/likes returns 0 likes initially', async () => {
    const res = await request(app)
      .get(`/api/v1/lessons/${lessonId}/likes`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.likeCount).toBe(0);
    expect(res.body.data.hasLiked).toBe(false);
  });

  it('2. POST /api/v1/lessons/:id/like toggles like on and off', async () => {
    // First click: likes the lesson
    const res1 = await request(app)
      .post(`/api/v1/lessons/${lessonId}/like`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res1.status).toBe(200);
    expect(res1.body.data.likeCount).toBe(1);
    expect(res1.body.data.hasLiked).toBe(true);

    // Second click: unlikes the lesson
    const res2 = await request(app)
      .post(`/api/v1/lessons/${lessonId}/like`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.data.likeCount).toBe(0);
    expect(res2.body.data.hasLiked).toBe(false);
  });

  it('3. POST /api/v1/lessons/:id/comments allows student to post a comment', async () => {
    const res = await request(app)
      .post(`/api/v1/lessons/${lessonId}/comments`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ content: 'Why is the pressure relief valve placed before the directional valve?' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe(
      'Why is the pressure relief valve placed before the directional valve?',
    );
    expect(res.body.data.user.name).toBe('Test Student');
    expect(res.body.data.parentId).toBeNull();
  });

  it('4. Student can reply to a comment (cross-commenting enabled)', async () => {
    // Get existing comment
    const listRes = await request(app).get(`/api/v1/lessons/${lessonId}/comments`);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    const parentId = listRes.body.data[0].id;

    // Student 2 replies to Student 1's comment
    const res = await request(app)
      .post(`/api/v1/lessons/${lessonId}/comments`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ content: 'I have the same question!', parentId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.parentId).toBe(parentId);
    expect(res.body.data.user.role).toBe('STUDENT');
  });

  it('5. Admin CAN reply to a comment (showing Instructor role)', async () => {
    const listRes = await request(app).get(`/api/v1/lessons/${lessonId}/comments`);
    const parentId = listRes.body.data[0].id;

    const res = await request(app)
      .post(`/api/v1/admin/comments/${parentId}/reply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        content: 'Great question! The relief valve protects the pump from pressure spikes.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.parentId).toBe(parentId);
    expect(res.body.data.user.role).toBe('ADMIN');

    // Verify when fetching comments, reply is nested
    const updatedList = await request(app).get(`/api/v1/lessons/${lessonId}/comments`);
    expect(updatedList.body.data[0].replies.length).toBe(2);
    expect(updatedList.body.data[0].replies[0].content).toContain('protects the pump');
  }, 15000);

  it('6. Student can delete their own comment, but not others', async () => {
    // Post new comment by student 2
    const postRes = await request(app)
      .post(`/api/v1/lessons/${lessonId}/comments`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ content: 'This is my temporary question.' });

    const commentId = postRes.body.data.id;

    // Student 1 tries to delete it -> 403 Forbidden
    const forbiddenRes = await request(app)
      .delete(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(forbiddenRes.status).toBe(403);

    // Student 2 deletes their own -> 200 OK
    const deleteRes = await request(app)
      .delete(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${student2Token}`);
    expect(deleteRes.status).toBe(200);
  }, 15000);

  it('7. Admin comments list endpoint works', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/comments?lessonId=${lessonId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThan(0);
    expect(res.body.data.comments[0].lesson.title).toBe('Gear Pump Basics');
  }, 15000);
});
