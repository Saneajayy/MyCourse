import { Router } from 'express';
import { playbackController } from './playback.controller.js';
import { requireAuth } from '../../common/middleware/auth.js';
import { createRateLimiter } from '../../common/middleware/rate-limiter.js';

export const playbackRouter = Router();

// Rate limiter safe for shared mobile IPs (NAT/carrier gateway safe: 40 requests per minute)
const playbackLimiter = createRateLimiter({
  points: 40,
  duration: 60,
  keyPrefix: 'rl:playback',
});

// Lesson playback & heartbeat endpoints
playbackRouter.post('/lessons/:id/playback', requireAuth, playbackLimiter, (req, res, next) =>
  playbackController.getPlaybackToken(req, res, next),
);

playbackRouter.post('/lessons/:id/heartbeat', requireAuth, (req, res, next) =>
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
