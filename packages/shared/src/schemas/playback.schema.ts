import { z } from 'zod';

export const heartbeatSchema = z
  .object({
    sessionId: z.string().min(1, 'sessionId is required'),
    positionSeconds: z.coerce.number().int().min(0, 'positionSeconds must be non-negative'),
    watchedSeconds: z.coerce.number().int().min(0, 'watchedSeconds must be non-negative'),
  })
  .strict();

export type HeartbeatInput = z.infer<typeof heartbeatSchema>;

export const adminGrantEntitlementSchema = z
  .object({
    productId: z.string().uuid('Invalid productId'),
    validityDays: z.coerce.number().int().positive().nullable().optional(), // null = lifetime
    reason: z.string().min(3, 'Reason is required for manual access grant').max(500),
  })
  .strict();

export type AdminGrantEntitlementInput = z.infer<typeof adminGrantEntitlementSchema>;

export const adminExtendEntitlementSchema = z
  .object({
    extensionDays: z.coerce.number().int().positive('Extension days must be positive'),
    reason: z.string().min(3, 'Reason is required for entitlement extension').max(500),
  })
  .strict();

export type AdminExtendEntitlementInput = z.infer<typeof adminExtendEntitlementSchema>;

export const adminRevokeEntitlementSchema = z
  .object({
    reason: z.string().min(3, 'Reason is required for entitlement revocation').max(500),
  })
  .strict();

export type AdminRevokeEntitlementInput = z.infer<typeof adminRevokeEntitlementSchema>;
