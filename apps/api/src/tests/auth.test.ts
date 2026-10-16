import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../common/db/prisma.js';
import { redisClient } from '../common/redis/redis.js';
import { uuidv7 } from 'uuidv7';
import {
  hashPassword,
  _configureArgon2CapacityForTesting,
  _resetArgon2CapacityForTesting,
} from '../common/crypto/argon2.js';
import {
  generateRandomToken,
  hashToken,
  encryptData,
  decryptData,
  hmacRecoveryCode,
  deriveSubKey,
} from '../common/crypto/tokens.js';
import { generate as generateTOTP } from 'otplib';
import { env } from '../config/env.js';
import { lockoutService } from '../common/middleware/lockout.js';
import { UserRole, UserStatus } from '@course/shared';
import {
  COMMON_PASSWORD_LIST,
  COMMON_PASSWORDS_SET,
  isCommonPassword,
} from '../common/security/common-passwords.js';
import { getRefreshTokenCookieOptions } from '../common/utils/cookie.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

describe('Phase 2 Authentication, Sessions, and Security Integration Suite', () => {
  const app = createApp();

  const testStudentEmail = `student_${Date.now()}@testcourse.com`;
  const testStudentPassword = 'ComplexPassword#2026!Secure';
  let studentAccessToken = '';
  let studentRefreshTokenCookie = '';
  let studentId = '';

  const testAdminEmail = `admin_${Date.now()}@testcourse.com`;
  const testAdminPassword = 'ComplexAdmin#2026!Secure';
  let adminAccessToken = '';
  let adminId = '';

  beforeAll(async () => {
    // Ensure test database is ready and clean
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { in: [testStudentEmail, testAdminEmail] } },
          { email: { contains: 'prehijack' } },
          { googleId: { startsWith: 'google-uid' } },
        ],
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
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. PASSWORD POLICY VALIDATION (B2)
  // ---------------------------------------------------------------------------
  describe('Password Policy & Strength Enforcement (B2)', () => {
    it('rejects trivial or common passwords like Password123!', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `weak_${Date.now()}@testcourse.com`,
          password: 'Password123!',
          name: 'Weak Pass User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('too common or easily guessable');
    });

    it('rejects short passwords under 10 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `short_${Date.now()}@testcourse.com`,
          password: 'Short9!',
          name: 'Short Pass User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. REGISTRATION & ZERO-ENUMERATION (B7)
  // ---------------------------------------------------------------------------
  describe('Registration & Zero Email Enumeration (B7)', () => {
    it('registers a new student with strong argon2id password and sends verification token', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: testStudentEmail,
        password: testStudentPassword,
        name: 'Test Student',
        phone: '+919876543210',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('verification link has been sent');

      // Verify user created in PostgreSQL
      const dbUser = await prisma.user.findUnique({
        where: { email: testStudentEmail.toLowerCase() },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser?.emailVerifiedAt).toBeNull();
      expect(dbUser?.passwordHash).toMatch(/^\$argon2id\$/);

      studentId = dbUser!.id;

      // Verify verification token hashed in DB
      const tokenRecord = await prisma.emailVerificationToken.findFirst({
        where: { userId: studentId },
      });
      expect(tokenRecord).toBeDefined();
      expect(tokenRecord?.usedAt).toBeNull();
    });

    it('returns generic zero-enumeration response when registering an already registered email (B7)', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: testStudentEmail,
        password: testStudentPassword,
        name: 'Duplicate Student Attempt',
      });

      // B7: Must NOT return 409 Conflict. Must return generic success message
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('verification link has been sent');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. EMAIL VERIFICATION & UNVERIFIED LOGIN BEHAVIOR (B6)
  // ---------------------------------------------------------------------------
  describe('Email Verification Lifecycle', () => {
    it('allows login with unverified email but flags emailVerifiedAt as null (B6)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testStudentEmail,
        password: testStudentPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.emailVerifiedAt).toBeNull();
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('verifies email using valid single-use verification token', async () => {
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
  });

  // ---------------------------------------------------------------------------
  // 4. LOGIN, ZERO-ENUMERATION & COOKIE ATTRIBUTES (B6, B8)
  // ---------------------------------------------------------------------------
  describe('Login & Session Cookie Flags', () => {
    it('returns generic 401 on non-existent email (zero user enumeration)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'unknown_nonexistent@testcourse.com',
        password: 'AnyPassword123!@#',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('returns generic 401 on wrong password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testStudentEmail,
        password: 'WrongPassword123!@#',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('logs in student successfully and verifies cookie attributes (HttpOnly, SameSite=Lax, Path=/)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testStudentEmail,
        password: testStudentPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      studentAccessToken = res.body.data.accessToken;

      const cookies = res.headers['set-cookie'] as string[] | undefined;
      expect(cookies).toBeDefined();
      const refreshCookie = cookies?.find((c: string) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toMatch(/HttpOnly/i);
      expect(refreshCookie).toMatch(/SameSite=Lax/i);
      expect(refreshCookie).toMatch(/Path=\//i);

      studentRefreshTokenCookie = refreshCookie!.split(';')[0]!;
    });
  });

  // ---------------------------------------------------------------------------
  // 5. CSRF DEFENSE ON COOKIE-AUTHENTICATED ROUTES (B5)
  // ---------------------------------------------------------------------------
  describe('CSRF Origin & Host Validation (B5)', () => {
    it('rejects cross-origin POST /refresh from unauthorized origin with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', studentRefreshTokenCookie)
        .set('Origin', 'https://malicious-attacker.com');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cross-origin request rejected');
    });

    it('rejects cross-origin POST /logout from unauthorized origin with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', studentRefreshTokenCookie)
        .set('Origin', 'https://evil-phishing-site.org');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cross-origin request rejected');
    });

    it('accepts POST /refresh with allowed CORS origin or same host', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', studentRefreshTokenCookie)
        .set('Origin', 'http://localhost:3000'); // Configured in CORS_ORIGINS

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'] as string[];
      const newCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
      studentRefreshTokenCookie = newCookie!.split(';')[0]!;
      studentAccessToken = res.body.data.accessToken;
    });
  });

  // ---------------------------------------------------------------------------
  // 6. REFRESH TOKEN ROTATION & REPLAY REUSE DETECTION
  // ---------------------------------------------------------------------------
  describe('Refresh Token Rotation & Replay Reuse Detection', () => {
    it('detects refresh token replay attack and revokes entire token family', async () => {
      const oldCookie = studentRefreshTokenCookie;

      // 1. Legitimate rotation
      const rotateRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);

      expect(rotateRes.status).toBe(200);
      const cookies = rotateRes.headers['set-cookie'] as string[];
      const activeCookie = cookies
        .find((c: string) => c.startsWith('refresh_token='))!
        .split(';')[0]!;

      // 2. Replay attack: Attacker re-uses old already-rotated cookie!
      const replayRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);

      expect(replayRes.status).toBe(401);
      expect(replayRes.body.error.message).toContain('Session revoked due to detected token reuse');

      // 3. Legitimate user's active token is now also revoked
      const blockedRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', activeCookie);

      expect(blockedRes.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. BRUTE-FORCE LOCKOUT (B9)
  // ---------------------------------------------------------------------------
  describe('Composite Brute-Force Lockout (B9)', () => {
    it('locks out composite email+IP after 5 failed login attempts', async () => {
      const victimEmail = `victim_${Date.now()}@test.com`;
      const passwordHash = await hashPassword('CorrectPassword123!@#');
      await prisma.user.create({
        data: {
          id: uuidv7(),
          email: victimEmail,
          name: 'Lockout Test User',
          passwordHash,
        },
      });

      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: victimEmail, password: 'WrongPassword!' });
        expect(res.status).toBe(401);
      }

      // 6th attempt should be blocked by composite lockout
      const lockedRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: victimEmail, password: 'CorrectPassword123!@#' });

      expect(lockedRes.status).toBe(429);
      expect(lockedRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');

      await lockoutService.clearFailedAttempts(victimEmail, '::ffff:127.0.0.1');
      await lockoutService.clearFailedAttempts(victimEmail, '127.0.0.1');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. LOGOUT-ALL & TOKEN VERSION INVALIDATION (B6)
  // ---------------------------------------------------------------------------
  describe('Logout-All & Access Token Invalidation (B6)', () => {
    it('invalidates existing access tokens when calling /logout-all', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testStudentPassword });

      const token = loginRes.body.data.accessToken;

      // Access /me succeeds
      const me1 = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(me1.status).toBe(200);

      // Call logout-all
      const logoutAllRes = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${token}`);
      expect(logoutAllRes.status).toBe(200);

      // Subsequent /me with same token is rejected
      const me2 = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(me2.status).toBe(401);
      expect(me2.body.error.message).toContain('Session has been revoked');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. CHANGE PASSWORD (B6)
  // ---------------------------------------------------------------------------
  describe('Change Password Flow (B6)', () => {
    it('changes password with valid current password and rejects common new password', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testStudentPassword });
      const token = loginRes.body.data.accessToken;

      // Reject common password
      const weakRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testStudentPassword,
          newPassword: 'Password123!',
        });
      expect(weakRes.status).toBe(400);

      // Reject wrong current password
      const wrongCurrentRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'IncorrectPassword!123',
          newPassword: 'NewBrandNew#Password2026!',
        });
      expect(wrongCurrentRes.status).toBe(400);
      expect(wrongCurrentRes.body.error.message).toContain('Current password is incorrect');

      // Successful change
      const successRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testStudentPassword,
          newPassword: 'NewBrandNew#Password2026!',
        });
      expect(successRes.status).toBe(200);

      // Login with new password succeeds
      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: 'NewBrandNew#Password2026!' });
      expect(newLogin.status).toBe(200);

      // Reset back for subsequent tests
      const resetToken = newLogin.body.data.accessToken;
      await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${resetToken}`)
        .send({
          currentPassword: 'NewBrandNew#Password2026!',
          newPassword: testStudentPassword,
        });
    });
  });

  // ---------------------------------------------------------------------------
  // 10. FORGOT & RESET PASSWORD HAPPY PATH (B6)
  // ---------------------------------------------------------------------------
  describe('Forgot & Reset Password Lifecycle (B6)', () => {
    it('executes forgot-then-reset happy path and rejects common new passwords', async () => {
      // 1. Request forgot password
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testStudentEmail });
      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.data.message).toContain('password reset instructions have been sent');

      // 2. Fetch reset token from test database
      const resetRecord = await prisma.passwordResetToken.findFirst({
        where: { user: { email: testStudentEmail.toLowerCase() }, usedAt: null },
      });
      expect(resetRecord).toBeDefined();

      // Create a known token
      const rawResetToken = generateRandomToken(32);
      await prisma.passwordResetToken.create({
        data: {
          id: uuidv7(),
          userId: studentId,
          tokenHash: hashToken(rawResetToken),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      // 3. Attempt reset with common password -> rejected
      const weakReset = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawResetToken, password: 'Password123!' });
      expect(weakReset.status).toBe(400);

      // 4. Reset with valid password -> succeeds
      const resetSuccess = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawResetToken, password: 'UpdatedSecretPassword#2026!' });
      expect(resetSuccess.status).toBe(200);

      // 5. Login with new password
      const loginNew = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: 'UpdatedSecretPassword#2026!' });
      expect(loginNew.status).toBe(200);

      // 6. Reusing reset token fails
      const replayReset = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawResetToken, password: 'AnotherPassword#2026!' });
      expect(replayReset.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // 11. ADMIN 2FA HARDENING, RATE LIMITING & REPLAY PREVENTION (B3, B4, B6)
  // ---------------------------------------------------------------------------
  describe('Admin TOTP 2FA Hardening & Timestep Anti-Replay (B3, B4)', () => {
    it('blocks unenrolled admin from protected admin management routes (B6)', async () => {
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

      // Admin logs in before 2FA enrollment
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testAdminEmail, password: testAdminPassword });

      adminAccessToken = loginRes.body.data.accessToken;

      // Access to /api/v1/admin/overview is blocked by requireAdmin2FA
      const adminBlocked = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(adminBlocked.status).toBe(403);
      expect(adminBlocked.body.error.message).toContain(
        'Mandatory two-factor authentication setup is required',
      );
    });

    it('generates 60-bit recovery codes with HMAC and refuses /2fa/setup once enabled (B4)', async () => {
      // 1. Setup 2FA wizard
      const setupRes = await request(app)
        .post('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(setupRes.status).toBe(200);
      expect(setupRes.body.data.recoveryCodes).toHaveLength(10);
      // B4: 12-character Base32 recovery code (60 bits of entropy) formatted as XXXX-XXXX-XXXX
      const codeSample = setupRes.body.data.recoveryCodes[0];
      expect(codeSample).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);

      const secret = setupRes.body.data.manualEntryKey;
      const validTotp = await generateTOTP({ secret });

      // 2. Activate 2FA
      const verifyRes = await request(app)
        .post('/api/v1/auth/2fa/verify')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ token: validTotp });

      expect(verifyRes.status).toBe(200);

      // B4: Calling /2fa/setup after 2FA is already enabled must be refused
      const refuseSetupRes = await request(app)
        .post('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(refuseSetupRes.status).toBe(400);
      expect(refuseSetupRes.body.error.message).toContain('already enabled');
    });

    it('rejects reuse of a TOTP code within its 30-second window (timestep anti-replay) (B3)', async () => {
      // Clear any prior timestep cache for this admin
      await redisClient.del(`totp:last_timestep:${adminId}`);

      // Ensure we are not within 3 seconds of a 30-second window boundary
      const msIntoStep = Date.now() % 30000;
      if (msIntoStep > 26000) {
        await new Promise((r) => setTimeout(r, 30000 - msIntoStep + 100));
      }

      // Admin logs in, gets 2FA tempToken challenge
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testAdminEmail, password: testAdminPassword });

      expect(loginRes.body.data.requires2FA).toBe(true);
      const tempToken = loginRes.body.data.tempToken;

      const admin = await prisma.user.findUnique({ where: { id: adminId } });
      const secret = decryptData(admin!.twoFactorSecretEncrypted!, env.TOTP_ENCRYPTION_KEY);
      const code = await generateTOTP({ secret });
      await redisClient.del(`totp:used_code:${adminId}:${code}`);

      // 1. First verification succeeds
      const firstRes = await request(app).post('/api/v1/auth/2fa/login').send({ tempToken, code });

      expect(firstRes.status).toBe(200);

      // 2. Replaying the exact same TOTP code in the same 30s window must fail (anti-replay)
      const loginRes2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testAdminEmail, password: testAdminPassword });
      const tempToken2 = loginRes2.body.data.tempToken;

      const replayRes = await request(app)
        .post('/api/v1/auth/2fa/login')
        .send({ tempToken: tempToken2, code });

      expect(replayRes.status).toBe(401);
      expect(replayRes.body.error.message).toContain('already been used');
    });

    it('rate-limits and locks out failed 2FA attempts after 5 failures (B3)', async () => {
      await redisClient.del(`2fa_fail:user:${adminId}`);
      await redisClient.del(`totp:last_timestep:${adminId}`);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testAdminEmail, password: testAdminPassword });
      const tempToken = loginRes.body.data.tempToken;

      // 5 failed 2FA code attempts
      for (let i = 0; i < 5; i++) {
        const failRes = await request(app)
          .post('/api/v1/auth/2fa/login')
          .send({ tempToken, code: '000000' });
        expect(failRes.status).toBe(401);
      }

      // 6th attempt is locked out
      const lockedRes = await request(app)
        .post('/api/v1/auth/2fa/login')
        .send({ tempToken, code: '000000' });

      expect(lockedRes.status).toBe(429);
      expect(lockedRes.body.error.message).toContain('locked');

      // Clear test lockout counters
      await redisClient.del(`2fa_fail:user:${adminId}`);
    });
  });

  // ---------------------------------------------------------------------------
  // 12. GOOGLE OAUTH FLOWS & PRE-HIJACK MITIGATION (B1, B6)
  // ---------------------------------------------------------------------------
  describe('Google OAuth & Account Linking (B1, B6)', () => {
    it('rejects Google OAuth callback with state mismatch (B6)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ code: 'mock-code', state: 'invalid-nonexistent-state' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('OAuth state mismatch');
    });

    it('rejects Google account when email is not verified by Google (B6)', async () => {
      const state = 'test-state-unverified';
      await redisClient.set(`oauth_state:${state}`, 'test-verifier-code', 'EX', 300);

      // Mock Google fetch responses
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes('oauth2.googleapis.com/token')) {
          return new Response(JSON.stringify({ access_token: 'mock-google-token' }), {
            status: 200,
          });
        }
        if (urlStr.includes('googleapis.com/oauth2/v3/userinfo')) {
          return new Response(
            JSON.stringify({
              sub: 'google-uid-unverified',
              email: 'unverified_google_user@testcourse.com',
              name: 'Unverified Google',
              email_verified: false, // NOT VERIFIED
            }),
            { status: 200 },
          );
        }
        return new Response('Not found', { status: 404 });
      });

      const res = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ code: 'valid-google-code', state });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Google account email is not verified');
    });

    it('creates and verifies new student on first-time Google OAuth login (B6)', async () => {
      const state = 'test-state-new-user';
      await redisClient.set(`oauth_state:${state}`, 'test-verifier-code', 'EX', 300);
      const newGoogleEmail = `new_google_${Date.now()}@testcourse.com`;

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes('oauth2.googleapis.com/token')) {
          return new Response(JSON.stringify({ access_token: 'mock-google-token' }), {
            status: 200,
          });
        }
        if (urlStr.includes('googleapis.com/oauth2/v3/userinfo')) {
          return new Response(
            JSON.stringify({
              sub: `google-uid-${Date.now()}`,
              email: newGoogleEmail,
              name: 'New Google Student',
              email_verified: true,
            }),
            { status: 200 },
          );
        }
        return new Response('Not found', { status: 404 });
      });

      const res = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ code: 'valid-google-code', state });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain(`${env.APP_URL}/auth/callback?token=`);
      expect(res.headers['set-cookie']).toBeDefined();

      const dbUser = await prisma.user.findUnique({
        where: { email: newGoogleEmail.toLowerCase() },
      });
      expect(dbUser?.emailVerifiedAt).not.toBeNull();
      expect(dbUser?.googleId).toBeDefined();
    });

    it('PRE-HIJACK SCENARIO (B1): wipes attacker password, revokes sessions, and marks verified when Google links to unverified account', async () => {
      const targetEmail = `prehijack_${Date.now()}_${Math.floor(Math.random() * 100000)}@testcourse.com`;
      const victimGoogleSub = `google-uid-victim-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const attackerPassword = 'AttackerPassword#2026!';
      const passwordHash = await hashPassword(attackerPassword);
      const attackerTokenRaw = `attacker_token_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

      // Attacker created an account locally with victim's email, but could not verify it
      const victimUser = await prisma.user.create({
        data: {
          id: uuidv7(),
          email: targetEmail,
          name: 'Victim Student',
          passwordHash,
          emailVerifiedAt: null, // UNVERIFIED!
          status: UserStatus.ACTIVE,
        },
      });

      // Attacker had an active refresh token
      await prisma.refreshToken.create({
        data: {
          id: uuidv7(),
          userId: victimUser.id,
          tokenHash: hashToken(attackerTokenRaw),
          familyId: uuidv7(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const state = `test-state-prehijack-${Date.now()}`;
      await redisClient.set(`oauth_state:${state}`, 'test-verifier-code', 'EX', 300);

      // Legitimate victim logs in with Google OAuth
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes('oauth2.googleapis.com/token')) {
          return new Response(JSON.stringify({ access_token: 'mock-google-token' }), {
            status: 200,
          });
        }
        if (urlStr.includes('googleapis.com/oauth2/v3/userinfo')) {
          return new Response(
            JSON.stringify({
              sub: victimGoogleSub,
              email: targetEmail,
              name: 'Victim Student',
              email_verified: true,
            }),
            { status: 200 },
          );
        }
        return new Response('Not found', { status: 404 });
      });

      const res = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ code: 'valid-google-code', state });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain(`${env.APP_URL}/auth/callback?token=`);

      // B1: Verify attacker's password was WIPED
      const updatedUser = await prisma.user.findUnique({ where: { id: victimUser.id } });
      expect(updatedUser?.passwordHash).toBeNull();
      expect(updatedUser?.emailVerifiedAt).not.toBeNull();
      expect(updatedUser?.googleId).toBe(victimGoogleSub);
      expect(updatedUser?.tokenVersion).toBe(victimUser.tokenVersion + 1);

      // B1: Verify all prior attacker sessions were revoked
      const attackerSessions = await prisma.refreshToken.findMany({
        where: { userId: victimUser.id },
      });
      // Only the newly created Google login session should exist
      expect(attackerSessions).toHaveLength(1);
      expect(attackerSessions[0].tokenHash).not.toBe(hashToken(attackerTokenRaw));
    });
  });

  // ---------------------------------------------------------------------------
  // 13. BANNED USER BLOCKED ACROSS ALL ENDPOINTS
  // ---------------------------------------------------------------------------
  describe('Banned User Enforcement', () => {
    it('blocks banned users from logging in with 403 Forbidden', async () => {
      const bannedEmail = `banned_${Date.now()}@test.com`;
      const password = 'Password#2026!Secure';
      const passwordHash = await hashPassword(password);
      await prisma.user.create({
        data: {
          id: uuidv7(),
          email: bannedEmail,
          name: 'Banned User',
          passwordHash,
          status: UserStatus.BANNED,
          emailVerifiedAt: new Date(),
        },
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: bannedEmail, password });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('account has been suspended');
    });
  });

  // ---------------------------------------------------------------------------
  // 14. PHASE 2 FOLLOW-UPS VERIFICATION (F1 - F5)
  // ---------------------------------------------------------------------------
  describe('Phase 2 Follow-Ups Verification (F1 - F5)', () => {
    // F1: Registration timing & identical response
    it('F1: ensures existing-email and new-email paths take comparable time and return identical body & status (median comparison)', async () => {
      const existingEmail = `f1_existing_${Date.now()}@testcourse.com`;
      const password = 'StrongPassword#2026!Equalize';

      // 1. Create the existing user first
      await request(app).post('/api/v1/auth/register').send({
        email: existingEmail,
        password,
        name: 'Existing User',
      });

      // Warm up JIT, database connection, and thread pool
      for (let w = 0; w < 2; w++) {
        await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `warmup_${w}_${Date.now()}@testcourse.com`,
            password,
            name: 'Warmup User',
          });
      }

      // Helper function to calculate median of durations
      const getMedian = (values: number[]): number => {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      };

      const newDurations: number[] = [];
      const existingDurations: number[] = [];
      const createdEmails: string[] = [existingEmail];
      const runs = 5;

      // Interleave measurements to balance system load fluctuations
      for (let i = 0; i < runs; i++) {
        const currentNewEmail = `f1_median_${i}_${Date.now()}@testcourse.com`;
        createdEmails.push(currentNewEmail);

        // 2. Measure new-user registration time
        const startNew = performance.now();
        const resNew = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: currentNewEmail,
            password,
            name: `Brand New User ${i}`,
          });
        const timeNew = performance.now() - startNew;
        newDurations.push(timeNew);

        // 3. Measure existing-user registration time
        const startExisting = performance.now();
        const resExisting = await request(app).post('/api/v1/auth/register').send({
          email: existingEmail,
          password,
          name: 'Existing User Again',
        });
        const timeExisting = performance.now() - startExisting;
        existingDurations.push(timeExisting);

        // Status codes MUST be identical (201 Created)
        expect(resNew.status).toBe(201);
        expect(resExisting.status).toBe(201);

        // Response bodies MUST be completely identical
        expect(resExisting.body).toEqual(resNew.body);
        expect(resExisting.body).toEqual({
          success: true,
          data: {
            message:
              'If this email is not already registered, a verification link has been sent. Please check your inbox.',
          },
        });
      }

      const medianNew = getMedian(newDurations);
      const medianExisting = getMedian(existingDurations);
      const timingDelta = Math.abs(medianNew - medianExisting);

      // P5: Timing tolerance is tightened to be close to the single hash time (< 60ms, not 350ms)
      expect(timingDelta).toBeLessThan(60);

      // Clean up test emails
      await prisma.user.deleteMany({
        where: { email: { in: createdEmails } },
      });
    });

    // F2: Brute force per-account limiter across multiple IPs & trust proxy
    it('F2: locks account globally across all IPs after 20 failed attempts and configures trust proxy', async () => {
      const targetEmail = `f2_brute_${Date.now()}@testcourse.com`;

      // Simulate 20 failed attempts from 20 completely distinct IP addresses
      for (let i = 1; i <= 20; i++) {
        await lockoutService.recordFailedAttempt(targetEmail, `198.51.100.${i}`);
      }

      // Check lockout from a brand new IP address (IP #21)
      await expect(lockoutService.checkLockout(targetEmail, '198.51.100.21')).rejects.toThrow(
        'Account temporarily locked due to excessive failed attempts',
      );

      // Clear lockout for cleanup
      await lockoutService.clearFailedAttempts(targetEmail, '198.51.100.21');

      // Trust proxy verification
      const trustProxySetting = app.get('trust proxy');
      expect(trustProxySetting).toBeDefined();
    });

    // F3: Test isolation: Redis key prefix & database index
    it('F3: uses isolated Redis key prefix and database index without any FLUSHALL usage', async () => {
      // 1. Verify keyPrefix is configured as 'test:'
      expect(redisClient.options.keyPrefix).toBe('test:');

      // 2. Verify Redis database index is isolated (configured to DB 1 in test environment)
      expect(env.REDIS_URL).toContain('/1');

      // 3. Verify absolute zero FLUSHALL / flushall usage anywhere in production code
      const srcDir = path.resolve(__dirname, '..');
      const scanDir = (dir: string): string[] => {
        const results: string[] = [];
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            if (file !== 'tests') {
              results.push(...scanDir(fullPath));
            }
          } else if ((file.endsWith('.ts') || file.endsWith('.js')) && !file.includes('.test.')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.toLowerCase().includes('flushall')) {
              results.push(fullPath);
            }
          }
        }
        return results;
      };

      const flushallOccurrences = scanDir(srcDir);
      expect(flushallOccurrences).toHaveLength(0);
    });

    // F4: Crypto key separation (HKDF) & legacy data migration fallback
    it('F4: derives distinct subkeys via RFC 5869 HKDF and supports transparent legacy fallback', async () => {
      const masterKey = 'test-master-crypto-secret-key-at-least-32-chars';

      // 1. Subkeys for TOTP encryption and recovery-code HMAC must be distinct
      const totpKey = deriveSubKey(masterKey, 'totp_aes_encryption_v1', 32);
      const hmacKey = deriveSubKey(masterKey, 'recovery_code_hmac_v1', 32);

      expect(totpKey.equals(hmacKey)).toBe(false);
      expect(totpKey.length).toBe(32);
      expect(hmacKey.length).toBe(32);

      // 2. Encrypt with HKDF key and decrypt
      const testSecret = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptData(testSecret, masterKey);
      const decrypted = decryptData(encrypted, masterKey);
      expect(decrypted).toBe(testSecret);

      // 3. Transparent fallback to legacy SHA-256 derived key
      const legacyKey = crypto.createHash('sha256').update(masterKey).digest();
      const legacyIv = crypto.randomBytes(12);
      const legacyCipher = crypto.createCipheriv('aes-256-gcm', legacyKey, legacyIv);
      const legacyEncrypted = Buffer.concat([
        legacyCipher.update(testSecret, 'utf8'),
        legacyCipher.final(),
      ]);
      const legacyAuthTag = legacyCipher.getAuthTag();
      const legacyPayload = `${legacyIv.toString('hex')}:${legacyAuthTag.toString('hex')}:${legacyEncrypted.toString('hex')}`;

      // Decrypt legacy payload seamlessly
      const fallbackDecrypted = decryptData(legacyPayload, masterKey);
      expect(fallbackDecrypted).toBe(testSecret);

      // 4. HMAC recovery code is deterministic 64-char hex
      const hmac1 = hmacRecoveryCode('ABCD-EFGH-JKLM', masterKey);
      const hmac2 = hmacRecoveryCode('abcd-efgh-jklm', masterKey);
      expect(hmac1).toBe(hmac2);
      expect(hmac1).toHaveLength(64);
    });

    // F5: Argon2 queue saturation returns 503 Retry-After, common passwords count, Secure cookie in prod
    it('F5: verifies Argon2 saturation 503 with Retry-After, 10k common passwords, and Secure cookie flag', async () => {
      // 1. Verify SecLists top 10,000 common password dataset entry count (10,001 unique entries)
      expect(COMMON_PASSWORD_LIST).toHaveLength(10001);
      expect(COMMON_PASSWORDS_SET.size).toBe(10001);
      expect(isCommonPassword('Password123!')).toBe(true);
      expect(isCommonPassword('welcome123')).toBe(true);
      expect(isCommonPassword('admin1234')).toBe(true);

      // 2. Test Secure cookie flag under NODE_ENV=production
      const originalEnv = env.NODE_ENV;
      try {
        (env as any).NODE_ENV = 'production';
        const prodCookieOptions = getRefreshTokenCookieOptions();
        expect(prodCookieOptions.secure).toBe(true);
        expect(prodCookieOptions.httpOnly).toBe(true);
        expect(prodCookieOptions.sameSite).toBe('lax');
      } finally {
        (env as any).NODE_ENV = originalEnv;
      }

      // 3. Test Argon2 queue overflow returns 503 with Retry-After
      _configureArgon2CapacityForTesting(1, 0); // 1 active, 0 waiting capacity

      try {
        // Launch first hash to occupy the only slot
        const firstHashPromise = hashPassword('heavy_password_occupying_slot_1');

        // Immediately attempt login endpoint via Supertest while slot is occupied
        const saturatedRes = await request(app).post('/api/v1/auth/login').send({
          email: 'anyuser@test.com',
          password: 'SomePassword123!',
        });

        await firstHashPromise;

        // Supertest response when Argon2 queue overflows must be 503 Service Unavailable
        expect(saturatedRes.status).toBe(503);
        expect(saturatedRes.headers['retry-after']).toBe('1');
        expect(saturatedRes.body.error.message).toContain('Authentication server busy');
      } finally {
        _resetArgon2CapacityForTesting();
      }
    });
  });
});
