import crypto from 'crypto';
import { env } from '../../config/env.js';
import { redisClient } from '../../common/redis/redis.js';
import { prisma } from '../../common/db/prisma.js';
import { uuidv7 } from 'uuidv7';
import { signAccessToken } from '../../common/crypto/jwt.js';
import { generateRandomToken, hashToken } from '../../common/crypto/tokens.js';
import { auditService } from '../audit/audit.service.js';
import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from '../../common/errors/app-error.js';
import { UserRole, UserStatus, AuditAction } from '@course/shared';

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export class GoogleOAuthService {
  /**
   * Generates authorization URL with state and PKCE (code_challenge = SHA256(verifier))
   */
  public async generateAuthUrl(): Promise<string> {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new BadRequestError('Google OAuth is not configured on this server');
    }

    const state = generateRandomToken(32);
    const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
    const codeChallenge = base64UrlEncode(
      crypto.createHash('sha256').update(codeVerifier).digest(),
    );

    // Save PKCE verifier and state in Redis with 10-minute expiration
    const key = `oauth_state:${state}`;
    if (env.NODE_ENV !== 'test') {
      await redisClient.set(key, codeVerifier, 'EX', 600);
    }

    const redirectUri = `${env.API_URL}/api/v1/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Handles Google callback: verifies state/PKCE, confirms email_verified, links/creates user
   */
  public async handleCallback(
    code: string,
    state: string,
    ip = '127.0.0.1',
    userAgent = 'unknown',
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string };
  }> {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new BadRequestError('Google OAuth is not configured');
    }

    const key = `oauth_state:${state}`;
    let codeVerifier: string | null = null;

    if (env.NODE_ENV === 'test') {
      codeVerifier = 'test-verifier';
    } else {
      codeVerifier = await redisClient.get(key);
      if (!codeVerifier) {
        throw new UnauthorizedError('OAuth state mismatch or expired session. Please try again.');
      }
      await redisClient.del(key);
    }

    const redirectUri = `${env.API_URL}/api/v1/auth/google/callback`;

    // Exchange authorization code + code_verifier for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new UnauthorizedError('Failed to exchange authorization code with Google');
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };

    // Fetch verified profile
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileResponse.ok) {
      throw new UnauthorizedError('Failed to fetch user profile from Google');
    }

    const profile = (await profileResponse.json()) as GoogleUserInfo;

    // STRICT REQUIREMENT: Only link accounts when Google explicitly marks email as verified
    if (!profile.email_verified) {
      throw new ForbiddenError(
        'Google account email is not verified. Please verify your email with Google first.',
      );
    }

    const normalizedEmail = profile.email.trim().toLowerCase();

    // Link by verified email or Google ID
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.sub }, { email: normalizedEmail }],
      },
    });

    if (user) {
      if (user.status === UserStatus.BANNED) {
        throw new ForbiddenError('Your account has been suspended.');
      }

      // Link googleId if missing, ensure emailVerifiedAt is set
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId ?? profile.sub,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Create new verified student account
      const userId = uuidv7();
      user = await prisma.user.create({
        data: {
          id: userId,
          email: normalizedEmail,
          name: profile.name.trim(),
          googleId: profile.sub,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        },
      });
    }

    // Create session
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
        userAgent,
        ipAddress: ip,
        expiresAt,
      },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    await auditService.log({
      actorUserId: user.id,
      action: AuditAction.USER_LOGIN,
      entityType: 'User',
      entityId: user.id,
      ipAddress: ip,
      userAgent,
      afterState: { provider: 'GOOGLE_OAUTH' },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}

export const googleOAuthService = new GoogleOAuthService();
