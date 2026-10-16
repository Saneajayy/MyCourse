import { uuidv7 } from 'uuidv7';
import { prisma } from '../../common/db/prisma.js';
import { getVideoProvider } from './video.service.js';
import { streamService } from './stream.service.js';
import { entitlementService } from '../entitlements/entitlement.service.js';
import { EntitlementStatus, LessonStatus, UserStatus, HeartbeatInput } from '@course/shared';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  AppError,
} from '../../common/errors/app-error.js';

export interface PlaybackResult {
  sessionId: string;
  lessonId: string;
  title: string;
  durationSeconds: number;
  playbackUrl: string;
  embedUrl: string;
  token?: string;
  expiresAt: number;
  tokenValiditySeconds: number;
  watermark: {
    text: string;
    userId: string;
  };
  progress: {
    lastPositionSeconds: number;
    watchedSeconds: number;
    isCompleted: boolean;
  };
}

export interface HeartbeatResult {
  isCompleted: boolean;
  lastPositionSeconds: number;
  watchedSeconds: number;
}

export class PlaybackService {
  private getNow: () => Date = () => new Date();

  public setClock(clockFn: () => Date): void {
    this.getNow = clockFn;
  }

  public resetClock(): void {
    this.getNow = () => new Date();
  }

  /**
   * Generates a signed playback URL (both direct HLS and embed iframe) for an entitled user.
   * Strictly verifies:
   * 1. User is not banned
   * 2. Lesson exists, is published, and status is READY
   * 3. Either lesson is a free preview OR user has ACTIVE non-expired entitlement
   * 4. Acquires concurrent stream slot in Redis (max 2 active streams, drops oldest on 3rd, fails closed on Redis down)
   * 5. Caps token TTL to min(3600s, remaining entitlement validity)
   */
  public async getPlaybackToken(
    userId: string,
    lessonId: string,
    metadata: { userAgent?: string; ip?: string } = {},
  ): Promise<PlaybackResult> {
    const now = this.getNow();

    // 1. Verify user status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenError('Account is banned');
    }

