import { Response, CookieOptions } from 'express';
import { env } from '../../config/env.js';

export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

export function getRefreshTokenCookieOptions(): CookieOptions {
  const isProduction = env.NODE_ENV === 'production';
  const cookieDomain =
    env.COOKIE_DOMAIN && env.COOKIE_DOMAIN.trim().length > 0 ? env.COOKIE_DOMAIN.trim() : undefined;

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, getRefreshTokenCookieOptions());
}

export function clearRefreshTokenCookie(res: Response): void {
  const options = getRefreshTokenCookieOptions();
  delete options.maxAge;
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, options);
}
