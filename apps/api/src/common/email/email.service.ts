import { Queue, Worker } from 'bullmq';
import { env } from '../../config/env.js';
import { logger } from '../logger/logger.js';
import {
  EmailProvider,
  ConsoleEmailProvider,
  SendEmailOptions,
} from './email-provider.interface.js';

export class EmailService {
  private provider: EmailProvider;
  private queue?: Queue;
  private worker?: Worker;

  constructor() {
    this.provider = new ConsoleEmailProvider();

    // In test mode, we skip active Redis worker to keep tests fast and isolated
    if (env.NODE_ENV !== 'test') {
      try {
        const connection = { url: env.REDIS_URL };
        this.queue = new Queue('email_delivery', { connection });

        this.worker = new Worker(
          'email_delivery',
          async (job) => {
            const options = job.data as SendEmailOptions;
            await this.provider.sendEmail(options);
          },
          { connection },
        );

        this.worker.on('failed', (job, err) => {
          logger.error({ jobId: job?.id, err }, 'Email background job failed');
        });
      } catch (err) {
        logger.error({ err }, 'Failed to initialize BullMQ email queue');
      }
    }
  }

  public async dispatchEmail(options: SendEmailOptions): Promise<void> {
    if (this.queue) {
      await this.queue.add('send', options, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      });
    } else {
      await this.provider.sendEmail(options);
    }
  }

  public async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`;
    const subject = 'Verify your email address - Hydraulic Engineering Academy';
    const text = `Hello ${name},\n\nPlease verify your email by clicking the following link:\n${verifyUrl}\n\nThis link expires in 24 hours.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #000; padding: 24px; color: #0a192f; background-color: #fff;">
        <h2 style="color: #0a192f; border-bottom: 2px solid #e05305; padding-bottom: 8px;">Verify Your Email Address</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Thank you for registering at Hydraulic Engineering Academy. Please verify your email address to proceed with course access and checkout.</p>
        <div style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background-color: #e05305; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; border: 1px solid #000; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="font-size: 12px; color: #64748b;">This verification link will expire in 24 hours.</p>
      </div>
    `;

    await this.dispatchEmail({ to, subject, text, html });
  }

  public async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
    const subject = 'Password Reset Request - Hydraulic Engineering Academy';
    const text = `Hello ${name},\n\nYou requested a password reset. Click the link below to set a new password:\n${resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, please ignore this email.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #000; padding: 24px; color: #0a192f; background-color: #fff;">
        <h2 style="color: #0a192f; border-bottom: 2px solid #e05305; padding-bottom: 8px;">Reset Your Password</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to choose a new password:</p>
        <div style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #e05305; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; border: 1px solid #000; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 12px; color: #64748b;">This link will expire in 30 minutes. If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

    await this.dispatchEmail({ to, subject, text, html });
  }

  public async close(): Promise<void> {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }
}

export const emailService = new EmailService();
