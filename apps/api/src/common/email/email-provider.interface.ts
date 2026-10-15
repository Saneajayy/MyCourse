import { logger } from '../logger/logger.js';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
  public async sendEmail(options: SendEmailOptions): Promise<void> {
    logger.info(
      {
        to: options.to,
        subject: options.subject,
        previewText: options.text.substring(0, 100),
      },
      '📧 [DEV EMAIL DISPATCHED TO CONSOLE]',
    );
  }
}
