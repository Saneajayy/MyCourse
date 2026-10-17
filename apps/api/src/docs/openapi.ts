import { Router } from 'express';
import { z } from 'zod';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  adminTotpVerifySchema,
  createProductSchema,
  updateProductSchema,
  createSectionSchema,
  updateSectionSchema,
  createLessonSchema,
  updateLessonSchema,
  reorderSchema,
  bunnyWebhookPayloadSchema,
  createOrderSchema,
  verifyPaymentSchema,
  createRefundSchema,
  createCouponSchema,
  billingDetailsSchema,
} from '@course/shared';

// Extend Zod prototypes with .openapi(...)
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// ---------------------------------------------------------------------------
// 1. SECURITY SCHEMES
// ---------------------------------------------------------------------------
registry.registerComponent('securitySchemes', 'BearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Standard access token passed as `Authorization: Bearer <token>`',
});

registry.registerComponent('securitySchemes', 'CookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'refresh_token',
  description: 'HttpOnly SameSite=Lax refresh token cookie',
});

// ---------------------------------------------------------------------------
// 2. COMMON SCHEMAS
// ---------------------------------------------------------------------------
const ErrorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    }),
  }),
);

const SuccessMessageResponseSchema = registry.register(
  'SuccessMessageResponse',
  z.object({
    success: z.literal(true),
    data: z.object({
      message: z.string(),
    }),
  }),
);

function SuccessResponse<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

const HealthResponseSchema = registry.register(
  'HealthResponse',
  z.object({
    success: z.literal(true),
    data: z.object({
      status: z.string(),
      timestamp: z.string(),
    }),
  }),
);

const ReadinessResponseSchema = registry.register(
  'ReadinessResponse',
  z.object({
    success: z.literal(true),
    data: z.object({
      status: z.string(),
      checks: z.object({
        database: z.string(),
        redis: z.string(),
      }),
      timestamp: z.string(),
    }),
  }),
);

const AuthSuccessResponseSchema = registry.register(
  'AuthSuccessResponse',
  z.object({
    success: z.literal(true),
    data: z.object({
      accessToken: z.string(),
      user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        name: z.string(),
        phone: z.string().nullable(),
        role: z.string(),
        emailVerifiedAt: z.string().nullable(),
        twoFactorEnabled: z.boolean(),
      }),
    }),
  }),
);

const PreviewTokenResponseSchema = registry.register(
  'PreviewTokenResponse',
  z.object({
    success: z.literal(true),
    data: z.object({
      lessonId: z.string().uuid(),
      title: z.string(),
      token: z.string(),
      expiresAt: z.number().int(),
      embedUrl: z.string().url(),
    }),
  }),
);

const UploadTicketResponseSchema = registry.register(
  'UploadTicketResponse',
  z.object({
    success: z.literal(true),
    data: z.object({
      uploadUrl: z.string().url(),
      libraryId: z.string(),
      videoId: z.string(),
      authorizationSignature: z.string(),
      authorizationExpire: z.number().int(),
    }),
  }),
);

// Register Domain Input Schemas
const RegisterInputSchema = registry.register('RegisterInput', registerSchema);
const LoginInputSchema = registry.register('LoginInput', loginSchema);
const VerifyEmailInputSchema = registry.register('VerifyEmailInput', verifyEmailSchema);
const ForgotPasswordInputSchema = registry.register('ForgotPasswordInput', forgotPasswordSchema);
const ResetPasswordInputSchema = registry.register('ResetPasswordInput', resetPasswordSchema);
const ChangePasswordInputSchema = registry.register('ChangePasswordInput', changePasswordSchema);
const AdminTotpVerifyInputSchema = registry.register('AdminTotpVerifyInput', adminTotpVerifySchema);
const CreateProductInputSchema = registry.register('CreateProductInput', createProductSchema);
const UpdateProductInputSchema = registry.register('UpdateProductInput', updateProductSchema);
const CreateSectionInputSchema = registry.register('CreateSectionInput', createSectionSchema);
const UpdateSectionInputSchema = registry.register('UpdateSectionInput', updateSectionSchema);
const CreateLessonInputSchema = registry.register('CreateLessonInput', createLessonSchema);
const UpdateLessonInputSchema = registry.register('UpdateLessonInput', updateLessonSchema);
const ReorderInputSchema = registry.register('ReorderInput', reorderSchema);
const BunnyWebhookPayloadSchema = registry.register(
  'BunnyWebhookPayload',
  bunnyWebhookPayloadSchema,
);

// ---------------------------------------------------------------------------
// 3. REGISTER PATHS
// ---------------------------------------------------------------------------

