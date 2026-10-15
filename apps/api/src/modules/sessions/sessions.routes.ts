import { Router } from 'express';
import { sessionsController } from './sessions.controller.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { standardRateLimiter } from '../../common/middleware/rate-limiter.js';

export const sessionsRouter: Router = Router();

sessionsRouter.get('/', standardRateLimiter, requireAuth, (req, res, next) =>
  sessionsController.list(req, res, next),
);

sessionsRouter.delete('/:id', standardRateLimiter, requireAuth, (req, res, next) =>
  sessionsController.revoke(req, res, next),
);
