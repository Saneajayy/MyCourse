import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { interactionsService } from './interactions.service.js';
import { BadRequestError, UnauthorizedError } from '../../common/errors/app-error.js';

const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(1000, 'Max 1000 characters'),
  parentId: z.string().uuid().optional().nullable(),
});

const adminReplySchema = z.object({
  content: z.string().trim().min(1, 'Reply cannot be empty').max(1000, 'Max 1000 characters'),
});

export class InteractionsController {
  async getLikes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lessonId = req.params.lessonId as string;
      if (!lessonId) {
        throw new BadRequestError('Lesson ID is required');
      }
      const userId = req.user?.id;
      const data = await interactionsService.getLessonLikes(lessonId, userId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async toggleLike(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lessonId = req.params.lessonId as string;
      if (!lessonId) {
        throw new BadRequestError('Lesson ID is required');
      }
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to like a lesson');
      }
      const data = await interactionsService.toggleLessonLike(lessonId, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lessonId = req.params.lessonId as string;
      if (!lessonId) {
        throw new BadRequestError('Lesson ID is required');
      }
      const data = await interactionsService.getLessonComments(lessonId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lessonId = req.params.lessonId as string;
      if (!lessonId) {
        throw new BadRequestError('Lesson ID is required');
      }
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to comment');
      }

      const parseResult = createCommentSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new BadRequestError(parseResult.error.errors[0]?.message || 'Invalid comment input');
      }

      const { content, parentId } = parseResult.data;
      const data = await interactionsService.createComment(
        lessonId,
        req.user.id,
        req.user.role,
        content,
        parentId,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async deleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const commentId = req.params.commentId as string;
      if (!commentId) {
        throw new BadRequestError('Comment ID is required');
      }
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const data = await interactionsService.deleteComment(commentId, req.user.id, req.user.role);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getAdminComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const lessonId = req.query.lessonId as string | undefined;
      const courseId = req.query.courseId as string | undefined;
      const search = req.query.search as string | undefined;

      const data = await interactionsService.getAdminComments({
        page,
        limit,
        lessonId,
        courseId,
        search,
      });

      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async adminReply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const commentId = req.params.commentId as string;
      if (!commentId) {
        throw new BadRequestError('Comment ID is required');
      }
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const parseResult = adminReplySchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new BadRequestError(parseResult.error.errors[0]?.message || 'Invalid reply input');
      }

      // Call adminReplyToComment
      const reply = await interactionsService.adminReplyToComment(
        commentId,
        req.user.id,
        parseResult.data.content,
      );

      res.status(201).json({ success: true, data: reply });
    } catch (err) {
      next(err);
    }
  }
}

export const interactionsController = new InteractionsController();
