import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../common/db/prisma.js';
import { redisClient } from '../common/redis/redis.js';
import { uuidv7 } from 'uuidv7';
import { hashPassword } from '../common/crypto/argon2.js';
import { generateRandomToken, hashToken, decryptData } from '../common/crypto/tokens.js';
import { generate as generateTOTP } from 'otplib';
import { env } from '../config/env.js';
import { lockoutService } from '../common/middleware/lockout.js';
import { UserRole, UserStatus } from '@course/shared';

describe('Phase 2 Authentication and Session Integration Suite', () => {
  const app = createApp();

  const testStudentEmail = `student_${Date.now()}@testcourse.com`;
  const testStudentPassword = 'SecurePassword123!@#';
  let studentAccessToken = '';
  let studentRefreshTokenCookie = '';
  let studentId = '';

  const testAdminEmail = `admin_${Date.now()}@testcourse.com`;
  const testAdminPassword = 'AdminPassword123!@#';
  let adminAccessToken = '';
  let adminId = '';

  beforeAll(async () => {
    // Clean up test data if any
    await prisma.user.deleteMany({
      where: {
        email: { in: [testStudentEmail, testAdminEmail] },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: { in: [testStudentEmail, testAdminEmail] },
      },
    });
  });

  // ---------------------------------------------------------------------------
  // 1. REGISTRATION & EMAIL VERIFICATION
  // ---------------------------------------------------------------------------
  it('registers a new student with argon2id password and generates verification token', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: testStudentEmail,
      password: testStudentPassword,
      name: 'Test Student',
      phone: '+919876543210',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testStudentEmail.toLowerCase());
    expect(res.body.data.user.role).toBe(UserRole.STUDENT);

    studentId = res.body.data.user.id;

    // Verify user in real PostgreSQL
    const dbUser = await prisma.user.findUnique({
      where: { id: studentId },
    });
    expect(dbUser).toBeDefined();
    expect(dbUser?.emailVerifiedAt).toBeNull();
    expect(dbUser?.passwordHash).toMatch(/^\$argon2id\$/);

    // Verify token was stored hashed in EmailVerificationToken table
    const tokenRecord = await prisma.emailVerificationToken.findFirst({
      where: { userId: studentId },
    });
    expect(tokenRecord).toBeDefined();
    expect(tokenRecord?.usedAt).toBeNull();
  });

  it('rejects registration with duplicate email address with 409 Conflict', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: testStudentEmail,
      password: testStudentPassword,
      name: 'Duplicate Student',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('verifies email using verification token', async () => {
    // Generate a known token in database
    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);

    await prisma.emailVerificationToken.create({
      data: {
        id: uuidv7(),
        userId: studentId,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: rawToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedUser = await prisma.user.findUnique({ where: { id: studentId } });
    expect(updatedUser?.emailVerifiedAt).not.toBeNull();
  });

  it('rejects email verification with already used token', async () => {
    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);

    await prisma.emailVerificationToken.create({
      data: {
        id: uuidv7(),
        userId: studentId,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: new Date(),
      },
    });

    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: rawToken });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('invalid or has expired');
  });

  it('rejects email verification with expired token', async () => {
    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);

    await prisma.emailVerificationToken.create({
      data: {
        id: uuidv7(),
        userId: studentId,
        tokenHash,
        expiresAt: new Date(Date.now() - 1000), // expired
      },
    });

    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: rawToken });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 2. LOGIN, TIMING PROTECTION, AND COOKIE FLAGS
  // ---------------------------------------------------------------------------
  it('returns generic error on non-existent email (zero user enumeration)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nonexistent_account@domain.com',
      password: 'AnyPassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('returns generic error on wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testStudentEmail,
      password: 'WrongPassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('logs in student successfully and verifies cookie flags (httpOnly, SameSite=Lax)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testStudentEmail,
      password: testStudentPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(testStudentEmail.toLowerCase());

    studentAccessToken = res.body.data.accessToken;

    // Verify Set-Cookie header contains HttpOnly and SameSite=Lax
    const cookies = res.headers['set-cookie'] as string[] | undefined;
    expect(cookies).toBeDefined();
    const refreshCookie = cookies?.find((c: string) => c.startsWith('refresh_token='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/HttpOnly/i);
    expect(refreshCookie).toMatch(/SameSite=Lax/i);
    expect(refreshCookie).toMatch(/Path=\//i);

    studentRefreshTokenCookie = refreshCookie!.split(';')[0]!;
  });

  // ---------------------------------------------------------------------------
  // 3. REFRESH TOKEN ROTATION & REPLAY REUSE DETECTION
  // ---------------------------------------------------------------------------
  it('rotates refresh token and issues a new access token on POST /refresh', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', studentRefreshTokenCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();

    // Old studentRefreshTokenCookie should now be revoked in the database
    const oldRawToken = studentRefreshTokenCookie.replace('refresh_token=', '');
    const oldTokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(oldRawToken) },
    });
    expect(oldTokenRecord?.revokedAt).not.toBeNull();

    // Capture the newly rotated cookie
    const cookies = res.headers['set-cookie'] as string[];
    const newRefreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
    expect(newRefreshCookie).toBeDefined();

    studentAccessToken = res.body.data.accessToken;

    // -------------------------------------------------------------------------
    // CRITICAL SECURITY TEST: REPLAY REUSE ATTACK
    // Replaying the old already-revoked refresh token must trigger family revocation!
    // -------------------------------------------------------------------------
    const replayRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', studentRefreshTokenCookie); // Replaying OLD token!

    expect(replayRes.status).toBe(401);
    expect(replayRes.body.error.message).toContain('Session revoked due to detected token reuse');

    // Verify that the NEW token from the same family is now ALSO revoked!
    const newRawToken = newRefreshCookie!.split(';')[0]!.replace('refresh_token=', '');
    const newTokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(newRawToken) },
    });
    expect(newTokenRecord?.revokedAt).not.toBeNull();

    // Any subsequent call with the new token must also be rejected
    const blockedRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', newRefreshCookie!.split(';')[0]!);

    expect(blockedRes.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // 4. BRUTE-FORCE LOCKOUT
  // ---------------------------------------------------------------------------
  it('locks out account after 5 consecutive failed login attempts', async () => {
    const victimEmail = `victim_${Date.now()}@test.com`;
    const passwordHash = await hashPassword('CorrectPassword123!');
    await prisma.user.create({
      data: {
        id: uuidv7(),
        email: victimEmail,
        name: 'Victim User',
        passwordHash,
      },
    });

    // 5 consecutive wrong password attempts
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: victimEmail, password: 'WrongPassword!' });
      expect(res.status).toBe(401);
    }

    // 6th attempt should be blocked by RateLimitError (429)
    const lockedRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: victimEmail, password: 'CorrectPassword123!' });

    expect(lockedRes.status).toBe(429);
    expect(lockedRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');

    // Clean up lockout state so subsequent test cases on 127.0.0.1 are unaffected
    await lockoutService.clearFailedAttempts('127.0.0.1');
    await lockoutService.clearFailedAttempts(victimEmail);
  });

  // ---------------------------------------------------------------------------
  // 5. SESSION MANAGEMENT & IDOR PROTECTION
  // ---------------------------------------------------------------------------
  it('protects session revocation against IDOR (User B cannot revoke User A session)', async () => {
    // Log User A in fresh
    const loginARes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testStudentEmail, password: testStudentPassword });

    const tokenA = loginARes.body.data.accessToken;
    const cookieA = (loginARes.headers['set-cookie'] as string[])
      .find((c: string) => c.startsWith('refresh_token='))!
      .split(';')[0]!;

    // Get User A's session ID
    const listRes = await request(app)
      .get('/api/v1/sessions')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Cookie', cookieA);

    expect(listRes.status).toBe(200);
    const userASessionId = listRes.body.data.sessions[0].id;
    expect(userASessionId).toBeDefined();

    // Create User B
    const userBEmail = `userb_${Date.now()}@test.com`;
    const userBPassword = 'Password123!@#';
    await request(app).post('/api/v1/auth/register').send({
      email: userBEmail,
      password: userBPassword,
      name: 'User B',
    });

    const loginBRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userBEmail, password: userBPassword });
    const tokenB = loginBRes.body.data.accessToken;

    // IDOR ATTEMPT: User B attempts to revoke User A's session
    const idorRes = await request(app)
      .delete(`/api/v1/sessions/${userASessionId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(idorRes.status).toBe(403);
    expect(idorRes.body.error.code).toBe('FORBIDDEN');
    expect(idorRes.body.error.message).toContain('not have permission');

    // User A revokes own session -> succeeds
    const legitRevokeRes = await request(app)
      .delete(`/api/v1/sessions/${userASessionId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(legitRevokeRes.status).toBe(200);
  });

  // ---------------------------------------------------------------------------
  // 6. LOGOUT-ALL AND TOKEN VERSION INVALIDATION
  // ---------------------------------------------------------------------------
  it('terminates all active sessions on POST /logout-all by bumping tokenVersion', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testStudentEmail, password: testStudentPassword });

    const activeAccessToken = loginRes.body.data.accessToken;

    // Verify token works
    const meRes1 = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${activeAccessToken}`);
    expect(meRes1.status).toBe(200);

    // Call logout-all
    const logoutAllRes = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${activeAccessToken}`);
    expect(logoutAllRes.status).toBe(200);

    // Previously issued access token should now be rejected because tokenVersion changed
    const meRes2 = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${activeAccessToken}`);

    expect(meRes2.status).toBe(401);
    expect(meRes2.body.error.message).toContain('Session has been revoked');
  });

  // ---------------------------------------------------------------------------
  // 7. BANNED USER BLOCKED ACROSS ALL ENDPOINTS
  // ---------------------------------------------------------------------------
  it('immediately blocks banned users from login and authenticated routes', async () => {
    const bannedEmail = `banned_${Date.now()}@test.com`;
    const password = 'Password123!@#';
    const passwordHash = await hashPassword(password);
    const bannedUser = await prisma.user.create({
      data: {
        id: uuidv7(),
        email: bannedEmail,
        name: 'Banned User',
        passwordHash,
        status: UserStatus.BANNED,
        emailVerifiedAt: new Date(),
      },
    });

    // Login attempt
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: bannedEmail, password });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.message).toContain('account has been suspended');
  });

  // ---------------------------------------------------------------------------
  // 8. ADMIN TOTP 2FA ENROLLMENT & TWO-FACTOR LOGIN
  // ---------------------------------------------------------------------------
  it('enforces mandatory TOTP 2FA for admin and allows single-use recovery code login', async () => {
    // Create admin user
    const passwordHash = await hashPassword(testAdminPassword);
    const admin = await prisma.user.create({
      data: {
        id: uuidv7(),
        email: testAdminEmail,
        name: 'Super Admin',
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: false,
      },
    });
    adminId = admin.id;

    // First login: twoFactorEnabled is false, so it logs in and issues access token
    const firstLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testAdminEmail, password: testAdminPassword });

    expect(firstLoginRes.status).toBe(200);
    expect(firstLoginRes.body.data.requires2FA).toBe(false);
    adminAccessToken = firstLoginRes.body.data.accessToken;

    // Student with valid active token trying to hit admin 2FA setup gets 403 Forbidden
    const studentLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testStudentEmail, password: testStudentPassword });
    const freshStudentToken = studentLoginRes.body.data.accessToken;

    const studentRes = await request(app)
      .post('/api/v1/auth/2fa/setup')
      .set('Authorization', `Bearer ${freshStudentToken}`);
    expect(studentRes.status).toBe(403);
    expect(studentRes.body.error.code).toBe('FORBIDDEN');

    // Admin starts 2FA setup wizard
    const setupRes = await request(app)
      .post('/api/v1/auth/2fa/setup')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(setupRes.status).toBe(200);
    expect(setupRes.body.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(setupRes.body.data.manualEntryKey).toBeDefined();
    expect(setupRes.body.data.recoveryCodes).toHaveLength(10);

    const secretKey = setupRes.body.data.manualEntryKey;
    const recoveryCodeSample = setupRes.body.data.recoveryCodes[0];

    // Verify secret is encrypted with AES-256-GCM in database
    const dbAdmin = await prisma.user.findUnique({ where: { id: adminId } });
    expect(dbAdmin?.twoFactorSecretEncrypted).toBeDefined();
    expect(dbAdmin?.twoFactorSecretEncrypted).not.toBe(secretKey); // Must not be plaintext!
    expect(dbAdmin?.twoFactorSecretEncrypted?.split(':')).toHaveLength(3); // iv:tag:ciphertext

    // Decrypted secret must match
    const decrypted = decryptData(dbAdmin!.twoFactorSecretEncrypted!, env.TOTP_ENCRYPTION_KEY);
    expect(decrypted).toBe(secretKey);

    // Generate valid TOTP token using otplib
    const validToken = await generateTOTP({ secret: secretKey });

    // Complete enrollment
    const verifyRes = await request(app)
      .post('/api/v1/auth/2fa/verify')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ token: validToken });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    const activeAdmin = await prisma.user.findUnique({ where: { id: adminId } });
    expect(activeAdmin?.twoFactorEnabled).toBe(true);
    expect(activeAdmin?.twoFactorEnrolledAt).not.toBeNull();

    // Now, subsequent admin login requires 2FA!
    const secondLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testAdminEmail, password: testAdminPassword });

    expect(secondLoginRes.status).toBe(200);
    expect(secondLoginRes.body.data.requires2FA).toBe(true);
    const tempToken = secondLoginRes.body.data.tempToken;
    expect(tempToken).toBeDefined();

    // -------------------------------------------------------------------------
    // TEST SINGLE-USE RECOVERY CODE
    // -------------------------------------------------------------------------
    const recoveryLoginRes = await request(app).post('/api/v1/auth/2fa/login').send({
      tempToken,
      code: recoveryCodeSample, // Using recovery code
    });

    expect(recoveryLoginRes.status).toBe(200);
    expect(recoveryLoginRes.body.data.accessToken).toBeDefined();

    // Verify recovery code was BURNED from database (single-use!)
    const postRecoveryAdmin = await prisma.user.findUnique({ where: { id: adminId } });
    expect(postRecoveryAdmin?.twoFactorRecoveryCodes).toHaveLength(9); // 10 - 1 = 9

    // Replay the SAME recovery code -> must fail
    const replayRecoveryRes = await request(app).post('/api/v1/auth/2fa/login').send({
      tempToken,
      code: recoveryCodeSample,
    });

    expect(replayRecoveryRes.status).toBe(401);
  });
});
