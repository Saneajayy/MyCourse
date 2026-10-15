import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../errors/app-error.js';
import { UserRole } from '@course/shared';

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
  tokenVersion: number;
}

export interface Temp2FAPayload {
  sub: string;
  purpose: '2fa_challenge';
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_TTL as unknown as NonNullable<SignOptions['expiresIn']>,
    issuer: 'hydraulic-course-api',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'hydraulic-course-api',
    }) as AccessTokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired');
    }
    throw new UnauthorizedError('Invalid access token');
  }
}

export function signTemp2FAToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: '5m',
    issuer: 'hydraulic-course-api',
  };
  return jwt.sign({ sub: userId, purpose: '2fa_challenge' }, env.JWT_ACCESS_SECRET, options);
}

export function verifyTemp2FAToken(token: string): { sub: string } {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'hydraulic-course-api',
    }) as Temp2FAPayload;

    if (decoded.purpose !== '2fa_challenge') {
      throw new UnauthorizedError('Invalid token purpose');
    }
    return { sub: decoded.sub };
  } catch {
    throw new UnauthorizedError('Invalid or expired two-factor challenge token');
  }
}
