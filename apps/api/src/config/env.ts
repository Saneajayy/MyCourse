import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env or .env.test depending on NODE_ENV
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env.test'), override: true });
}
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  COOKIE_DOMAIN: z.string().optional().default(''),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  TOTP_ENCRYPTION_KEY: z
    .string()
    .min(32, 'TOTP_ENCRYPTION_KEY must be at least 32 characters')
    .default('dev_totp_encryption_key_32_bytes_long_min_len!'),

  // Admin seed
  ADMIN_EMAIL: z.string().email().default('admin@hydrauliccourse.com'),
  ADMIN_PASSWORD: z.string().min(12).default('ChangeMeInProd!2026Hydraulics'),
  ADMIN_NAME: z.string().default('Administrator'),

  // Payments (Razorpay)
  RAZORPAY_KEY_ID: z.string().default('rzp_test_placeholder_key_id'),
  RAZORPAY_KEY_SECRET: z.string().default('placeholder_razorpay_secret'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('placeholder_razorpay_webhook_secret_hex'),
  PAYMENT_PROVIDER: z.enum(['razorpay', 'fake']).default('fake'),

  // Video delivery (Bunny Stream)
  BUNNY_STREAM_API_KEY: z.string().default('placeholder_bunny_api_key'),
  BUNNY_STREAM_READ_ONLY_API_KEY: z.string().optional(),
  BUNNY_STREAM_LIBRARY_ID: z.string().default('placeholder_bunny_library_id'),
  BUNNY_STREAM_TOKEN_AUTH_KEY: z.string().default('placeholder_bunny_token_auth_key'),
  BUNNY_STREAM_WEBHOOK_SECRET: z.string().optional(),
  BUNNY_STREAM_CDN_HOSTNAME: z.string().default('video.hydrauliccourse.com'),
  VIDEO_PROVIDER: z.enum(['bunny', 'fake']).default('fake'),
  MAX_CONCURRENT_STREAMS: z.coerce.number().default(2),

  // Email
  EMAIL_PROVIDER: z.enum(['console', 'resend', 'ses']).default('console'),
  EMAIL_API_KEY: z.string().default('placeholder_email_api_key'),
  EMAIL_FROM: z.string().email().default('support@hydrauliccourse.com'),

  // Optional
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // GST & Business Details
  BUSINESS_NAME: z.string().default('Hydraulic Engineering Academy'),
  BUSINESS_ADDRESS: z.string().default('123 Industrial Area, Phase 2, New Delhi, India'),
  GSTIN: z.string().default(''),
  GST_RATE_PERCENT: z.coerce.number().default(0),
  PRICES_TAX_INCLUSIVE: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('FATAL: Environment configuration validation failed:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;

export function validateProductionSafety(config: {
  nodeEnv: string;
  paymentProvider: string;
  razorpayKeyId: string;
}): void {
  if (config.nodeEnv === 'production') {
    if (config.paymentProvider === 'fake') {
      throw new Error(
        'FATAL SAFETY VIOLATION: PAYMENT_PROVIDER cannot be "fake" in production mode.',
      );
    }
    if (config.razorpayKeyId.startsWith('rzp_test_')) {
      throw new Error(
        'FATAL SAFETY VIOLATION: Cannot boot in production mode with Razorpay test keys (rzp_test_*)',
      );
    }
  }

  if (config.nodeEnv === 'test' && config.razorpayKeyId.startsWith('rzp_live_')) {
    throw new Error(
      'FATAL SAFETY VIOLATION: Cannot boot in test mode with Razorpay live keys (rzp_live_*)',
    );
  }
}

// Safety check: Refuse to boot in production with fake gateway or test keys, and in test mode with live keys
try {
  validateProductionSafety({
    nodeEnv: env.NODE_ENV,
    paymentProvider: env.PAYMENT_PROVIDER,
    razorpayKeyId: env.RAZORPAY_KEY_ID,
  });
} catch (err: any) {
  console.error(err.message);
  process.exit(1);
}

export type Env = typeof env;
