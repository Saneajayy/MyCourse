import { logger } from '../logger/logger.js';
import { uuidv7 } from 'uuidv7';

export interface EmailAttachment {
  filename: string;
  content: string | Buffer; // Base64 string or Buffer
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  idempotencyKey?: string;
  template?: string;
  userId?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
  messageId: string;
  provider: string;
}

export interface EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<EmailSendResult>;
}

export class ConsoleEmailProvider implements EmailProvider {
  public async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const mockMessageId = `console-${uuidv7()}`;
    // Log safe metadata only - NEVER log secrets, tokens, or full email bodies
    logger.info(
      {
        to: options.to,
        subject: options.subject,
        previewText: options.text.substring(0, 100),
        messageId: mockMessageId,
        template: options.template,
        hasAttachments: !!options.attachments && options.attachments.length > 0,
      },
      '📧 [DEV EMAIL DISPATCHED TO CONSOLE]',
    );

    return {
      messageId: mockMessageId,
      provider: 'console',
    };
  }
}
