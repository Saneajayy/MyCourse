import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../crypto/jwt.js';
import { prisma } from '../db/prisma.js';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error.js';
import { UserRole, UserStatus } from '@course/shared';
import { authService, AuthService } from '../../modules/auth/auth.service.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  twoFactorEnabled: boolean;
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Authentication token missing or invalid'));
    return;
  }

  const token = authHeader.substring(7).trim();

  try {
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      next(new UnauthorizedError('User account not found'));
      return;
    }

    if (user.status === UserStatus.BANNED) {
      next(new ForbiddenError('Your account has been suspended. Please contact support.'));
      return;
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      next(new UnauthorizedError('Session has been revoked. Please log in again.'));
      return;
    }

    // U2: Enforce 30-minute inactivity timeout for admin requests on server
    if (user.role === UserRole.ADMIN) {
      const nowMs = authService.getNow().getTime();
      const lastActivityMs = await authService.getAdminLastActivity(user.id);
      if (lastActivityMs !== null && nowMs - lastActivityMs > AuthService.ADMIN_INACTIVITY_TIMEOUT_MS) {
        next(
          new UnauthorizedError(
            'Admin session has expired due to 30 minutes of inactivity. Please log in again.',
          ),
        );
        return;
      }
      await authService.recordAdminActivity(user.id);
    }

    req.user = user as AuthenticatedUser;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('You do not have permission to access this resource'));
      return;
    }

    next();
  };
}

export function requireVerifiedEmail(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  if (!req.user.emailVerifiedAt) {
    next(new ForbiddenError('Please verify your email address to continue'));
    return;
  }

  next();
}

export function requireAdmin2FA(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  if (req.user.role === UserRole.ADMIN && !req.user.twoFactorEnabled) {
    next(
      new ForbiddenError(
        'Mandatory two-factor authentication setup is required for admin accounts.',
      ),
    );
    return;
  }

  next();
}