    // 2. Fetch lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        product: {
          select: { id: true, slug: true, status: true },
        },
      },
    });

    if (!lesson || !lesson.isPublished) {
      throw new NotFoundError('Lesson not found');
    }

    if (lesson.status !== LessonStatus.READY) {
      throw new BadRequestError('Lesson video is still processing and not ready for playback');
    }

    if (!lesson.videoProviderId) {
      throw new BadRequestError('Lesson has no associated video content');
    }

    // 3. Access Verification & Token Validity Calculation
    let tokenValiditySeconds = 3600; // 1 hour standard TTL

    if (!lesson.isFreePreview) {
      const entitlement = await prisma.entitlement.findFirst({
        where: {
          userId,
          productId: lesson.productId,
          status: EntitlementStatus.ACTIVE,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { expiresAt: 'desc' },
      });

      if (!entitlement) {
        throw new ForbiddenError('You do not have active access to this course');
      }

      if (entitlement.expiresAt) {
        const remainingSeconds = Math.max(
          1,
          Math.floor((entitlement.expiresAt.getTime() - now.getTime()) / 1000),
        );
        tokenValiditySeconds = Math.min(3600, remainingSeconds);
      }
    }

    // 4. Concurrency Management (Redis-backed, fails closed with 503)
    const { sessionId } = await streamService.acquireStreamSession(userId, metadata);

    // 5. Generate signed playback credentials
    const provider = getVideoProvider();
    const playbackInfo = await provider.generatePlaybackToken(
      lesson.videoProviderId,
      tokenValiditySeconds,
    );

    // 6. Fetch existing progress
    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    return {
      sessionId,
      lessonId: lesson.id,
      title: lesson.title,
      durationSeconds: lesson.durationSeconds,
      playbackUrl: playbackInfo.playbackUrl,
      embedUrl: playbackInfo.embedUrl,
      token: playbackInfo.token,
      expiresAt: playbackInfo.expiresAt,
      tokenValiditySeconds,
      watermark: {
        text: user.email,
        userId: user.id,
      },
      progress: {
        lastPositionSeconds: progress?.lastPositionSeconds ?? 0,
        watchedSeconds: progress?.watchedSeconds ?? 0,
        isCompleted: !!progress?.completedAt,
      },
    };
  }

  /**
   * Processes player heartbeat every 15-30s.
   * Updates session TTL in Redis, verifies active entitlement, clamps anomalous positions,
   * detects 90% completion, and records progress in LessonProgress.
   */
  public async recordHeartbeat(
    userId: string,
    lessonId: string,
    input: HeartbeatInput,
  ): Promise<HeartbeatResult> {
    const now = this.getNow();

    // 1. Validate stream session in Redis (fail closed)
    const isAlive = await streamService.refreshHeartbeat(userId, input.sessionId);
    if (!isAlive) {
      throw new AppError(
        401,
        'STREAM_SESSION_TERMINATED',
        'Playback session was terminated because another stream was started or access was revoked',
      );
    }

    // 2. Fetch lesson and verify entitlement at request time
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        productId: true,
        durationSeconds: true,
        isFreePreview: true,
      },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    if (!lesson.isFreePreview) {
      const hasAccess = await entitlementService.hasActiveAccess(userId, lesson.productId);
      if (!hasAccess) {
        await streamService.clearUserSessions(userId);
        throw new ForbiddenError('Course access has expired or was revoked');
      }
    }

    // 3. Anomaly Clamping
    let safePosition = input.positionSeconds;
    if (lesson.durationSeconds > 0 && safePosition > lesson.durationSeconds + 5) {
      safePosition = lesson.durationSeconds;
    }

    const prev = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    let safeWatched = input.watchedSeconds;
    if (prev) {
      const elapsedRealSeconds = Math.max(
        1,
        Math.floor((now.getTime() - prev.updatedAt.getTime()) / 1000),
      );
      const watchedDelta = safeWatched - prev.watchedSeconds;
      // Disallow watched time accelerating faster than 2x real elapsed time + 5s buffer
      if (watchedDelta > elapsedRealSeconds * 2 + 5) {
        safeWatched = prev.watchedSeconds + elapsedRealSeconds;
      }
    }

    // 4. 90% Completion Rule
    const isNinetyPercent =
      lesson.durationSeconds > 0 && safeWatched >= Math.floor(lesson.durationSeconds * 0.9);
    const completedAt = isNinetyPercent ? (prev?.completedAt ?? now) : prev?.completedAt;

    // 5. Upsert progress
    const updated = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        id: uuidv7(),
        userId,
        lessonId,
        lastPositionSeconds: safePosition,
        watchedSeconds: safeWatched,
        completedAt,
      },
      update: {
        lastPositionSeconds: safePosition,
        watchedSeconds: safeWatched,
        completedAt,
      },
    });

    return {
      isCompleted: !!updated.completedAt,
      lastPositionSeconds: updated.lastPositionSeconds,
      watchedSeconds: updated.watchedSeconds,
    };
  }

  /**
   * Lists the user's active courses with entitlement status, expiry date, overall progress,
   * and the next lesson to resume.
   */
  public async getUserCourses(userId: string) {
    const now = this.getNow();

    const entitlements = await prisma.entitlement.findMany({
      where: {
        userId,
        status: EntitlementStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        product: {
          include: {
            sections: {
              orderBy: { position: 'asc' },
              include: {
                lessons: {
                  where: { isPublished: true },
                  orderBy: { position: 'asc' },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const courses = [];

    for (const ent of entitlements) {
      const product = ent.product;
      const allLessons = product.sections.flatMap((s) => s.lessons);
      const totalLessons = allLessons.length;

      // Fetch user's progress across all lessons in this course
      const progressRecords = await prisma.lessonProgress.findMany({
        where: {
          userId,
          lessonId: { in: allLessons.map((l) => l.id) },
        },
      });

      const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));
      const completedLessons = progressRecords.filter((p) => p.completedAt !== null).length;
      const percentComplete =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      // Next lesson: first incomplete lesson, or last in-progress, or first lesson
      let nextLesson = null;
      for (const lesson of allLessons) {
        const prog = progressMap.get(lesson.id);
        if (!prog || !prog.completedAt) {
          const section = product.sections.find((s) => s.id === lesson.sectionId);
          nextLesson = {
            id: lesson.id,
            title: lesson.title,
            durationSeconds: lesson.durationSeconds,
            sectionTitle: section?.title ?? '',
            lastPositionSeconds: prog?.lastPositionSeconds ?? 0,
          };
          break;
        }
      }

      const remainingDays = ent.expiresAt
        ? Math.max(0, Math.ceil((ent.expiresAt.getTime() - now.getTime()) / (86400 * 1000)))
        : null;

      courses.push({
        product: {
          id: product.id,
          slug: product.slug,
          title: product.title,
          thumbnailUrl: product.thumbnailUrl,
        },
        entitlement: {
          id: ent.id,
          status: ent.status,
          startsAt: ent.startsAt,
          expiresAt: ent.expiresAt,
          remainingDays,
          isLifetime: ent.expiresAt === null,
        },
        progress: {
          totalLessons,
          completedLessons,
          percentComplete,
        },
        nextLesson,
      });
    }

    return courses;
  }

  /**
   * Retrieves per-lesson progress and resume positions for an entitled user.
   * IDOR protected: Caller must own active access to the course.
   */
  public async getCourseProgress(userId: string, courseSlug: string) {
    const product = await prisma.product.findUnique({
      where: { slug: courseSlug },
      include: {
        sections: {
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

    // Ownership check (IDOR protection)
    const hasAccess = await entitlementService.hasActiveAccess(userId, product.id);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have active access to this course');
    }

    const lessonIds = product.sections.flatMap((s) => s.lessons.map((l) => l.id));
    const progresses = await prisma.lessonProgress.findMany({
      where: {
        userId,
        lessonId: { in: lessonIds },
      },
    });

    const progressMap = new Map(progresses.map((p) => [p.lessonId, p]));

    const result = product.sections.map((section) => ({
      sectionId: section.id,
      title: section.title,
      lessons: section.lessons.map((lesson) => {
        const prog = progressMap.get(lesson.id);
        return {
          lessonId: lesson.id,
          title: lesson.title,
          durationSeconds: lesson.durationSeconds,
          isCompleted: !!prog?.completedAt,
          completedAt: prog?.completedAt ?? null,
          lastPositionSeconds: prog?.lastPositionSeconds ?? 0,
          watchedSeconds: prog?.watchedSeconds ?? 0,
        };
      }),
    }));

    return result;
  }
}

export const playbackService = new PlaybackService();
