import { env } from '../../config/env.js';
import { logger } from '../logger/logger.js';

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  skipped?: boolean;
}

/**
 * Validates Cloudflare Turnstile token if TURNSTILE_SECRET_KEY is configured in the environment.
 * If unconfigured or dummy, passes through gracefully in development/test environments.
 */
export async function verifyTurnstileToken(
  token?: string,
  clientIp?: string,
): Promise<TurnstileVerificationResult> {
  const secret = env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;

  // Pass through if not configured or dummy
  if (!secret || secret.trim().length === 0 || secret.startsWith('dummy_')) {
    return { success: true, skipped: true };
  }

  // If configured in production, token is required
  if (!token) {
    return {
      success: false,
      error: 'Security verification required. Please complete the CAPTCHA.',
    };
  }

  try {
    const formBody = new URLSearchParams();
    formBody.append('secret', secret);
    formBody.append('response', token);
    if (clientIp) formBody.append('remoteip', clientIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formBody,
    });

    const data = (await res.json()) as {
      success: boolean;
      'error-codes'?: string[];
    };

    if (!data.success) {
      logger.warn(
        { clientIp, errors: data['error-codes'] },
        'Cloudflare Turnstile token validation failed',
      );
      return {
        success: false,
        error: 'Security challenge failed. Please reload and try again.',
      };
    }

    return { success: true };
  } catch (err) {
    logger.error({ err }, 'Turnstile verification service error');
    // In production fail-closed; in dev allow through
    if (env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'Security verification service temporarily unavailable.',
      };
    }
    return { success: true, skipped: true };
  }
}
