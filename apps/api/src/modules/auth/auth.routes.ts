import { Router } from 'express';
import { authController } from './auth.controller.js';
import { requireAuth, requireRole } from '../../common/middleware/auth.js';
import { authRateLimiter, standardRateLimiter } from '../../common/middleware/rate-limiter.js';
import { validateCookieCsrf } from '../../common/middleware/csrf.js';
import { UserRole } from '@course/shared';

export const authRouter: Router = Router();

// Public auth endpoints (stricter rate limiting)
authRouter.post('/register', authRateLimiter, (req, res, next) =>
  authController.register(req, res, next),
);
authRouter.post('/verify-email', standardRateLimiter, (req, res, next) =>
  authController.verifyEmail(req, res, next),
);
authRouter.post('/login', authRateLimiter, (req, res, next) =>
  authController.login(req, res, next),
);
authRouter.post('/2fa/login', standardRateLimiter, (req, res, next) =>
  authController.verify2FALogin(req, res, next),
);
authRouter.post('/refresh', standardRateLimiter, validateCookieCsrf, (req, res, next) =>
  authController.refresh(req, res, next),
);
authRouter.post('/logout', standardRateLimiter, validateCookieCsrf, (req, res, next) =>
  authController.logout(req, res, next),
);
authRouter.post('/forgot-password', authRateLimiter, (req, res, next) =>
  authController.forgotPassword(req, res, next),
);
authRouter.post('/reset-password', authRateLimiter, (req, res, next) =>
  authController.resetPassword(req, res, next),
);

// Google OAuth endpoints
authRouter.get('/google', standardRateLimiter, (req, res, next) =>
  authController.getGoogleAuthUrl(req, res, next),
);
authRouter.get('/google/callback', standardRateLimiter, (req, res, next) =>
  authController.handleGoogleCallback(req, res, next),
);

// Authenticated session endpoints
authRouter.get('/me', standardRateLimiter, requireAuth, (req, res, next) =>
  authController.getMe(req, res, next),
);
authRouter.post(
  '/logout-all',
  standardRateLimiter,
  requireAuth,
  validateCookieCsrf,
  (req, res, next) => authController.logoutAll(req, res, next),
);
authRouter.post('/change-password', standardRateLimiter, requireAuth, (req, res, next) =>
  authController.changePassword(req, res, next),
);

// Admin 2FA enrollment endpoints (Admin role gated)
authRouter.post(
  '/2fa/setup',
  standardRateLimiter,
  requireAuth,
  requireRole(UserRole.ADMIN),
  (req, res, next) => authController.setupAdmin2FA(req, res, next),
);

authRouter.post(
  '/2fa/verify',
  standardRateLimiter,
  requireAuth,
  requireRole(UserRole.ADMIN),
  (req, res, next) => authController.verifyAdmin2FA(req, res, next),
);
