import { Queue, Worker } from 'bullmq';
import { uuidv7 } from 'uuidv7';
import { env } from '../../config/env.js';
import { logger } from '../logger/logger.js';
import { prisma } from '../db/prisma.js';
import { EmailLogStatus, Prisma } from '@prisma/client';
import {
  EmailProvider,
  ConsoleEmailProvider,
  SendEmailOptions,
  EmailSendResult,
} from './email-provider.interface.js';
import { ResendEmailProvider } from './resend-email.provider.js';
import {
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getPasswordChangedTemplate,
  getOrderReceiptTemplate,
  getRefundConfirmationTemplate,
  getAdminAccessGrantedTemplate,
  getAccountExistsNoticeTemplate,
} from './email.templates.js';

export interface EmailJobData {
  emailLogId: string;
  options: SendEmailOptions;
}

export class EmailService {
  private provider: EmailProvider;
  private queue: Queue<EmailJobData> | null = null;
  private worker: Worker<EmailJobData> | null = null;
  private isProcessingDirectly: boolean;

  constructor() {
    // 1. Initialize Email Provider
    if (env.EMAIL_PROVIDER === 'resend') {
      this.provider = new ResendEmailProvider({
        apiKey: env.EMAIL_API_KEY,
        fromAddress: env.EMAIL_FROM,
      });
      logger.info('EmailService initialized with Resend provider');
    } else {
      this.provider = new ConsoleEmailProvider();
      logger.info('EmailService initialized with Console provider');
    }

    // Direct mode in test or if worker disabled
    this.isProcessingDirectly = env.NODE_ENV === 'test';

    // 2. Initialize BullMQ Queue and Worker
    try {
      const connection = { url: env.REDIS_URL };
      this.queue = new Queue<EmailJobData>('email_delivery', { connection });

      // In production and dev, start background worker
      if (env.NODE_ENV !== 'test') {
        this.worker = new Worker<EmailJobData>(
          'email_delivery',
          async (job) => {
            await this.processJob(job.data, job.attemptsMade, job.opts.attempts || 4, job.id);
          },
          { connection, concurrency: 5 },
        );

        this.worker.on('failed', (job, err) => {
          logger.error(
            { jobId: job?.id, emailLogId: job?.data?.emailLogId, error: err.message },
            'BullMQ email job failed attempt',
          );
        });
      }
    } catch (err) {
      logger.error(
        { err },
        'Failed to initialize BullMQ email queue; running in direct fallback mode',
      );
      this.isProcessingDirectly = true;
    }
  }

  /**
   * For testing: allows overriding the provider and worker mode
   */
  public setProviderForTesting(provider: EmailProvider): void {
    this.provider = provider;
  }

  public getProvider(): EmailProvider {
    return this.provider;
  }

  public setDirectModeForTesting(direct: boolean): void {
    this.isProcessingDirectly = direct;
  }

