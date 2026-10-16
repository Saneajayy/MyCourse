import { Request, Response, NextFunction } from 'express';
import { playbackService } from './playback.service.js';
import { heartbeatSchema } from '@course/shared';

export class PlaybackController {
  public async getPlaybackToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lessonId = req.params.id as string;
      const userId = req.user!.id;
      const userAgent = req.headers['user-agent'];
      const ip = req.ip;

      const result = await playbackService.getPlaybackToken(userId, lessonId, {
        userAgent,
        ip,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async recordHeartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lessonId = req.params.id as string;
      const userId = req.user!.id;
      const input = heartbeatSchema.parse(req.body);

      const result = await playbackService.recordHeartbeat(userId, lessonId, input);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getUserCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const courses = await playbackService.getUserCourses(userId);

      res.status(200).json({
        success: true,
        data: courses,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getCourseProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const slug = req.params.slug as string;

      const progress = await playbackService.getCourseProgress(userId, slug);

      res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const playbackController = new PlaybackController();
