import { pino } from 'pino';
import { env } from '../../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'twoFactorSecret',
      'razorpayKeySecret',
      'razorpayWebhookSecret',
      'card',
    ],
    censor: '[REDACTED]',
  },
  base: {
    service: 'course-api',
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
