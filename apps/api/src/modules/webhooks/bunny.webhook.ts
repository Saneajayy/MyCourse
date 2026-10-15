import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../common/db/prisma.js';
import { uuidv7 } from 'uuidv7';
import { getVideoProvider } from '../video/video.service.js';
import { logger } from '../../common/logger/logger.js';
import { LessonStatus, WebhookEventStatus, bunnyWebhookPayloadSchema } from '@course/shared';
import { UnauthorizedError } from '../../common/errors/app-error.js';

export class BunnyWebhookController {
  public async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature =
        (req.headers['x-bunnystream-signature'] as string) ||
        (req.headers['bunny-signature'] as string) ||
        '';

      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const provider = getVideoProvider();

      // 1. Cryptographically verify signature in constant time
      const isValid = provider.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        logger.warn({ ip: req.ip }, 'Rejected Bunny webhook with invalid signature');
        throw new UnauthorizedError('Invalid webhook signature');
      }

      // 2. Validate payload schema
      const payload = bunnyWebhookPayloadSchema.parse(req.body);
      const eventKey = `${payload.VideoGuid}-${payload.Status}`;

      // 3. Idempotency check: prevent duplicate event processing
      const existingEvent = await prisma.webhookEvent.findUnique({
        where: { providerEventId: `bunny_${eventKey}` },
      });

      if (existingEvent) {
        logger.info({ eventKey }, 'Ignoring duplicate Bunny webhook event');
        res.status(200).json({ success: true, message: 'Event already processed' });
        return;
      }

      // Create pending event record
      const eventId = uuidv7();
      await prisma.webhookEvent.create({
        data: {
          id: eventId,
          provider: 'bunny',
          providerEventId: `bunny_${eventKey}`,
          eventType: `video.status.${payload.Status}`,
          payload: req.body as any,
          status: WebhookEventStatus.PENDING,
        },
      });

      // 4. Find matching lesson by video provider ID
      const lesson = await prisma.lesson.findFirst({
        where: { videoProviderId: payload.VideoGuid },
      });

      if (!lesson) {
        logger.info(
          { videoGuid: payload.VideoGuid },
          'Bunny webhook received for unlinked video GUID',
        );
        await prisma.webhookEvent.update({
          where: { id: eventId },
          data: { status: WebhookEventStatus.IGNORED, processedAt: new Date() },
        });
        res.status(200).json({ success: true, message: 'Unlinked video event acknowledged' });
        return;
      }

      // 5. Status Transition:
      // Status 3: Finished | Status 4: Resolution finished -> READY
      // Status 5: Failed | Status 8: PresignedUploadFailed -> FAILED
      if (payload.Status === 3 || payload.Status === 4) {
        let durationSeconds = lesson.durationSeconds;
        try {
          const details = await provider.getVideoDetails(payload.VideoGuid);
          if (details.durationSeconds > 0) {
            durationSeconds = details.durationSeconds;
          }
        } catch (fetchErr) {
          logger.warn({ fetchErr, videoGuid: payload.VideoGuid }, 'Could not fetch video length');
        }

        await prisma.lesson.update({
          where: { id: lesson.id },
          data: {
            status: LessonStatus.READY,
            durationSeconds,
          },
        });

        logger.info(
          { lessonId: lesson.id, videoGuid: payload.VideoGuid, durationSeconds },
          'Lesson video transitioned to READY',
        );
      } else if (payload.Status === 5 || payload.Status === 8) {
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: { status: LessonStatus.FAILED },
        });

        logger.warn(
          { lessonId: lesson.id, videoGuid: payload.VideoGuid },
          'Lesson video transitioned to FAILED',
        );
      } else {
        // Status 0 (Queued), 1 (Processing), 2 (Encoding)
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: { status: LessonStatus.PROCESSING },
        });
      }

      // Mark webhook processed
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: { status: WebhookEventStatus.PROCESSED, processedAt: new Date() },
      });

      res.status(200).json({
        success: true,
        message: 'Bunny webhook processed successfully',
        data: {
          lessonId: lesson.id,
          videoGuid: payload.VideoGuid,
          status: payload.Status,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Fallback polling worker to catch missed or delayed webhooks.
   * Periodically checks all lessons in PROCESSING status.
   */
  public async syncProcessingVideos(): Promise<{ checked: number; updated: number }> {
    const provider = getVideoProvider();
    const processingLessons = await prisma.lesson.findMany({
      where: {
        status: LessonStatus.PROCESSING,
        videoProviderId: { not: null },
      },
    });

    let updatedCount = 0;

    for (const lesson of processingLessons) {
      if (!lesson.videoProviderId) continue;

      try {
        const details = await provider.getVideoDetails(lesson.videoProviderId);
        if (details.status !== 'PROCESSING') {
          const newStatus =
            details.status === 'READY' ? LessonStatus.READY : LessonStatus.FAILED;

          await prisma.lesson.update({
            where: { id: lesson.id },
            data: {
              status: newStatus,
              durationSeconds: details.durationSeconds || lesson.durationSeconds,
            },
          });

          updatedCount++;
          logger.info(
            { lessonId: lesson.id, newStatus, duration: details.durationSeconds },
            'Synced processing video status via polling fallback',
          );
        }
      } catch (err) {
        logger.error(
          { err, lessonId: lesson.id, videoId: lesson.videoProviderId },
          'Polling fallback sync failed for lesson',
        );
      }
    }

    return { checked: processingLessons.length, updated: updatedCount };
  }
}

export const bunnyWebhookController = new BunnyWebhookController();
