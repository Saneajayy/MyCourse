import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { googleOAuthService } from './google-oauth.service.js';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
} from '../../common/utils/cookie.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  adminTotpVerifySchema,
} from '@course/shared';
import { BadRequestError, UnauthorizedError } from '../../common/errors/app-error.js';
import { env } from '../../config/env.js';

export class AuthController {
  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = registerSchema.parse(req.body);
      const result = await authService.register(validatedInput, req.ip, req.headers['user-agent']);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = verifyEmailSchema.parse(req.body);
      const result = await authService.verifyEmail(token, req.ip, req.headers['user-agent']);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = loginSchema.parse(req.body);
      const result = await authService.login(validatedInput, req.ip, req.headers['user-agent']);

      if (result.requires2FA) {
        res.status(200).json({
          success: true,
          data: {
            requires2FA: true,
            tempToken: result.tempToken,
          },
        });
        return;
      }

      setRefreshTokenCookie(res, result.refreshToken);

      res.status(200).json({
        success: true,
        data: {
          requires2FA: false,
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async verify2FALogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tempToken, code } = req.body as { tempToken?: string; code?: string };
      if (!tempToken || !code) {
        throw new BadRequestError('Both tempToken and code/recovery code are required');
      }

      const result = await authService.verify2FALogin(
        tempToken,
        code,
        req.ip,
        req.headers['user-agent'],
      );
      setRefreshTokenCookie(res, result.refreshToken);

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = (req.cookies as Record<string, string | undefined>)[
        REFRESH_TOKEN_COOKIE_NAME
      ];
      if (!rawRefreshToken) {
        throw new UnauthorizedError('Refresh token cookie missing');
      }

      const result = await authService.refresh(rawRefreshToken, req.ip, req.headers['user-agent']);
      setRefreshTokenCookie(res, result.newRefreshToken);

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (err) {
      clearRefreshTokenCookie(res);
      next(err);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = (req.cookies as Record<string, string | undefined>)[
        REFRESH_TOKEN_COOKIE_NAME
      ];
      await authService.logout(rawRefreshToken);
      clearRefreshTokenCookie(res);

      res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (err) {
      next(err);
    }
  }

  public async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      await authService.logoutAll(req.user.id, req.ip, req.headers['user-agent']);
      clearRefreshTokenCookie(res);

      res.status(200).json({
        success: true,
        data: { message: 'All active sessions have been terminated' },
      });
    } catch (err) {
      next(err);
    }
  }

  public async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(email, req.ip, req.headers['user-agent']);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(
        token,
        password,
        req.ip,
        req.headers['user-agent'],
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const result = await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword,
        req.ip,
        req.headers['user-agent'],
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async setupAdmin2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = await authService.setupAdmin2FA(req.user.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async verifyAdmin2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { token } = adminTotpVerifySchema.parse(req.body);
      const result = await authService.verifyAndEnableAdmin2FA(
        req.user.id,
        token,
        req.ip,
        req.headers['user-agent'],
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getGoogleAuthUrl(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = await googleOAuthService.generateAuthUrl();
      res.status(200).json({
        success: true,
        data: { url },
      });
    } catch (err) {
      next(err);
    }
  }

  public async handleGoogleCallback(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { code, state } = req.query as { code?: string; state?: string };
      if (!code || !state) {
        throw new BadRequestError(
          'Code and state query parameters are required from Google callback',
        );
      }

      const result = await googleOAuthService.handleCallback(
        code,
        state,
        req.ip,
        req.headers['user-agent'],
      );
      setRefreshTokenCookie(res, result.refreshToken);

      // Redirect to frontend auth completion
      res.redirect(`${env.APP_URL}/auth/callback?token=${result.accessToken}`);
    } catch (err) {
      next(err);
    }
  }

  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      res.status(200).json({
        success: true,
        data: {
          user: req.user,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
