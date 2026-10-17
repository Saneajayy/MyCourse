import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { uuidv7 } from 'uuidv7';
import { prisma } from '../../common/db/prisma.js';
import { env } from '../../config/env.js';
import { emailService } from '../../common/email/email.service.js';
import { logger } from '../../common/logger/logger.js';
import { BadRequestError } from '../../common/errors/app-error.js';
import { buildEmailHtml } from '../../common/email/email.templates.js';

export const contactSubmissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or fewer'),
  email: z.string().trim().email('Valid email address is required').max(255),
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be 200 characters or fewer'),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message cannot exceed 5000 characters'),
  website: z.string().optional().default(''), // Honeypot field
  turnstileToken: z.string().optional(),
});

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;

export function checkTurnstileConfiguration(): void {
  if (env.NODE_ENV === 'production') {
    const turnstileSecret = env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;
    if (
      !turnstileSecret ||
      turnstileSecret.trim().length === 0 ||
      turnstileSecret.startsWith('dummy_')
    ) {
      logger.warn(
        'WARNING: TURNSTILE_SECRET_KEY is missing or unconfigured in production environment. Contact form CAPTCHA verification is inactive; relying on honeypot and per-IP rate limits.',
      );
    }
  }
}

export class ContactController {
  public async submitContactForm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = contactSubmissionSchema.parse(req.body);
      const clientIp =
        (req.headers['cf-connecting-ip'] as string) ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        '127.0.0.1';

      // 1. Honeypot check: If bot filled the hidden "website" field, silently return 200 success
      if (input.website && input.website.trim().length > 0) {
        logger.warn(
          { ip: clientIp, email: input.email, website: input.website },
          'Bot trapped by contact form honeypot field',
        );
        res.status(200).json({
          success: true,
          message:
            'Thank you for reaching out. We have received your inquiry and will reply shortly.',
        });
        return;
      }

      // 2. Cloudflare Turnstile Verification (conditional on secret key configured)
      const turnstileSecret = env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;
      if (
        turnstileSecret &&
        turnstileSecret.trim().length > 0 &&
        !turnstileSecret.startsWith('dummy_')
      ) {
        if (!input.turnstileToken) {
          throw new BadRequestError('Security verification required. Please complete the CAPTCHA.');
        }

        try {
          const formBody = new URLSearchParams();
          formBody.append('secret', turnstileSecret);
          formBody.append('response', input.turnstileToken);
          if (clientIp) formBody.append('remoteip', clientIp);

          const turnstileRes = await fetch(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            {
              method: 'POST',
              body: formBody,
            },
          );

          const turnstileData = (await turnstileRes.json()) as {
            success: boolean;
            'error-codes'?: string[];
          };
          if (!turnstileData.success) {
            logger.warn(
              { ip: clientIp, email: input.email, errors: turnstileData['error-codes'] },
              'Cloudflare Turnstile verification failed for contact submission',
            );
            throw new BadRequestError('CAPTCHA verification failed. Please reload and try again.');
          }
        } catch (turnstileErr) {
          if (turnstileErr instanceof BadRequestError) throw turnstileErr;
          logger.error({ turnstileErr }, 'Turnstile verification service error');
          // In development or service error, allow through or fail depending on env
          if (env.NODE_ENV === 'production') {
            throw new BadRequestError('Security verification failed. Please try again.');
          }
        }
      }

      // 3. Store submission in database
      const submission = await prisma.contactSubmission.create({
        data: {
          id: uuidv7(),
          name: input.name,
          email: input.email.toLowerCase(),
          subject: input.subject,
          message: input.message,
          ipAddress: clientIp,
          status: 'PENDING',
        },
      });

      // 4. Send notification email to course support desk
      const supportEmail = env.EMAIL_FROM || 'support@hydrauliccourse.com';
      const notificationSubject = `New Contact Form Inquiry: ${input.subject} - [${input.name}]`;
      const notificationText = `New contact form submission received on ${new Date().toUTCString()}

From: ${input.name} <${input.email}>
IP Address: ${clientIp}
Subject: ${input.subject}

Message:
${input.message}

Submission ID: ${submission.id}`;

      const contentHtml = `
        <p style="margin: 0 0 14px 0;">A new contact form submission was received from the course website.</p>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0; border: 1px solid #0A192F; background-color: #F8FAFC;">
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 700; color: #64748B;">From</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 14px; font-weight: 800; color: #0A192F;">${input.name} &lt;${input.email}&gt;</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 700; color: #64748B;">Subject</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 14px; font-weight: 800; color: #0A192F;">${input.subject}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 700; color: #64748B;">IP Address</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-family: monospace; color: #0A192F;">${clientIp}</td>
          </tr>
        </table>
        <div style="margin: 16px 0; padding: 16px; background-color: #ffffff; border: 1px solid #0A192F;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: #64748B;">Message</h4>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #0A192F; white-space: pre-wrap;">${input.message}</p>
        </div>
      `;

      const notificationHtml = buildEmailHtml({
        title: 'New Student Contact Inquiry',
        contentHtml,
        preheader: `Inquiry from ${input.name}: ${input.subject}`,
      });

      try {
        await emailService.dispatchEmail({
          to: supportEmail,
          subject: notificationSubject,
          text: notificationText,
          html: notificationHtml,
          template: 'CONTACT_FORM_SUBMISSION',
          idempotencyKey: `CONTACT:${submission.id}`,
          metadata: { submissionId: submission.id, senderEmail: input.email },
        });
      } catch (emailErr) {
        logger.error(
          { emailErr, submissionId: submission.id },
          'Failed to dispatch contact form support email',
        );
      }

      res.status(200).json({
        success: true,
        message:
          'Thank you for reaching out. We have received your inquiry and will reply shortly.',
        data: {
          submissionId: submission.id,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const contactController = new ContactController();