// Health Probes
registry.registerPath({
  method: 'get',
  path: '/healthz',
  tags: ['System Probes'],
  summary: 'Liveness probe',
  description: 'Returns HTTP 200 if the Node.js process is active and responsive.',
  responses: {
    200: {
      description: 'Service is alive',
      content: { 'application/json': { schema: HealthResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/readyz',
  tags: ['System Probes'],
  summary: 'Readiness probe',
  description: 'Checks connectivity to PostgreSQL and Redis. Returns 503 if dependencies fail.',
  responses: {
    200: {
      description: 'Dependencies operational',
      content: { 'application/json': { schema: ReadinessResponseSchema } },
    },
    503: {
      description: 'One or more dependencies unavailable',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// Auth Routes
registry.registerPath({
  method: 'post',
  path: '/auth/register',
  tags: ['Authentication'],
  summary: 'Student registration',
  description:
    'Registers a new student account using Argon2id. Uses zero user-enumeration response.',
  request: {
    body: {
      content: { 'application/json': { schema: RegisterInputSchema } },
    },
  },
  responses: {
    201: {
      description: 'Registration generic success response',
      content: { 'application/json': { schema: SuccessMessageResponseSchema } },
    },
    400: {
      description: 'Validation error or common/weak password',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags: ['Authentication'],
  summary: 'User login',
  description:
    'Authenticates user, issues access token in body and sets HttpOnly refresh token cookie.',
  request: {
    body: {
      content: { 'application/json': { schema: LoginInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: { 'application/json': { schema: AuthSuccessResponseSchema } },
    },
    401: {
      description: 'Invalid email or password',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    429: {
      description: 'Rate limit or brute force lockout triggered',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/verify-email',
  tags: ['Authentication'],
  summary: 'Verify email address',
  description: 'Verifies email address using single-use SHA-256 hashed verification token.',
  request: {
    body: {
      content: { 'application/json': { schema: VerifyEmailInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'Email verified successfully',
      content: { 'application/json': { schema: SuccessMessageResponseSchema } },
    },
    400: {
      description: 'Invalid or expired token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/forgot-password',
  tags: ['Authentication'],
  summary: 'Forgot password request',
  description: 'Sends password reset link. Response is generic to prevent user enumeration.',
  request: {
    body: {
      content: { 'application/json': { schema: ForgotPasswordInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'Generic success response',
      content: { 'application/json': { schema: SuccessMessageResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/reset-password',
  tags: ['Authentication'],
  summary: 'Reset password with token',
  description: 'Resets account password using single-use reset token and Argon2id hash.',
  request: {
    body: {
      content: { 'application/json': { schema: ResetPasswordInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'Password reset successfully',
      content: { 'application/json': { schema: SuccessMessageResponseSchema } },
    },
    400: {
      description: 'Invalid token or weak password',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/change-password',
  tags: ['Authentication'],
  summary: 'Change account password',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: ChangePasswordInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'Password changed successfully',
      content: { 'application/json': { schema: SuccessMessageResponseSchema } },
    },
    400: {
      description: 'Invalid current password or weak new password',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/2fa/verify',
  tags: ['Authentication'],
  summary: 'Verify admin TOTP 2FA code',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: AdminTotpVerifyInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'TOTP 2FA verified',
      content: { 'application/json': { schema: SuccessMessageResponseSchema } },
    },
    400: {
      description: 'Invalid 6-digit TOTP code or replayed token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/refresh',
  tags: ['Authentication'],
  summary: 'Rotate refresh token',
  description:
    'Rotates refresh token family. Detects token replay attacks and revokes entire family.',
  security: [{ CookieAuth: [] }],
  responses: {
    200: {
      description: 'New access token issued',
      content: { 'application/json': { schema: AuthSuccessResponseSchema } },
    },
    401: {
      description: 'Invalid or revoked refresh token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/logout',
  tags: ['Authentication'],
  summary: 'Logout current session',
  security: [{ CookieAuth: [] }],
  responses: {
    200: {
      description: 'Session revoked successfully',
      content: { 'application/json': { schema: SuccessMessageResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/logout-all',
  tags: ['Authentication'],
  summary: 'Logout all devices and sessions',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: 'All sessions revoked and tokenVersion incremented',
      content: { 'application/json': { schema: SuccessMessageResponseSchema } },
    },
  },
});

// Public Course Catalog
registry.registerPath({
  method: 'get',
  path: '/courses',
  tags: ['Public Catalog'],
  summary: 'List published courses',
  description: 'Lists all publicly published course products.',
  responses: {
    200: {
      description: 'List of published courses',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/courses/{slug}',
  tags: ['Public Catalog'],
  summary: 'Get course curriculum (cacheable)',
  description:
    'Returns full course syllabus with zero leakage of paid video identifiers. Fully edge-cacheable.',
  parameters: [
    {
      name: 'slug',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    },
  ],
  responses: {
    200: {
      description: 'Course curriculum and metadata',
    },
    404: {
      description: 'Course not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/courses/{slug}/lessons/{lessonId}/preview-token',
  tags: ['Public Catalog'],
  summary: 'Get free preview playback token',
  description:
    'Rate-limited endpoint to generate a signed playback token for free preview lessons.',
  parameters: [
    {
      name: 'slug',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    },
    {
      name: 'lessonId',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  responses: {
    200: {
      description: 'Signed playback token and embed URL',
      content: { 'application/json': { schema: PreviewTokenResponseSchema } },
    },
    403: {
      description: 'Lesson is not free preview',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Course or lesson not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// Admin Product Management
registry.registerPath({
  method: 'get',
  path: '/admin/products',
  tags: ['Admin Products'],
  summary: 'List admin products',
  security: [{ BearerAuth: [] }],
  responses: {
    200: { description: 'All products including draft and archived' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/admin/products',
  tags: ['Admin Products'],
  summary: 'Create course product',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: CreateProductInputSchema } },
    },
  },
  responses: {
    201: { description: 'Product created' },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/admin/products/{id}',
  tags: ['Admin Products'],
  summary: 'Update course product',
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  request: {
    body: {
      content: { 'application/json': { schema: UpdateProductInputSchema } },
    },
  },
  responses: {
    200: { description: 'Product updated' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/admin/products/{productId}/sections',
  tags: ['Admin Sections'],
  summary: 'Create course section',
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: 'productId',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  request: {
    body: {
      content: { 'application/json': { schema: CreateSectionInputSchema } },
    },
  },
  responses: {
    201: { description: 'Section created' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/admin/sections/{id}',
  tags: ['Admin Sections'],
  summary: 'Update course section',
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  request: {
    body: {
      content: { 'application/json': { schema: UpdateSectionInputSchema } },
    },
  },
  responses: {
    200: { description: 'Section updated' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/admin/products/{productId}/sections/reorder',
  tags: ['Admin Sections'],
  summary: 'Reorder sections within product',
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: 'productId',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  request: {
    body: {
      content: { 'application/json': { schema: ReorderInputSchema } },
    },
  },
  responses: {
    200: { description: 'Sections reordered' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/admin/sections/{sectionId}/lessons',
  tags: ['Admin Lessons'],
  summary: 'Create course lesson',
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: 'sectionId',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  request: {
    body: {
      content: { 'application/json': { schema: CreateLessonInputSchema } },
    },
  },
  responses: {
    201: { description: 'Lesson created' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/admin/lessons/{id}',
  tags: ['Admin Lessons'],
  summary: 'Update course lesson',
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  request: {
    body: {
      content: { 'application/json': { schema: UpdateLessonInputSchema } },
    },
  },
  responses: {
    200: { description: 'Lesson updated' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/admin/sections/{sectionId}/lessons/reorder',
  tags: ['Admin Lessons'],
  summary: 'Reorder lessons within section',
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: 'sectionId',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  request: {
    body: {
      content: { 'application/json': { schema: ReorderInputSchema } },
    },
  },
  responses: {
    200: { description: 'Lessons reordered' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/admin/products/{id}/thumbnail',
  tags: ['Admin Products'],
  summary: 'Upload product thumbnail image',
  description:
    'Uploads course thumbnail image. Validates MIME type (JPEG, PNG, WebP) and size (max 5MB).',
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            thumbnail: z.string().openapi({
              type: 'string',
              format: 'binary',
              description: 'Image file (JPEG, PNG, or WebP, max 5MB)',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: 'Thumbnail uploaded and URL updated' },
    400: {
      description: 'Invalid image format or oversized file',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/admin/lessons/{id}/upload-ticket',
  tags: ['Admin Lessons'],
  summary: 'Generate Bunny Stream TUS upload ticket',
  description:
    'Generates direct video upload credentials for Bunny Stream TUS protocol with expiration.',
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  responses: {
    200: {
      description: 'Upload ticket generated',
      content: { 'application/json': { schema: UploadTicketResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/admin/lessons/{id}/status',
  tags: ['Admin Lessons'],
  summary: 'Get live lesson video status and duration',
  description:
    'Returns encoding status with live provider fallback to ensure immediate consistency even if webhooks are delayed.',
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  responses: {
    200: {
      description: 'Lesson status retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              status: z.enum(['PROCESSING', 'READY', 'FAILED']),
              durationSeconds: z.number(),
              videoProviderId: z.string().nullable(),
            }),
          }),
        },
      },
    },
  },
});

// Bunny Webhook
registry.registerPath({
  method: 'post',
  path: '/webhooks/bunny',
  tags: ['Webhooks'],
  summary: 'Bunny Stream encoding webhook',
  description:
    'Asynchronous video status updates verified with X-BunnyStream-Signature and Read-Only API key.',
  request: {
    body: {
      content: { 'application/json': { schema: BunnyWebhookPayloadSchema } },
    },
  },
  responses: {
    200: { description: 'Webhook processed successfully' },
    401: {
      description: 'Invalid signature',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// Phase 4: Orders & Payments
registry.register('BillingDetails', billingDetailsSchema);
const CreateOrderInputSchema = registry.register('CreateOrderInput', createOrderSchema);
const VerifyPaymentInputSchema = registry.register('VerifyPaymentInput', verifyPaymentSchema);
const CreateRefundInputSchema = registry.register('CreateRefundInput', createRefundSchema);
const CreateCouponInputSchema = registry.register('CreateCouponInput', createCouponSchema);

registry.registerPath({
  method: 'post',
  path: '/orders',
  summary: 'Create a new course purchase order with Idempotency-Key',
  tags: ['Orders & Checkout'],
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: 'Idempotency-Key',
      in: 'header',
      required: true,
      schema: { type: 'string' },
      description: 'Unique client-generated idempotency key preventing duplicate orders',
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateOrderInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Order created successfully',
      content: {
        'application/json': {
          schema: SuccessResponse(
            z.object({ order: z.any(), razorpayOrderId: z.string().nullable() }),
          ),
        },
      },
    },
    400: {
      description: 'Bad request or unverified email',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'Idempotency key conflict',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/payments/verify',
  summary: 'Verify Razorpay payment signature from browser checkout callback',
  tags: ['Orders & Checkout'],
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: VerifyPaymentInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Payment verified and entitlement granted',
      content: {
        'application/json': {
          schema: SuccessResponse(
            z.object({ order: z.any(), entitlement: z.any(), invoice: z.any() }),
          ),
        },
      },
    },
    400: {
      description: 'Invalid signature or amount mismatch',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/webhooks/razorpay',
  summary: 'Razorpay webhook callback for captured payments and order events',
  tags: ['Webhooks'],
  parameters: [
    {
      name: 'X-Razorpay-Signature',
      in: 'header',
      required: true,
      schema: { type: 'string' },
      description: 'HMAC-SHA256 signature calculated over raw body using webhook secret',
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            event: z.string(),
            payload: z.any(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Webhook received and processed idempotently',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    401: { description: 'Invalid webhook signature' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/admin/payments/{paymentId}/refund',
  summary: 'Initiate full or partial refund via Razorpay Refund API',
  tags: ['Admin Management'],
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: 'paymentId',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateRefundInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Refund processed successfully',
      content: {
        'application/json': {
          schema: SuccessResponse(z.object({ refund: z.any(), isFullRefund: z.boolean() })),
        },
      },
    },
    400: { description: 'Invalid refund amount or already refunded' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/invoices/{id}/download',
  summary: 'Download generated PDF Tax Invoice',
  tags: ['Invoices'],
  security: [{ BearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  responses: {
    200: {
      description: 'PDF binary stream',
      content: {
        'application/pdf': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
    404: { description: 'Invoice not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/admin/coupons',
  summary: 'Create discount coupon (Admin)',
  tags: ['Admin Management'],
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCouponInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Coupon created successfully',
      content: {
        'application/json': {
          schema: SuccessResponse(z.any()),
        },
      },
    },
    400: { description: 'Bad request or code already exists' },
  },
});

// ---------------------------------------------------------------------------
// 4. GENERATE SPEC
// ---------------------------------------------------------------------------
const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiSpec = generator.generateDocument({
  openapi: '3.0.3',
  info: {
    title: 'Hydraulic Engineering Academy API',
    version: '1.0.0',
    description:
      'High-performance production REST API for Course Management, Video Delivery (Bunny Stream TUS), and Razorpay payments. Generated directly from Zod domain schemas.',
    contact: {
      name: 'Engineering Support',
      email: 'support@hydrauliccourse.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000/api/v1',
      description: 'Local Development Server',
    },
    {
      url: 'https://api.hydrauliccourse.com/api/v1',
      description: 'Production API',
    },
  ],
});

// ---------------------------------------------------------------------------
// 5. DOCUMENTATION ROUTER
// ---------------------------------------------------------------------------
export const docsRouter = Router();

// Serve raw JSON spec
docsRouter.get('/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(openApiSpec, null, 2));
});

// Serve interactive Swagger UI HTML
docsRouter.get('/', (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Hydraulic Academy API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.11.0/favicon-32x32.png" sizes="32x32" />
  <style>
    body { margin: 0; background: #0f172a; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { background: #ffffff; padding: 24px; border-radius: 8px; margin: 24px auto; max-width: 1200px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});
