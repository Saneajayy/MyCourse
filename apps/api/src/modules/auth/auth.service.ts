import { prisma } from '../../common/db/prisma.js';
import { uuidv7 } from 'uuidv7';
import { generateSecret, generateURI, verify as verifyTOTP } from 'otplib';
import qrcode from 'qrcode';
import { env } from '../../config/env.js';
import { redisClient } from '../../common/redis/redis.js';
import { hashPassword, verifyPassword, dummyVerifyPassword } from '../../common/crypto/argon2.js';
import {
  generateRandomToken,
  hashToken,
  generateRecoveryCodes,
  hmacRecoveryCode,
  encryptData,
  decryptData,
} from '../../common/crypto/tokens.js';
import { signAccessToken, signTemp2FAToken, verifyTemp2FAToken } from '../../common/crypto/jwt.js';
import { emailService } from '../../common/email/email.service.js';
import { auditService } from '../audit/audit.service.js';
import { lockoutService } from '../../common/middleware/lockout.js';
import { validatePasswordStrength } from '../../common/security/common-passwords.js';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  NotFoundError,
} from '../../common/errors/app-error.js';
import { RegisterInput, LoginInput, UserRole, UserStatus, AuditAction } from '@course/shared';

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  twoFactorEnabled: boolean;
}

export interface AuthSuccessResult {
  requires2FA: false;
  user: UserSummary;
  accessToken: string;
  refreshToken: string;
}

export interface Auth2FARequiredResult {
  requires2FA: true;
  tempToken: string;
}

export type LoginResult = AuthSuccessResult | Auth2FARequiredResult;

function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  twoFactorEnabled: boolean;
}): UserSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    twoFactorEnabled: user.twoFactorEnabled,
  };
}

export class AuthService {
  public static readonly ADMIN_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private getNow: () => Date = () => new Date();
  private adminActivityMemory: Map<string, number> = new Map();

  public setClock(clockFn: () => Date): void {
    this.getNow = clockFn;
  }

  public resetClock(): void {
    this.getNow = () => new Date();
    this.adminActivityMemory.clear();
  }

  public async clearAdminActivity(userId?: string): Promise<void> {
    if (userId) {
      this.adminActivityMemory.delete(userId);
      try {
        await redisClient.del(`admin:activity:${userId}`);
      } catch {
        // ignore
      }
    } else {
      this.adminActivityMemory.clear();
    }
  }

  public async recordAdminActivity(userId: string, timestamp?: Date): Promise<void> {
    const time = timestamp ? timestamp.getTime() : this.getNow().getTime();
    this.adminActivityMemory.set(userId, time);
    try {
      await redisClient.set(`admin:activity:${userId}`, time.toString(), 'EX', 86400);
    } catch {
      // ignore cache failure
    }
  }

