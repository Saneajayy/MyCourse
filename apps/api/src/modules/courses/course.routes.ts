import { Router } from 'express';
import multer from 'multer';
import { courseController } from './course.controller.js';
import { requireAuth, requireRole, requireAdmin2FA } from '../../common/middleware/auth.js';
import { UserRole } from '@course/shared';
import { BadRequestError } from '../../common/errors/app-error.js';
import { createRateLimiter } from '../../common/middleware/rate-limiter.js';

// Multer memory storage configured with 5MB max size and MIME type filter
const thumbnailUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Invalid image type "${file.mimetype}". Allowed types: image/jpeg, image/png, image/webp`,
        ),
      );
    }
  },
});

// ---------------------------------------------------------------------------
// ADMIN COURSE MANAGEMENT ROUTES
// Requires: Bearer Token + Role: ADMIN + Mandatory 2FA Enrolled
// ---------------------------------------------------------------------------
export const adminCourseRouter = Router();

adminCourseRouter.use(requireAuth, requireRole(UserRole.ADMIN), requireAdmin2FA);

// Products
adminCourseRouter.get('/products', (req, res, next) =>
  courseController.listAdminProducts(req, res, next),
);
adminCourseRouter.post('/products', (req, res, next) =>
  courseController.createProduct(req, res, next),
);
adminCourseRouter.get('/products/:id', (req, res, next) =>
  courseController.getAdminProductById(req, res, next),
);
adminCourseRouter.patch('/products/:id', (req, res, next) =>
  courseController.updateProduct(req, res, next),
);
adminCourseRouter.post(
  '/products/:id/thumbnail',
  thumbnailUpload.single('thumbnail'),
  (req, res, next) => courseController.uploadThumbnail(req, res, next),
);
adminCourseRouter.post('/products/:id/publish', (req, res, next) =>
  courseController.publishProduct(req, res, next),
);
adminCourseRouter.post('/products/:id/unpublish', (req, res, next) =>
  courseController.unpublishProduct(req, res, next),
);
adminCourseRouter.delete('/products/:id', (req, res, next) =>
  courseController.deleteProduct(req, res, next),
);

// Sections
adminCourseRouter.post('/products/:productId/sections', (req, res, next) =>
  courseController.createSection(req, res, next),
);
adminCourseRouter.patch('/sections/:id', (req, res, next) =>
  courseController.updateSection(req, res, next),
);
adminCourseRouter.delete('/sections/:id', (req, res, next) =>
  courseController.deleteSection(req, res, next),
);
adminCourseRouter.post('/products/:productId/sections/reorder', (req, res, next) =>
  courseController.reorderSections(req, res, next),
);

// Lessons
adminCourseRouter.post('/sections/:sectionId/lessons', (req, res, next) =>
  courseController.createLesson(req, res, next),
);
adminCourseRouter.patch('/lessons/:id', (req, res, next) =>
  courseController.updateLesson(req, res, next),
);
adminCourseRouter.delete('/lessons/:id', (req, res, next) =>
  courseController.deleteLesson(req, res, next),
);
adminCourseRouter.post('/sections/:sectionId/lessons/reorder', (req, res, next) =>
  courseController.reorderLessons(req, res, next),
);
adminCourseRouter.post('/lessons/:id/upload-ticket', (req, res, next) =>
  courseController.generateLessonUploadTicket(req, res, next),
);
adminCourseRouter.post('/lessons/:id/free-preview', (req, res, next) =>
  courseController.toggleFreePreview(req, res, next),
);

// ---------------------------------------------------------------------------
// PUBLIC COURSE CATALOG ROUTES
// Zero-leakage: never exposes paid video IDs or library IDs
// ---------------------------------------------------------------------------
export const publicCourseRouter = Router();

publicCourseRouter.get('/', (req, res, next) => courseController.listPublicCourses(req, res, next));
publicCourseRouter.get('/:slug', (req, res, next) =>
  courseController.getPublicCourseBySlug(req, res, next),
);
publicCourseRouter.get(
  '/:slug/lessons/:lessonId/preview-token',
  createRateLimiter({
    points: 15,
    duration: 60,
    keyPrefix: 'rl:preview_token',
  }),
  (req, res, next) => courseController.getLessonPreviewToken(req, res, next),
);
