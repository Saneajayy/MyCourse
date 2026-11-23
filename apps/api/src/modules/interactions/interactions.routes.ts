import { Router } from 'express';
import { interactionsController } from './interactions.controller.js';
import {
  requireAuth,
  requireRole,
  requireAdmin2FA,
  optionalAuth,
} from '../../common/middleware/auth.js';
import { UserRole } from '@course/shared';

export const interactionsRouter = Router();

// Student / Public endpoints (optional or authenticated)
interactionsRouter.get('/lessons/:lessonId/likes', optionalAuth, (req, res, next) =>
  interactionsController.getLikes(req, res, next),
);

interactionsRouter.post('/lessons/:lessonId/like', requireAuth, (req, res, next) =>
  interactionsController.toggleLike(req, res, next),
);

interactionsRouter.get('/lessons/:lessonId/comments', optionalAuth, (req, res, next) =>
  interactionsController.getComments(req, res, next),
);

interactionsRouter.post('/lessons/:lessonId/comments', requireAuth, (req, res, next) =>
  interactionsController.createComment(req, res, next),
);

interactionsRouter.delete('/comments/:commentId', requireAuth, (req, res, next) =>
  interactionsController.deleteComment(req, res, next),
);

// Admin comment management routes
export const adminInteractionsRouter = Router();

adminInteractionsRouter.use(requireAuth, requireRole(UserRole.ADMIN), requireAdmin2FA);

adminInteractionsRouter.get('/comments', (req, res, next) =>
  interactionsController.getAdminComments(req, res, next),
);

adminInteractionsRouter.post('/comments/:commentId/reply', (req, res, next) =>
  interactionsController.adminReply(req, res, next),
);

adminInteractionsRouter.delete('/comments/:commentId', (req, res, next) =>
  interactionsController.deleteComment(req, res, next),
);