  public async getAdminLastActivity(userId: string): Promise<number | null> {
    if (this.adminActivityMemory.has(userId)) {
      return this.adminActivityMemory.get(userId)!;
    }
    try {
      const val = await redisClient.get(`admin:activity:${userId}`);
      if (val) {
        return parseInt(val, 10);
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Register a new user, hash password with argon2id, create verification token, dispatch email.
   * Enforces zero-enumeration: if email already exists, notifies the owner and returns generic message.
   */
  public async register(
    input: RegisterInput,
    ip?: string,
    userAgent?: string,
  ): Promise<{ message: string; user?: UserSummary }> {
    // B2: Reject common or guessable passwords
    validatePasswordStrength(input.password);

    const normalizedEmail = input.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // F1: Equalize timing with new-registration path by running argon2 hash
      await hashPassword(input.password);

      // B7: Zero email enumeration - notify owner without revealing existence to caller
      await emailService.sendAccountExistsEmail(existingUser.email, existingUser.name);

      await auditService.log({
        actorUserId: existingUser.id,
        action: AuditAction.USER_REGISTER,
        entityType: 'User',
        entityId: existingUser.id,
        ipAddress: ip,
        userAgent,
        afterState: {
          notice: 'Registration attempted for existing account. Owner notified.',
        },
      });

      return {
        message:
          'If this email is not already registered, a verification link has been sent. Please check your inbox.',
      };
    }

    const passwordHash = await hashPassword(input.password);
    const userId = uuidv7();

    const rawVerificationToken = generateRandomToken(32);
    const verificationTokenHash = hashToken(rawVerificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          id: userId,
          email: normalizedEmail,
          passwordHash,
          name: input.name.trim(),
          phone: input.phone?.trim() ?? null,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          id: uuidv7(),
          userId: newUser.id,
          tokenHash: verificationTokenHash,
          expiresAt,
        },
      });

      return newUser;
    });

    // Send verification email via transactional queue
    await emailService.sendVerificationEmail(user.email, user.name, rawVerificationToken);

    await auditService.log({
      actorUserId: user.id,
      action: AuditAction.USER_REGISTER,
      entityType: 'User',
      entityId: user.id,
      ipAddress: ip,
      userAgent,
      afterState: { email: user.email, name: user.name },
    });

    return {
      message:
        'If this email is not already registered, a verification link has been sent. Please check your inbox.',
    };
  }

  /**
   * Verify email address using a single-use expiring token
   */
  public async verifyEmail(
    token: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ success: true; message: string }> {
    const tokenHash = hashToken(token);

    const tokenRecord = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.usedAt !== null || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestError('Verification link is invalid or has expired');
    }

    await prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { emailVerifiedAt: new Date() },
      });
    });

    await auditService.log({
      actorUserId: tokenRecord.userId,
      action: AuditAction.EMAIL_VERIFIED,
      entityType: 'User',
      entityId: tokenRecord.userId,
      ipAddress: ip,
      userAgent,
    });

    return {
      success: true,
      message: 'Email address verified successfully. You may now log in.',
    };
  }

  /**
   * Log in user with password, rate-limit / lockout check, and optional 2FA challenge
   */
  public async login(
    input: LoginInput,
    ip = '127.0.0.1',
    userAgent = 'unknown',
  ): Promise<LoginResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Check progressive brute-force lockout keyed by composite email+IP and by IP
    await lockoutService.checkLockout(normalizedEmail, ip);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Constant-time protection against user enumeration
    if (!user || !user.passwordHash) {
      await dummyVerifyPassword(input.password);
      await lockoutService.recordFailedAttempt(normalizedEmail, ip);
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await verifyPassword(user.passwordHash, input.password);
    if (!isValidPassword) {
      await lockoutService.recordFailedAttempt(normalizedEmail, ip);
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenError('Your account has been suspended. Please contact support.');
    }

    // Success: clear lockout counters
    await lockoutService.clearFailedAttempts(normalizedEmail, ip);

    // If Admin user has 2FA enabled, issue a temporary challenge token
    if (user.role === UserRole.ADMIN && user.twoFactorEnabled) {
      const tempToken = signTemp2FAToken(user.id);
      return {
        requires2FA: true,
        tempToken,
      };
    }

    // Standard session creation
    const { accessToken, refreshToken } = await this.createSession(user, ip, userAgent);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await auditService.log({
      actorUserId: user.id,
      action: AuditAction.USER_LOGIN,
      entityType: 'User',
      entityId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      requires2FA: false,
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verify TOTP code or single-use recovery code for 2FA login challenge.
   * Rate limits and locks out per user and per tempToken.
   * Rejects reuse of a TOTP code within its 30-second time window.
   */
  public async verify2FALogin(
    tempToken: string,
    codeOrRecovery: string,
    ip = '127.0.0.1',
    userAgent = 'unknown',
  ): Promise<AuthSuccessResult> {
    const { sub: userId } = verifyTemp2FAToken(tempToken);
    const tempTokenHash = hashToken(tempToken);

    // B3: Rate-limit and lock out failed 2FA attempts per user and per challenge token
    const userFailKey = `2fa_fail:user:${userId}`;
    const tokenFailKey = `2fa_fail:token:${tempTokenHash}`;

    let userFails = 0;
    let tokenFails = 0;
    try {
      const uVal = await redisClient.get(userFailKey);
      const tVal = await redisClient.get(tokenFailKey);
      userFails = uVal ? parseInt(uVal, 10) : 0;
      tokenFails = tVal ? parseInt(tVal, 10) : 0;
    } catch {
      // Redis error handled
    }

    if (userFails >= 5 || tokenFails >= 5) {
      throw new RateLimitError(
        'Too many failed two-factor authentication attempts. This challenge session has been locked for 15 minutes.',
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecretEncrypted) {
      throw new BadRequestError('Two-factor authentication is not configured for this account');
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenError('Your account has been suspended.');
    }

    const cleanInput = codeOrRecovery.trim();
    let verified = false;

    // 1. Try TOTP 6-digit code with anti-replay timestep tracking
    if (/^\d{6}$/.test(cleanInput)) {
      const codeUsedKey = `totp:used_code:${userId}:${cleanInput}`;
      const lastStepKey = `totp:last_timestep:${userId}`;

      let codeAlreadyUsed = false;
      let lastStep: string | null = null;
      try {
        const [usedVal, stepVal] = await Promise.all([
          redisClient.get(codeUsedKey),
          redisClient.get(lastStepKey),
        ]);
        codeAlreadyUsed = Boolean(usedVal);
        lastStep = stepVal;
      } catch {
        // ignore cache error
      }

      if (codeAlreadyUsed) {
        throw new UnauthorizedError(
          'This two-factor authentication code has already been used within this time window. Please wait for the next 30-second code.',
        );
      }

      const secret = decryptData(user.twoFactorSecretEncrypted, env.TOTP_ENCRYPTION_KEY);
      const res = await verifyTOTP({ token: cleanInput, secret, epochTolerance: 30 });

      if (res.valid === true) {
        const currentStep =
          'timeStep' in res && typeof res.timeStep === 'number'
            ? res.timeStep
            : Math.floor(Date.now() / 1000 / 30);

        // B3: Reject reuse of a TOTP code within its time window by checking last used timestep
        if (lastStep && parseInt(lastStep, 10) === currentStep) {
          throw new UnauthorizedError(
            'This two-factor authentication code has already been used within this time window. Please wait for the next 30-second code.',
          );
        }

        try {
          await Promise.all([
            redisClient.set(codeUsedKey, '1', 'EX', 90),
            redisClient.set(lastStepKey, currentStep.toString(), 'EX', 90),
          ]);
        } catch {
          // ignore cache error
        }
        verified = true;
      }
    }

    // 2. If not TOTP, check if input matches a single-use recovery code with server HMAC
    if (!verified) {
      const candidateHmac = hmacRecoveryCode(cleanInput, env.TOTP_ENCRYPTION_KEY);
      const recoveryIndex = user.twoFactorRecoveryCodes.indexOf(candidateHmac);

      if (recoveryIndex !== -1) {
        verified = true;
        // Invalidate the recovery code immediately (single-use)
        const updatedCodes = [...user.twoFactorRecoveryCodes];
        updatedCodes.splice(recoveryIndex, 1);

        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorRecoveryCodes: updatedCodes },
        });

        await auditService.log({
          actorUserId: user.id,
          action: '2FA_RECOVERY_CODE_USED',
          entityType: 'User',
          entityId: user.id,
          ipAddress: ip,
          userAgent,
        });
      }
    }

    if (!verified) {
      try {
        await redisClient.incr(userFailKey);
        await redisClient.expire(userFailKey, 900);
        await redisClient.incr(tokenFailKey);
        await redisClient.expire(tokenFailKey, 900);
      } catch {
        // ignore redis error
      }
      throw new UnauthorizedError('Invalid two-factor authentication code or recovery code');
    }

    // Success: clear 2FA fail counters
    try {
      await redisClient.del(userFailKey);
      await redisClient.del(tokenFailKey);
    } catch {
      // ignore
    }

    const { accessToken, refreshToken } = await this.createSession(user, ip, userAgent);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await auditService.log({
      actorUserId: user.id,
      action: AuditAction.USER_LOGIN,
      entityType: 'User',
      entityId: user.id,
      ipAddress: ip,
      userAgent,
      afterState: { method: '2FA' },
    });

    return {
      requires2FA: false,
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token with rotation and REPLAY REUSE DETECTION
   */
  public async refresh(
    rawRefreshToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; newRefreshToken: string; user: UserSummary }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    const tokenHash = hashToken(rawRefreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // REPLAY REUSE DETECTION: If a revoked token is presented, revoke the entire token family!
    if (tokenRecord.revokedAt !== null) {
      await prisma.refreshToken.updateMany({
        where: { familyId: tokenRecord.familyId },
        data: { revokedAt: new Date() },
      });

      await auditService.log({
        actorUserId: tokenRecord.userId,
        action: 'REFRESH_TOKEN_REUSE_DETECTED',
        entityType: 'RefreshTokenFamily',
        entityId: tokenRecord.familyId,
        ipAddress: ip,
        userAgent,
      });

      throw new UnauthorizedError('Session revoked due to detected token reuse');
    }

    if (tokenRecord.expiresAt < this.getNow()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    if (tokenRecord.user.status === UserStatus.BANNED) {
      throw new ForbiddenError('Your account has been suspended.');
    }

    // U2: Enforce 30-minute inactivity timeout for admin accounts on token refresh
    if (tokenRecord.user.role === UserRole.ADMIN) {
      const nowMs = this.getNow().getTime();
      const lastActivityMs = await this.getAdminLastActivity(tokenRecord.userId);
      const effectiveLastActivity =
        lastActivityMs ??
        (tokenRecord.lastUsedAt
          ? tokenRecord.lastUsedAt.getTime()
          : tokenRecord.createdAt.getTime());

      if (nowMs - effectiveLastActivity > AuthService.ADMIN_INACTIVITY_TIMEOUT_MS) {
        throw new UnauthorizedError(
          'Admin session has expired due to 30 minutes of inactivity. Please log in again.',
        );
      }
      await this.recordAdminActivity(tokenRecord.userId);
    }

    // Rotate: revoke the current token and create a new one in the same family
    const newRawToken = generateRandomToken(32);
    const newTokenHash = hashToken(newRawToken);
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          revokedAt: new Date(),
          lastUsedAt: new Date(),
        },
      });

      await tx.refreshToken.create({
        data: {
          id: uuidv7(),
          userId: tokenRecord.userId,
          tokenHash: newTokenHash,
          familyId: tokenRecord.familyId,
          userAgent: userAgent ?? null,
          ipAddress: ip ?? null,
          expiresAt,
        },
      });
    });

    const accessToken = signAccessToken({
      sub: tokenRecord.user.id,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
      tokenVersion: tokenRecord.user.tokenVersion,
    });

    return {
      accessToken,
      newRefreshToken: newRawToken,
      user: sanitizeUser(tokenRecord.user),
    };
  }

  /**
   * Log out current session
   */
  public async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken
        .update({
          where: { tokenHash },
          data: { revokedAt: new Date() },
        })
        .catch(() => {
          // Token may already be deleted or invalid
        });
    }
  }

  /**
   * Log out of all devices by bumping tokenVersion and revoking all user sessions
   */
  public async logoutAll(userId: string, ip?: string, userAgent?: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      });

      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await auditService.log({
      actorUserId: userId,
      action: 'LOGOUT_ALL_DEVICES',
      entityType: 'User',
      entityId: userId,
      ipAddress: ip,
      userAgent,
    });
  }

  /**
   * Forgot password flow - generic response to prevent user enumeration
   */
  public async forgotPassword(
    email: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.status !== UserStatus.BANNED) {
      const rawToken = generateRandomToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

      await prisma.passwordResetToken.create({
        data: {
          id: uuidv7(),
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await emailService.sendPasswordResetEmail(user.email, user.name, rawToken);

      await auditService.log({
        actorUserId: user.id,
        action: AuditAction.PASSWORD_RESET,
        entityType: 'User',
        entityId: user.id,
        ipAddress: ip,
        userAgent,
        afterState: { step: 'REQUESTED' },
      });
    }

    // Always return identical message regardless of whether the email was found
    return {
      message:
        'If an account exists with that email address, password reset instructions have been sent.',
    };
  }

  /**
   * Reset password with valid token, invalidate all previous sessions
   */
  public async resetPassword(
    token: string,
    newPassword: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const tokenHash = hashToken(token);

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.usedAt !== null || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestError('Password reset link is invalid or has expired');
    }

    // B2: Reject common or easily guessable passwords
    validatePasswordStrength(newPassword);

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      });

      await tx.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await auditService.log({
      actorUserId: tokenRecord.userId,
      action: AuditAction.PASSWORD_RESET,
      entityType: 'User',
      entityId: tokenRecord.userId,
      ipAddress: ip,
      userAgent,
      afterState: { step: 'COMPLETED' },
    });

    return {
      message: 'Your password has been reset successfully. Please log in with your new password.',
    };
  }

  /**
   * Change password for logged-in user
   */
  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new BadRequestError('Account does not have a local password configured');
    }

    const isValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!isValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    // B2: Reject common or easily guessable passwords
    validatePasswordStrength(newPassword);

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      });

      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await auditService.log({
      actorUserId: userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
      ipAddress: ip,
      userAgent,
    });

    return {
      message: 'Password changed successfully. All other active sessions have been signed out.',
    };
  }

  /**
   * Initiate Admin TOTP 2FA enrollment: generate secret, QR code, and single-use recovery codes.
   * Calling this when 2FA is already enabled is refused.
   */
  public async setupAdmin2FA(adminUserId: string): Promise<{
    qrCodeDataUrl: string;
    manualEntryKey: string;
    recoveryCodes: string[];
  }> {
    const user = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Two-factor setup is only applicable to administrators');
    }

    // B4: Calling /2fa/setup after 2FA is already enabled must be refused
    if (user.twoFactorEnabled) {
      throw new BadRequestError('Two-factor authentication is already enabled for this account');
    }

    const secret = generateSecret();
    const serviceName = 'HydraulicEngineeringAcademy';
    const otpauth = generateURI({
      issuer: serviceName,
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await qrcode.toDataURL(otpauth);

    // B4: 12-char recovery codes (60-bit entropy) + HMAC with server secret
    const plainRecoveryCodes = generateRecoveryCodes(10);
    const hashedRecoveryCodes = plainRecoveryCodes.map((c) =>
      hmacRecoveryCode(c, env.TOTP_ENCRYPTION_KEY),
    );

    // Encrypt the secret with AES-256-GCM before saving to database
    const encryptedSecret = encryptData(secret, env.TOTP_ENCRYPTION_KEY);

    await prisma.user.update({
      where: { id: adminUserId },
      data: {
        twoFactorSecretEncrypted: encryptedSecret,
        twoFactorRecoveryCodes: hashedRecoveryCodes,
        twoFactorEnabled: false, // remains inactive until verified
      },
    });

    return {
      qrCodeDataUrl,
      manualEntryKey: secret,
      recoveryCodes: plainRecoveryCodes,
    };
  }

  /**
   * Complete Admin TOTP enrollment by verifying the first code.
   * Rejects reuse of a TOTP code within its time window.
   */
  public async verifyAndEnableAdmin2FA(
    adminUserId: string,
    token: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ success: true; message: string }> {
    const user = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized');
    }

    if (!user.twoFactorSecretEncrypted) {
      throw new BadRequestError(
        'Two-factor authentication has not been initiated. Please run setup first.',
      );
    }

    const secret = decryptData(user.twoFactorSecretEncrypted, env.TOTP_ENCRYPTION_KEY);
    const verifyRes = await verifyTOTP({ token: token.trim(), secret });

    if (!verifyRes.valid) {
      throw new BadRequestError(
        'Invalid verification code. Please check your authenticator app and try again.',
      );
    }

    await prisma.user.update({
      where: { id: adminUserId },
      data: {
        twoFactorEnabled: true,
        twoFactorEnrolledAt: new Date(),
      },
    });

    await auditService.log({
      actorUserId: adminUserId,
      action: '2FA_ENROLLED',
      entityType: 'User',
      entityId: adminUserId,
      ipAddress: ip,
      userAgent,
    });

    return {
      success: true,
      message:
        'Two-factor authentication has been verified and activated for your administrator account.',
    };
  }

  /**
   * Helper: create family-tracked refresh token and short-lived access token
   */
  private async createSession(
    user: { id: string; email: string; role: UserRole; tokenVersion: number },
    ip: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const rawRefreshToken = generateRandomToken(32);
    const tokenHash = hashToken(rawRefreshToken);
    const familyId = uuidv7();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        id: uuidv7(),
        userId: user.id,
        tokenHash,
        familyId,
        ipAddress: ip,
        userAgent,
        expiresAt,
      },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    if (user.role === UserRole.ADMIN) {
      await this.recordAdminActivity(user.id);
    }

    return { accessToken, refreshToken: rawRefreshToken };
  }

  public async updateProfile(
    userId: string,
    input: { name?: string; phone?: string },
  ): Promise<UserSummary> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined && input.name.trim().length > 0
          ? { name: input.name.trim() }
          : {}),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      },
    });

    return sanitizeUser(user);
  }

  public async resendVerification(userId: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.emailVerifiedAt) {
      return { message: 'Email is already verified.' };
    }

    const rawVerificationToken = generateRandomToken(32);
    const verificationTokenHash = hashToken(rawVerificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        id: uuidv7(),
        userId: user.id,
        tokenHash: verificationTokenHash,
        expiresAt,
      },
    });

    await emailService.sendVerificationEmail(user.email, user.name, rawVerificationToken);

    return { message: 'A new verification link has been sent to your email.' };
  }
}

export const authService = new AuthService();
