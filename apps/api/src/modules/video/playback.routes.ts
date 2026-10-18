import { Router } from 'express';
import { playbackController } from './playback.controller.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { playbackRateLimiter, heartbeatRateLimiter } from '../../common/middleware/rate-limiter.js';

export const playbackRouter = Router();

// Lesson playback & heartbeat endpoints
// playbackRateLimiter: 600 req/min per IP (CGNAT-safe) with single-device concurrent stream enforcement in service
playbackRouter.post('/lessons/:id/playback', requireAuth, playbackRateLimiter, (req, res, next) =>
  playbackController.getPlaybackToken(req, res, next),
);

// heartbeatRateLimiter: 1,200 req/min per IP (supports 600+ concurrent students on shared network)
playbackRouter.post('/lessons/:id/heartbeat', requireAuth, heartbeatRateLimiter, (req, res, next) =>
  playbackController.recordHeartbeat(req, res, next),
);

// Student progress & enrolled courses endpoints
export const studentCourseRouter = Router();

studentCourseRouter.get('/me/courses', requireAuth, (req, res, next) =>
  playbackController.getUserCourses(req, res, next),
);

studentCourseRouter.get('/courses/:slug/progress', requireAuth, (req, res, next) =>
  playbackController.getCourseProgress(req, res, next),
);