  /**
   * Core Job Processor: Handles suppression check, provider dispatch, retry increments, and dead-letter state.
   */
  public async processJob(
    data: EmailJobData,
    attemptsMade: number,
    maxAttempts = 4,
    jobId?: string,
  ): Promise<EmailSendResult | null> {
    const { emailLogId, options } = data;
    const currentAttempt = attemptsMade + 1;

    // 1. Check suppression list before attempting send
    const isSuppressed = await prisma.emailSuppression.findUnique({
      where: { email: options.to.toLowerCase() },
    });

    if (isSuppressed) {
      logger.warn(
        { recipient: options.to, reason: isSuppressed.reason, template: options.template },
        'Email dispatch skipped: recipient address is suppressed (bounce or complaint)',
      );

      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          status: EmailLogStatus.FAILED,
          errorMessage: `RECIPIENT_SUPPRESSED: Recipient is on suppression list (${isSuppressed.reason})`,
          failedAt: new Date(),
          lastAttemptAt: new Date(),
          attempts: currentAttempt,
        },
      });

      return null;
    }

    // 2. Update attempt counter in EmailLog
    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        attempts: currentAttempt,
        lastAttemptAt: new Date(),
      },
    });

    try {
      // 3. Dispatch via configured provider
      const result = await this.provider.sendEmail(options);

      // 4. Mark SENT
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          status: EmailLogStatus.SENT,
          providerMessageId: result.messageId,
          sentAt: new Date(),
          errorMessage: null,
        },
      });

      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Check if final attempt has been reached (dead-letter state)
      if (currentAttempt >= maxAttempts) {
        // DEAD-LETTER STATE: log at error level, never log full email body or secrets
        logger.error(
          {
            jobId,
            emailLogId,
            recipient: options.to,
            template: options.template,
            attempts: currentAttempt,
            error: errorMsg,
          },
          'Email dead-lettered after maximum retry attempts',
        );

        await prisma.emailLog.update({
          where: { id: emailLogId },
          data: {
            status: EmailLogStatus.FAILED,
            errorMessage: errorMsg,
            failedAt: new Date(),
          },
        });
      } else {
        // Update error message for intermediate attempt
        await prisma.emailLog.update({
          where: { id: emailLogId },
          data: {
            errorMessage: `Attempt ${currentAttempt} failed: ${errorMsg}`,
          },
        });
      }

      throw err;
    }
  }

  /**
   * Dispatches an email with idempotency enforcement and suppression checking.
   */
  public async dispatchEmail(
    options: SendEmailOptions,
  ): Promise<{ emailLogId: string; status: EmailLogStatus }> {
    const recipient = options.to.toLowerCase().trim();

    // 1. Idempotency Check: if idempotencyKey provided, check if already sent or queued
    if (options.idempotencyKey) {
      const existing = await prisma.emailLog.findUnique({
        where: { idempotencyKey: options.idempotencyKey },
      });

      if (existing) {
        if (existing.status === EmailLogStatus.SENT || existing.status === EmailLogStatus.QUEUED) {
          logger.info(
            { idempotencyKey: options.idempotencyKey, recipient, template: options.template },
            'Duplicate email event skipped: idempotency key already processed or queued',
          );
          return { emailLogId: existing.id, status: existing.status };
        }
      }
    }

    // 2. Check Suppression List: Skip send immediately if address is bounced or complained
    const isSuppressed = await prisma.emailSuppression.findUnique({
      where: { email: recipient },
    });

    if (isSuppressed) {
      logger.warn(
        { recipient, reason: isSuppressed.reason, template: options.template },
        'Email dispatch skipped at ingestion: recipient is suppressed',
      );

      const log = await prisma.emailLog.create({
        data: {
          id: uuidv7(),
          template: options.template || 'GENERIC',
          recipient,
          subject: options.subject,
          status: EmailLogStatus.FAILED,
          errorMessage: `RECIPIENT_SUPPRESSED: Recipient is on suppression list (${isSuppressed.reason})`,
          idempotencyKey: options.idempotencyKey || null,
          userId: options.userId || null,
          orderId: options.orderId || null,
          metadata: options.metadata ? (options.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
          failedAt: new Date(),
          lastAttemptAt: new Date(),
          attempts: 0,
        },
      });

      return { emailLogId: log.id, status: EmailLogStatus.FAILED };
    }

    // 3. Create initial EmailLog entry with status QUEUED
    let emailLog;
    if (options.idempotencyKey) {
      // Upsert to handle concurrent race conditions cleanly
      emailLog = await prisma.emailLog.upsert({
        where: { idempotencyKey: options.idempotencyKey },
        create: {
          id: uuidv7(),
          template: options.template || 'GENERIC',
          recipient,
          subject: options.subject,
          status: EmailLogStatus.QUEUED,
          idempotencyKey: options.idempotencyKey,
          userId: options.userId || null,
          orderId: options.orderId || null,
          metadata: options.metadata ? (options.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
          attempts: 0,
        },
        update: {
          status: EmailLogStatus.QUEUED,
          errorMessage: null,
        },
      });
    } else {
      emailLog = await prisma.emailLog.create({
        data: {
          id: uuidv7(),
          template: options.template || 'GENERIC',
          recipient,
          subject: options.subject,
          status: EmailLogStatus.QUEUED,
          userId: options.userId || null,
          orderId: options.orderId || null,
          metadata: options.metadata ? (options.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
          attempts: 0,
        },
      });
    }

    const jobData: EmailJobData = {
      emailLogId: emailLog.id,
      options: { ...options, to: recipient },
    };

    // 4. Enqueue or Process Directly
    if (this.isProcessingDirectly || !this.queue) {
      try {
        await this.processJob(jobData, 0, 1);
        return { emailLogId: emailLog.id, status: EmailLogStatus.SENT };
      } catch {
        return { emailLogId: emailLog.id, status: EmailLogStatus.FAILED };
      }
    } else {
      await this.queue.add('send', jobData, {
        attempts: 4,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      });
      return { emailLogId: emailLog.id, status: EmailLogStatus.QUEUED };
    }
  }

  // -------------------------------------------------------------------------
  // High-Level Template Methods (All 7 Transactional Templates)
  // -------------------------------------------------------------------------

  /**
   * 1. Email Verification
   */
  public async sendVerificationEmail(
    to: string,
    name: string,
    token: string,
    userId?: string,
  ): Promise<void> {
    const template = getEmailVerificationTemplate({ name, token });
    await this.dispatchEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      template: 'EMAIL_VERIFICATION',
      idempotencyKey: `VERIFY:${to.toLowerCase()}:${token}`,
      userId,
    });
  }

  /**
   * 2. Password Reset
   */
  public async sendPasswordResetEmail(
    to: string,
    name: string,
    token: string,
    userId?: string,
  ): Promise<void> {
    const template = getPasswordResetTemplate({ name, token });
    await this.dispatchEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      template: 'PASSWORD_RESET',
      idempotencyKey: `RESET:${to.toLowerCase()}:${token}`,
      userId,
    });
  }

  /**
   * 3. Password Changed Notice (Security)
   */
  public async sendPasswordChangedNotice(
    to: string,
    name: string,
    userId?: string,
    changedAt = new Date(),
  ): Promise<void> {
    const template = getPasswordChangedTemplate({ name, changedAt });
    await this.dispatchEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      template: 'PASSWORD_CHANGED',
      idempotencyKey: `PWD_CHANGED:${userId || to}:${Math.floor(changedAt.getTime() / 60000)}`,
      userId,
    });
  }

  /**
   * 4. Purchase Receipt & Invoice
   */
  public async sendOrderReceiptEmail(params: {
    to: string;
    name: string;
    courseTitle: string;
    invoiceNumber: string;
    amountPaise: number;
    orderId: string;
    userId?: string;
    expiresAt?: Date | null;
    pdfBuffer?: Buffer;
  }): Promise<void> {
    const template = getOrderReceiptTemplate({
      name: params.name,
      courseTitle: params.courseTitle,
      invoiceNumber: params.invoiceNumber,
      amountPaise: params.amountPaise,
      orderId: params.orderId,
      expiresAt: params.expiresAt,
    });

    const attachments = params.pdfBuffer
      ? [
          {
            filename: `Invoice-${params.invoiceNumber}.pdf`,
            content: params.pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : undefined;

    await this.dispatchEmail({
      to: params.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      attachments,
      template: 'ORDER_RECEIPT',
      idempotencyKey: `ORDER_RECEIPT:${params.orderId}`,
      userId: params.userId,
      orderId: params.orderId,
      metadata: { invoiceNumber: params.invoiceNumber, amountPaise: params.amountPaise },
    });
  }

  /**
   * 5. Refund Confirmation
   */
  public async sendRefundConfirmationEmail(params: {
    to: string;
    name: string;
    courseTitle: string;
    orderId: string;
    refundId: string;
    amountPaise: number;
    reason?: string;
    userId?: string;
  }): Promise<void> {
    const template = getRefundConfirmationTemplate({
      name: params.name,
      courseTitle: params.courseTitle,
      orderId: params.orderId,
      amountPaise: params.amountPaise,
      reason: params.reason,
    });

    await this.dispatchEmail({
      to: params.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      template: 'REFUND_CONFIRMATION',
      idempotencyKey: `REFUND_CONFIRMATION:${params.refundId}`,
      userId: params.userId,
      orderId: params.orderId,
      metadata: { refundId: params.refundId, amountPaise: params.amountPaise },
    });
  }

  /**
   * 6. Course Access Granted by Admin
   */
  public async sendAdminAccessGrantedEmail(params: {
    to: string;
    name: string;
    courseTitle: string;
    slug: string;
    entitlementId: string;
    expiresAt?: Date | null;
    userId?: string;
  }): Promise<void> {
    const template = getAdminAccessGrantedTemplate({
      name: params.name,
      courseTitle: params.courseTitle,
      slug: params.slug,
      expiresAt: params.expiresAt,
    });

    await this.dispatchEmail({
      to: params.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      template: 'ADMIN_ACCESS_GRANTED',
      idempotencyKey: `ADMIN_ACCESS:${params.entitlementId}`,
      userId: params.userId,
    });
  }

  /**
   * 7. Account Exists Security Notice
   */
  public async sendAccountExistsEmail(to: string, name: string): Promise<void> {
    const template = getAccountExistsNoticeTemplate({ name });
    // Cooldown 5 minutes to prevent spamming on repeated attempts
    const cooldownBucket = Math.floor(Date.now() / (5 * 60 * 1000));
    await this.dispatchEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      template: 'ACCOUNT_EXISTS_NOTICE',
      idempotencyKey: `ACCOUNT_EXISTS:${to.toLowerCase()}:${cooldownBucket}`,
    });
  }

  /**
   * Checks if an email address is currently in the suppression list
   */
  public async isSuppressed(email: string): Promise<boolean> {
    const record = await prisma.emailSuppression.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    return record !== null;
  }

  public async close(): Promise<void> {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }
}

export const emailService = new EmailService();
