import { Request, Response, NextFunction } from 'express';
import { sessionsService } from './sessions.service.js';
import { REFRESH_TOKEN_COOKIE_NAME } from '../../common/utils/cookie.js';
import { UnauthorizedError } from '../../common/errors/app-error.js';

export class SessionsController {
  public async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const rawCurrentToken = (req.cookies as Record<string, string | undefined>)[
        REFRESH_TOKEN_COOKIE_NAME
      ];
      const sessions = await sessionsService.listUserSessions(req.user.id, rawCurrentToken);

      res.status(200).json({
        success: true,
        data: { sessions },
      });
    } catch (err) {
      next(err);
    }
  }

  public async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { id } = req.params as { id: string };
      await sessionsService.revokeSession(req.user.id, id, req.ip, req.headers['user-agent']);

      res.status(200).json({
        success: true,
        data: { message: 'Session revoked successfully' },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const sessionsController = new SessionsController();
