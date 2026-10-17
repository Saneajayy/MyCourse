import fs from 'fs';
import path from 'path';
import { prisma } from '../../common/db/prisma.js';
import { uuidv7 } from 'uuidv7';
import {
  CreateProductInput,
  UpdateProductInput,
  CreateSectionInput,
  UpdateSectionInput,
  CreateLessonInput,
  UpdateLessonInput,
  ProductStatus,
  LessonStatus,
} from '@course/shared';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../common/errors/app-error.js';
import { auditService } from '../audit/audit.service.js';
import { getVideoProvider } from '../video/video.service.js';
import { UploadTicket } from '../video/video-provider.interface.js';
import { redisClient } from '../../common/redis/redis.js';
import { logger } from '../../common/logger/logger.js';

export class CourseService {
  /**
   * Invalidates cached public course catalog entries in Redis whenever course content is edited.
   */
  public async invalidateCatalogCache(): Promise<void> {
    try {
      await redisClient.del('catalog:courses:public');
      const keys = await redisClient.keys('catalog:course:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to clear public catalog cache in Redis');
    }
  }

  // ===========================================================================
  // ADMIN PRODUCT OPERATIONS
  // ===========================================================================

  public async listAdminProducts() {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            sections: true,
            lessons: true,
            orders: true,
          },
        },
        lessons: {
          select: {
            id: true,
            title: true,
            videoProviderId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product) => {
      const missingVideosCount = product.lessons.filter(
        (l) => !l.videoProviderId || l.status !== LessonStatus.READY,
      ).length;
      const hasMissingVideosWarning =
        product.status === ProductStatus.PUBLISHED && missingVideosCount > 0;

      return {
        ...product,
        missingVideosCount,
        hasMissingVideosWarning,
      };
    });
  }

  public async getAdminProductById(id: string) {
    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Course product not found');
    }

    // Auto-sync any processing lessons with video provider for resilient admin viewing
    const processingLessons = product.sections
      .flatMap((s) => s.lessons)
      .filter((l) => l.status === LessonStatus.PROCESSING && l.videoProviderId);

    if (processingLessons.length > 0) {
      const provider = getVideoProvider();
      await Promise.all(
        processingLessons.map(async (lesson) => {
          try {
            const details = await provider.getVideoDetails(lesson.videoProviderId!);
            if (details.status !== 'PROCESSING') {
              const newStatus =
                details.status === 'READY' ? LessonStatus.READY : LessonStatus.FAILED;
              const updated = await prisma.lesson.update({
                where: { id: lesson.id },
                data: {
                  status: newStatus,
                  durationSeconds: details.durationSeconds || lesson.durationSeconds,
                },
              });
              lesson.status = updated.status;
              lesson.durationSeconds = updated.durationSeconds;
            }
          } catch (err) {
            logger.warn({ err, lessonId: lesson.id }, 'Auto-sync failed for processing lesson');
          }
        }),
      );
    }

    const allLessons = product.sections.flatMap((s) => s.lessons);
    const missingVideosCount = allLessons.filter(
      (l) => !l.videoProviderId || l.status !== LessonStatus.READY,
    ).length;
    const hasMissingVideosWarning =
      product.status === ProductStatus.PUBLISHED && missingVideosCount > 0;

    return {
      ...product,
      missingVideosCount,
      hasMissingVideosWarning,
    };
  }

  public async createProduct(input: CreateProductInput, actorUserId: string) {
    const existing = await prisma.product.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new BadRequestError(`A course product with slug "${input.slug}" already exists`);
    }

    const productId = uuidv7();
    const product = await prisma.product.create({
      data: {
        id: productId,
        title: input.title,
        slug: input.slug,
        description: input.description,
        thumbnailUrl: input.thumbnailUrl ?? null,
        pricePaise: input.pricePaise,
        compareAtPricePaise: input.compareAtPricePaise ?? null,
        currency: input.currency ?? 'INR',
        validityDays: input.validityDays ?? null,
        allowRenewals: input.allowRenewals ?? true,
        renewalWindowDays: input.renewalWindowDays ?? 30,
        status: input.status ?? ProductStatus.DRAFT,
      },
    });

    await auditService.log({
      actorUserId,
      action: 'COURSE_PRODUCT_CREATED',
      entityType: 'Product',
      entityId: productId,
      afterState: product,
    });

    await this.invalidateCatalogCache();

    return product;
  }

  public async updateProduct(id: string, input: UpdateProductInput, actorUserId: string) {
    const current = await prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!current) {
      throw new NotFoundError('Course product not found');
    }

    if (input.slug && input.slug !== current.slug) {
      const existing = await prisma.product.findUnique({
        where: { slug: input.slug },
      });
      if (existing) {
        throw new BadRequestError(`A course product with slug "${input.slug}" already exists`);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.thumbnailUrl !== undefined ? { thumbnailUrl: input.thumbnailUrl } : {}),
        ...(input.pricePaise !== undefined ? { pricePaise: input.pricePaise } : {}),
        ...(input.compareAtPricePaise !== undefined
          ? { compareAtPricePaise: input.compareAtPricePaise }
          : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.validityDays !== undefined ? { validityDays: input.validityDays } : {}),
        ...(input.allowRenewals !== undefined ? { allowRenewals: input.allowRenewals } : {}),
        ...(input.renewalWindowDays !== undefined
          ? { renewalWindowDays: input.renewalWindowDays }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    await auditService.log({
      actorUserId,
      action: 'COURSE_PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: id,
      beforeState: current,
      afterState: updated,
    });

    await this.invalidateCatalogCache();

    return updated;
  }

  public async publishProduct(id: string, actorUserId: string) {
    return this.updateProduct(id, { status: ProductStatus.PUBLISHED }, actorUserId);
  }

  public async unpublishProduct(id: string, actorUserId: string) {
    return this.updateProduct(id, { status: ProductStatus.DRAFT }, actorUserId);
  }

  public async deleteProduct(id: string, actorUserId: string) {
    const current = await prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!current) {
      throw new NotFoundError('Course product not found');
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: ProductStatus.ARCHIVED,
      },
    });

    await auditService.log({
      actorUserId,
      action: 'COURSE_PRODUCT_DELETED',
      entityType: 'Product',
      entityId: id,
      beforeState: current,
      afterState: updated,
    });

    await this.invalidateCatalogCache();

    return { message: 'Course product archived successfully' };
  }

  // ===========================================================================
  // ADMIN SECTION OPERATIONS
  // ===========================================================================

  public async createSection(productId: string, input: CreateSectionInput, actorUserId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundError('Course product not found');
    }

    let position = input.position;
    if (position === undefined) {
      const max = await prisma.section.aggregate({
        where: { productId },
        _max: { position: true },
      });
      position = (max._max.position ?? 0) + 1;
    }

    const sectionId = uuidv7();
    const section = await prisma.section.create({
      data: {
        id: sectionId,
        productId,
        title: input.title,
        position,
        isPublished: input.isPublished ?? true,
      },
    });

    await auditService.log({
      actorUserId,
      action: 'COURSE_SECTION_CREATED',
      entityType: 'Section',
      entityId: sectionId,
      afterState: section,
    });

    await this.invalidateCatalogCache();

    return section;
  }

  public async updateSection(id: string, input: UpdateSectionInput, actorUserId: string) {
    const current = await prisma.section.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundError('Section not found');
    }

    const updated = await prisma.section.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
      },
    });

    await auditService.log({
      actorUserId,
      action: 'COURSE_SECTION_UPDATED',
      entityType: 'Section',
      entityId: id,
      beforeState: current,
      afterState: updated,
    });

    await this.invalidateCatalogCache();

    return updated;
  }

  public async deleteSection(
    id: string,
    actorUserId: string,
    options?: { confirmDeleteVideo?: boolean; force?: boolean },
  ) {
    const current = await prisma.section.findUnique({
      where: { id },
      include: {
        lessons: true,
      },
    });
    if (!current) {
      throw new NotFoundError('Section not found');
    }

    const lessonIds = current.lessons.map((l) => l.id);
    if (lessonIds.length > 0) {
      const progressCount = await prisma.lessonProgress.count({
        where: { lessonId: { in: lessonIds } },
      });
      if (progressCount > 0 && !options?.force) {
        throw new BadRequestError(
          'Cannot delete section: students have recorded progress for lessons in this section. Please confirm force deletion to proceed.',
        );
      }

      const videoIds = current.lessons
        .filter((l) => !!l.videoProviderId)
        .map((l) => l.videoProviderId!);

      if (videoIds.length > 0 && !options?.confirmDeleteVideo) {
        throw new BadRequestError(
          `Section contains ${videoIds.length} lesson(s) with videos on Bunny Stream. Please confirm video deletion to proceed.`,
        );
      }

      if (videoIds.length > 0 && options?.confirmDeleteVideo) {
        const provider = getVideoProvider();
        for (const vId of videoIds) {
          try {
            await provider.deleteVideo(vId);
          } catch (err) {
            logger.warn({ err, vId }, 'Failed to delete section lesson video from provider');
          }
        }
      }
    }

    await prisma.section.delete({ where: { id } });

    await auditService.log({
      actorUserId,
      action: 'COURSE_SECTION_DELETED',
      entityType: 'Section',
      entityId: id,
      beforeState: current,
    });

    await this.invalidateCatalogCache();

    return { message: 'Section deleted successfully' };
  }

  public async reorderSections(productId: string, orderedIds: string[], actorUserId: string) {
    const sections = await prisma.section.findMany({
      where: { productId },
      select: { id: true },
    });

    const existingIds = new Set(sections.map((s) => s.id));
    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestError(`Section ${id} does not belong to product ${productId}`);
      }
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.section.update({
          where: { id },
          data: { position: index + 1 },
        }),
      ),
    );

    await auditService.log({
      actorUserId,
      action: 'COURSE_SECTIONS_REORDERED',
      entityType: 'Product',
      entityId: productId,
      afterState: { orderedIds },
    });

    await this.invalidateCatalogCache();

    return prisma.section.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
    });
  }

  // ===========================================================================
  // ADMIN LESSON OPERATIONS
  // ===========================================================================

  public async createLesson(sectionId: string, input: CreateLessonInput, actorUserId: string) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundError('Section not found');
    }

    let position = input.position;
    if (position === undefined) {
      const max = await prisma.lesson.aggregate({
        where: { sectionId },
        _max: { position: true },
      });
      position = (max._max.position ?? 0) + 1;
    }

    const lessonId = uuidv7();
    const lesson = await prisma.lesson.create({
      data: {
        id: lessonId,
        sectionId,
        productId: section.productId,
        title: input.title,
        description: input.description ?? null,
        position,
        videoProviderId: input.videoProviderId ?? null,
        durationSeconds: input.durationSeconds ?? 0,
        isFreePreview: input.isFreePreview ?? false,
        isPublished: input.isPublished ?? true,
        status: input.status ?? LessonStatus.PROCESSING,
      },
    });

    await auditService.log({
      actorUserId,
      action: 'COURSE_LESSON_CREATED',
      entityType: 'Lesson',
      entityId: lessonId,
      afterState: lesson,
    });

    await this.invalidateCatalogCache();

    return lesson;
  }

  public async updateLesson(id: string, input: UpdateLessonInput, actorUserId: string) {
    const current = await prisma.lesson.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundError('Lesson not found');
    }

    const updated = await prisma.lesson.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.videoProviderId !== undefined ? { videoProviderId: input.videoProviderId } : {}),
        ...(input.durationSeconds !== undefined ? { durationSeconds: input.durationSeconds } : {}),
        ...(input.isFreePreview !== undefined ? { isFreePreview: input.isFreePreview } : {}),
        ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    await auditService.log({
      actorUserId,
      action: 'COURSE_LESSON_UPDATED',
      entityType: 'Lesson',
      entityId: id,
      beforeState: current,
      afterState: updated,
    });

    await this.invalidateCatalogCache();

    return updated;
  }

  public async deleteLesson(
    id: string,
    actorUserId: string,
    options?: { confirmDeleteVideo?: boolean; force?: boolean },
  ) {
    const current = await prisma.lesson.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!current) {
      throw new NotFoundError('Lesson not found');
    }

    const progressCount = await prisma.lessonProgress.count({
      where: { lessonId: id },
    });
    if (progressCount > 0 && !options?.force) {
      throw new BadRequestError(
        'Cannot delete lesson: students have recorded progress for this lesson. Archiving or unpublishing is recommended. Confirm force deletion to proceed.',
      );
    }

    if (current.videoProviderId && !options?.confirmDeleteVideo) {
      throw new BadRequestError(
        'This lesson contains an uploaded video on Bunny Stream. Confirm video deletion to proceed.',
      );
    }

    if (current.videoProviderId && options?.confirmDeleteVideo) {
      const provider = getVideoProvider();
      try {
        await provider.deleteVideo(current.videoProviderId);
      } catch (err) {
        logger.warn(
          { err, videoId: current.videoProviderId },
          'Failed to delete video from video provider',
        );
      }
    }

    await prisma.lesson.delete({ where: { id } });

    await auditService.log({
      actorUserId,
      action: 'COURSE_LESSON_DELETED',
      entityType: 'Lesson',
      entityId: id,
      beforeState: current,
    });

    await this.invalidateCatalogCache();

    return { message: 'Lesson deleted successfully' };
  }

  public async reorderLessons(sectionId: string, orderedIds: string[], actorUserId: string) {
    const lessons = await prisma.lesson.findMany({
      where: { sectionId },
      select: { id: true },
    });

    const existingIds = new Set(lessons.map((l) => l.id));
    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestError(`Lesson ${id} does not belong to section ${sectionId}`);
      }
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.lesson.update({
          where: { id },
          data: { position: index + 1 },
        }),
      ),
    );

    await auditService.log({
      actorUserId,
      action: 'COURSE_LESSONS_REORDERED',
      entityType: 'Section',
      entityId: sectionId,
      afterState: { orderedIds },
    });

    await this.invalidateCatalogCache();

    return prisma.lesson.findMany({
      where: { sectionId },
      orderBy: { position: 'asc' },
    });
  }

  public async toggleFreePreview(lessonId: string, isFreePreview: boolean, actorUserId: string) {
    return this.updateLesson(lessonId, { isFreePreview }, actorUserId);
  }

  /**
   * Generates a signed client direct TUS upload authorization ticket for Bunny Stream.
   * Large files NEVER route through Express; client uses this ticket to stream bytes directly to Bunny.
   */
  public async generateLessonUploadTicket(
    lessonId: string,
    actorUserId: string,
  ): Promise<UploadTicket> {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const provider = getVideoProvider();
    let videoId = lesson.videoProviderId;

    if (!videoId) {
      const created = await provider.createVideo(lesson.title);
      videoId = created.videoId;

      await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          videoProviderId: videoId,
          status: LessonStatus.PROCESSING,
        },
      });

      await auditService.log({
        actorUserId,
        action: 'COURSE_LESSON_VIDEO_ATTACHED',
        entityType: 'Lesson',
        entityId: lessonId,
        afterState: { videoProviderId: videoId },
      });
    }

    return provider.generateUploadTicket(videoId, lesson.title);
  }

  /**
   * Retrieves live lesson video encoding status with real-time provider fallback.
   * If a lesson is in PROCESSING state, queries the video provider (Bunny Stream)
   * to guarantee immediate consistency even if asynchronous webhooks are dropped or delayed.
   */
  public async getLessonStatus(lessonId: string): Promise<{
    status: LessonStatus;
    durationSeconds: number;
    videoProviderId: string | null;
  }> {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    if (lesson.status === LessonStatus.PROCESSING && lesson.videoProviderId) {
      try {
        const provider = getVideoProvider();
        const details = await provider.getVideoDetails(lesson.videoProviderId);
        if (details.status !== 'PROCESSING') {
          const newStatus = details.status === 'READY' ? LessonStatus.READY : LessonStatus.FAILED;
          const updated = await prisma.lesson.update({
            where: { id: lesson.id },
            data: {
              status: newStatus,
              durationSeconds: details.durationSeconds || lesson.durationSeconds,
            },
          });
          return {
            status: updated.status,
            durationSeconds: updated.durationSeconds,
            videoProviderId: updated.videoProviderId,
          };
        }
      } catch (err) {
        logger.warn({ err, lessonId }, 'Failed to query live video details from provider');
      }
    }

    return {
      status: lesson.status,
      durationSeconds: lesson.durationSeconds,
      videoProviderId: lesson.videoProviderId,
    };
  }

  // ===========================================================================
  // PUBLIC COURSE CATALOG (ZERO LEAKAGE GUARANTEED)
  // ===========================================================================

  public async listPublicCourses() {
    try {
      const cached = await redisClient.get('catalog:courses:public');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.warn({ err }, 'Failed reading public courses cache from Redis');
    }

    const products = await prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        pricePaise: true,
        compareAtPricePaise: true,
        currency: true,
        validityDays: true,
        allowRenewals: true,
        sections: {
          where: { isPublished: true },
          select: {
            lessons: {
              where: { isPublished: true },
              select: {
                id: true,
                durationSeconds: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = products.map((p) => {
      let totalLessons = 0;
      let totalDurationSeconds = 0;

      for (const section of p.sections) {
        totalLessons += section.lessons.length;
        for (const lesson of section.lessons) {
          totalDurationSeconds += lesson.durationSeconds;
        }
      }

      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        thumbnailUrl: p.thumbnailUrl,
        pricePaise: p.pricePaise,
        compareAtPricePaise: p.compareAtPricePaise,
        currency: p.currency,
        validityDays: p.validityDays,
        allowRenewals: p.allowRenewals,
        totalLessons,
        totalDurationSeconds,
      };
    });

    try {
      await redisClient.set('catalog:courses:public', JSON.stringify(result), 'EX', 300);
    } catch (err) {
      logger.warn({ err }, 'Failed writing public courses cache to Redis');
    }

    return result;
  }

  /**
   * Returns public course curriculum.
   * CRITICAL REQUIREMENT: Public catalog responses must NEVER expose video IDs,
   * URLs, or library IDs of paid lessons!
   */
  public async getPublicCourseBySlug(slug: string) {
    const cacheKey = `catalog:course:${slug}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.warn({ err }, 'Failed reading public course slug cache from Redis');
    }

    const product = await prisma.product.findFirst({
      where: {
        slug,
        status: ProductStatus.PUBLISHED,
        deletedAt: null,
      },
      include: {
        sections: {
          where: { isPublished: true },
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Course not found');
    }

    // Map curriculum with strict redaction of paid video identifiers
    // Note: Free preview playback tokens are NOT embedded here to ensure the public catalog is 100% cacheable.
    // Callers retrieve free preview playback tokens via the rate-limited /lessons/:id/preview-token endpoint.
    const sanitizedSections = product.sections.map((section) => ({
      id: section.id,
      title: section.title,
      position: section.position,
      lessons: section.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        position: lesson.position,
        durationSeconds: lesson.durationSeconds,
        isFreePreview: lesson.isFreePreview,
        status: lesson.status,
      })),
    }));

    let totalLessons = 0;
    let totalDurationSeconds = 0;
    for (const s of sanitizedSections) {
      totalLessons += s.lessons.length;
      for (const l of s.lessons) {
        totalDurationSeconds += l.durationSeconds;
      }
    }

    const response = {
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      thumbnailUrl: product.thumbnailUrl,
      pricePaise: product.pricePaise,
      compareAtPricePaise: product.compareAtPricePaise,
      currency: product.currency,
      validityDays: product.validityDays,
      allowRenewals: product.allowRenewals,
      totalLessons,
      totalDurationSeconds,
      sections: sanitizedSections,
    };

    try {
      await redisClient.set(cacheKey, JSON.stringify(response), 'EX', 300);
    } catch (err) {
      logger.warn({ err }, 'Failed writing public course slug cache to Redis');
    }

    return response;
  }

  /**
   * Generates a signed playback token for a free preview lesson.
   * Isolated from the public catalog response to keep catalog caching fast and edge-compatible.
   */
  public async getLessonPreviewToken(slug: string, lessonId: string) {
    const product = await prisma.product.findFirst({
      where: {
        slug,
        status: ProductStatus.PUBLISHED,
        deletedAt: null,
      },
      include: {
        sections: {
          where: { isPublished: true },
          include: {
            lessons: {
              where: { id: lessonId, isPublished: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Course not found');
    }

    let foundLesson: (typeof product.sections)[0]['lessons'][0] | null = null;
    for (const section of product.sections) {
      if (section.lessons.length > 0 && section.lessons[0]) {
        foundLesson = section.lessons[0];
        break;
      }
    }

    if (!foundLesson) {
      throw new NotFoundError('Lesson not found in this course');
    }

    if (!foundLesson.isFreePreview) {
      throw new ForbiddenError('This lesson is not available for free preview');
    }

    if (foundLesson.status !== LessonStatus.READY || !foundLesson.videoProviderId) {
      throw new BadRequestError('Video is still processing and is not ready for preview');
    }

    const provider = getVideoProvider();
    const playback = await provider.generatePlaybackToken(foundLesson.videoProviderId, 3600);

    return {
      lessonId: foundLesson.id,
      title: foundLesson.title,
      token: playback.token,
      expiresAt: playback.expiresAt,
      embedUrl: playback.embedUrl,
      playbackUrl: playback.playbackUrl,
    };
  }

  private validateImageMagicBytes(
    buffer: Buffer,
  ): 'image/jpeg' | 'image/png' | 'image/webp' | null {
    if (!buffer || buffer.length < 12) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'image/png';
    }

    // WebP: RIFF .... WEBP
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    if (riff === 'RIFF' && webp === 'WEBP') {
      return 'image/webp';
    }

    return null;
  }

  /**
   * Validates and saves an uploaded thumbnail image for a course product.
   * Validates MIME type (JPEG, PNG, WebP) and size (max 5MB).
   */
  public async uploadProductThumbnail(
    productId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    actorUserId: string,
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundError('Course product not found');
    }

    if (!file || !file.buffer) {
      throw new BadRequestError('No image file provided');
    }

    // Content-based magic bytes verification (B3)
    const detectedType = this.validateImageMagicBytes(file.buffer);
    if (!detectedType) {
      throw new BadRequestError(
        'Invalid file content: uploaded file is not a valid JPEG, PNG, or WebP image.',
      );
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestError(
        `Invalid image type "${file.mimetype}". Allowed types: image/jpeg, image/png, image/webp`,
      );
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      throw new BadRequestError(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed limit of 5MB`,
      );
    }

    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = mimeToExt[file.mimetype] || path.extname(file.originalname) || '.jpg';
    const filename = `thumbnail-${productId}-${Date.now()}${ext}`;

    const uploadDir = path.resolve(process.cwd(), 'uploads/thumbnails');
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const targetFilePath = path.join(uploadDir, filename);

    await fs.promises.writeFile(targetFilePath, file.buffer);
    const thumbnailUrl = `/uploads/thumbnails/${filename}`;

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { thumbnailUrl },
    });

    await auditService.log({
      actorUserId,
      action: 'COURSE_PRODUCT_THUMBNAIL_UPLOADED',
      entityType: 'Product',
      entityId: productId,
      afterState: { thumbnailUrl },
    });

    await this.invalidateCatalogCache();

    return { product: updated, thumbnailUrl };
  }
}

export const courseService = new CourseService();
