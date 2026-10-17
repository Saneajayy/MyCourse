import { EmailProvider, EmailSendResult, SendEmailOptions } from './email-provider.interface.js';
import { logger } from '../logger/logger.js';

export interface ResendProviderConfig {
  apiKey: string;
  fromAddress: string;
  timeoutMs?: number;
}

export class RateLimitExceededError extends Error {
  public readonly retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds = 1) {
    super(message);
    this.name = 'RateLimitExceededError';
    this.retryAfterSeconds = retryAfterSeconds;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ResendEmailProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly fromAddress: string;
  private readonly timeoutMs: number;

  constructor(config: ResendProviderConfig) {
    if (!config.apiKey) {
      throw new Error('ResendEmailProvider requires an API key.');
    }
    this.apiKey = config.apiKey;
    this.fromAddress = config.fromAddress;
    this.timeoutMs = config.timeoutMs || 10000; // 10s default timeout
  }

  public async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const payload: Record<string, unknown> = {
        from: this.fromAddress,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      if (options.attachments && options.attachments.length > 0) {
        payload.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
          content_type: att.contentType,
        }));
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CourseApp-EmailService/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: await response.text() };
        }

        const errorMessage =
          errorData?.message || `Resend HTTP error ${response.status}: ${response.statusText}`;

        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('retry-after');
          let retryAfterSeconds = 1;
          if (retryAfterHeader) {
            const parsed = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsed) && parsed > 0) {
              retryAfterSeconds = parsed;
            }
          }
          logger.warn(
            {
              status: response.status,
              retryAfterSeconds,
              to: options.to,
              template: options.template,
            },
            'Resend rate limit (429) encountered; honoring retry-after header',
          );
          throw new RateLimitExceededError(
            `Resend rate limit exceeded (429): ${errorMessage}`,
            retryAfterSeconds,
          );
        }

        logger.error(
          {
            status: response.status,
            to: options.to,
            template: options.template,
            error: errorMessage,
          },
          'Resend API error dispatching email',
        );
        throw new Error(`Resend email dispatch failed: ${errorMessage}`);
      }

      const resData = (await response.json()) as { id: string };
      logger.info(
        {
          messageId: resData.id,
          to: options.to,
          template: options.template,
        },
        'Email successfully dispatched via Resend',
      );

      return {
        messageId: resData.id,
        provider: 'resend',
      };
    } catch (err: unknown) {
      if ((err as any)?.name === 'AbortError') {
        throw new Error(`Resend email request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
