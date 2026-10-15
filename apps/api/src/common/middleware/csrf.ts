import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';
import { ForbiddenError } from '../errors/app-error.js';

/**
 * Origin and Host validation defense against Cross-Site Request Forgery (CSRF).
 * Applies specifically to cookie-authenticated state-changing routes (/refresh, /logout, /logout-all).
 *
 * Verifies that the browser's Origin or Referer header matches an allowed frontend origin
 * or matches the server's own Host header.
 */
export function validateCookieCsrf(req: Request, _res: Response, next: NextFunction): void {
  // Safe HTTP methods do not change state
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const originHeader = req.headers['origin'];
  const refererHeader = req.headers['referer'];
  const targetHeader = originHeader || refererHeader;

  // Non-browser clients (curl, backend tests, native apps) omit Origin/Referer unless explicitly passed.
  // In a browser context, cross-origin POST requests ALWAYS provide an Origin header.
  if (!targetHeader) {
    return next();
  }

  const rawOrigin = Array.isArray(targetHeader) ? targetHeader[0] : targetHeader;
  if (!rawOrigin) {
    return next();
  }

  try {
    const originUrl = new URL(rawOrigin);
    const originHost = originUrl.host.toLowerCase();

    // Check configured CORS allowed origins
    const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim().toLowerCase());
    const isAllowedOrigin = allowedOrigins.some((allowed) => {
      try {
        return new URL(allowed).host.toLowerCase() === originHost;
      } catch {
        return false;
      }
    });

    // Check same-host / same-origin match
    const reqHost = req.headers['host']?.toLowerCase();
    const isSameHost = reqHost !== undefined && originHost === reqHost;

    if (!isAllowedOrigin && !isSameHost) {
      return next(
        new ForbiddenError(
          `Cross-origin request rejected: Origin [${originHost}] is not authorized for cookie authentication`,
        ),
      );
    }

    next();
  } catch {
    next(new ForbiddenError('Invalid Origin or Referer header in request'));
  }
}
