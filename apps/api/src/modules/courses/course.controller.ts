import { Request, Response, NextFunction } from 'express';
import { courseService } from './course.service.js';
import {
  createProductSchema,
  updateProductSchema,
  createSectionSchema,
  updateSectionSchema,
  createLessonSchema,
  updateLessonSchema,
  reorderSchema,
} from '@course/shared';
import { BadRequestError } from '../../common/errors/app-error.js';

export class CourseController {
  // ===========================================================================
  // ADMIN PRODUCTS
  // ===========================================================================

  public async listAdminProducts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const products = await courseService.listAdminProducts();
      res.status(200).json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  }

  public async getAdminProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await courseService.getAdminProductById(req.params.id as string);
      res.status(200).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  public async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createProductSchema.parse(req.body);
      const actorUserId = req.user!.id;
      const product = await courseService.createProduct(input, actorUserId);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  public async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateProductSchema.parse(req.body);
      const actorUserId = req.user!.id;
      const product = await courseService.updateProduct(
        req.params.id as string,
        input,
        actorUserId,
      );
      res.status(200).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  public async publishProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorUserId = req.user!.id;
      const product = await courseService.publishProduct(req.params.id as string, actorUserId);
      res.status(200).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  public async unpublishProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorUserId = req.user!.id;
      const product = await courseService.unpublishProduct(req.params.id as string, actorUserId);
      res.status(200).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  public async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorUserId = req.user!.id;
      const result = await courseService.deleteProduct(req.params.id as string, actorUserId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // ===========================================================================
  // ADMIN SECTIONS
  // ===========================================================================

  public async createSection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createSectionSchema.parse({
        ...req.body,
        productId: req.params.productId ?? req.body.productId,
      });
      const actorUserId = req.user!.id;
      const section = await courseService.createSection(
        req.params.productId as string,
        input,
        actorUserId,
      );
      res.status(201).json({ success: true, data: section });
    } catch (err) {
      next(err);
    }
  }

  public async updateSection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateSectionSchema.parse(req.body);
      const actorUserId = req.user!.id;
      const section = await courseService.updateSection(
        req.params.id as string,
        input,
        actorUserId,
      );
      res.status(200).json({ success: true, data: section });
    } catch (err) {
      next(err);
    }
  }

  public async deleteSection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorUserId = req.user!.id;
      const result = await courseService.deleteSection(req.params.id as string, actorUserId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async reorderSections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderedIds } = reorderSchema.parse(req.body);
      const actorUserId = req.user!.id;
      const sections = await courseService.reorderSections(
        req.params.productId as string,
        orderedIds,
        actorUserId,
      );
      res.status(200).json({ success: true, data: sections });
    } catch (err) {
      next(err);
    }
  }

  // ===========================================================================
  // ADMIN LESSONS
  // ===========================================================================

  public async createLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createLessonSchema.parse({
        ...req.body,
        sectionId: req.params.sectionId ?? req.body.sectionId,
      });
      const actorUserId = req.user!.id;
      const lesson = await courseService.createLesson(
        req.params.sectionId as string,
        input,
        actorUserId,
      );
      res.status(201).json({ success: true, data: lesson });
    } catch (err) {
      next(err);
    }
  }

  public async updateLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateLessonSchema.parse(req.body);
      const actorUserId = req.user!.id;
      const lesson = await courseService.updateLesson(req.params.id as string, input, actorUserId);
      res.status(200).json({ success: true, data: lesson });
    } catch (err) {
      next(err);
    }
  }

  public async deleteLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorUserId = req.user!.id;
      const result = await courseService.deleteLesson(req.params.id as string, actorUserId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async reorderLessons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderedIds } = reorderSchema.parse(req.body);
      const actorUserId = req.user!.id;
      const lessons = await courseService.reorderLessons(
        req.params.sectionId as string,
        orderedIds,
        actorUserId,
      );
      res.status(200).json({ success: true, data: lessons });
    } catch (err) {
      next(err);
    }
  }

  public async generateLessonUploadTicket(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const actorUserId = req.user!.id;
      const ticket = await courseService.generateLessonUploadTicket(
        req.params.id as string,
        actorUserId,
      );
      res.status(200).json({ success: true, data: ticket });
    } catch (err) {
      next(err);
    }
  }

  public async toggleFreePreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isFreePreview = Boolean(req.body.isFreePreview);
      const actorUserId = req.user!.id;
      const lesson = await courseService.toggleFreePreview(
        req.params.id as string,
        isFreePreview,
        actorUserId,
      );
      res.status(200).json({ success: true, data: lesson });
    } catch (err) {
      next(err);
    }
  }

  // ===========================================================================
  // PUBLIC COURSE CATALOG
  // ===========================================================================

  public async listPublicCourses(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courses = await courseService.listPublicCourses();
      res.status(200).json({ success: true, data: courses });
    } catch (err) {
      next(err);
    }
  }

  public async getPublicCourseBySlug(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const course = await courseService.getPublicCourseBySlug(req.params.slug as string);
      res.status(200).json({ success: true, data: course });
    } catch (err) {
      next(err);
    }
  }

  public async getLessonPreviewToken(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const playback = await courseService.getLessonPreviewToken(
        req.params.slug as string,
        req.params.lessonId as string,
      );
      res.status(200).json({ success: true, data: playback });
    } catch (err) {
      next(err);
    }
  }

  public async uploadThumbnail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new BadRequestError('No image file provided');
      }
      const actorUserId = req.user!.id;
      const result = await courseService.uploadProductThumbnail(
        req.params.id as string,
        req.file,
        actorUserId,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const courseController = new CourseController();
