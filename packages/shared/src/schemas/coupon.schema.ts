import { z } from 'zod';
import { CouponType } from '../enums.js';

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(50)
      .regex(
        /^[A-Z0-9_-]+$/,
        'Coupon code must contain only uppercase letters, numbers, hyphens, and underscores',
      ),
    type: z.nativeEnum(CouponType),
    value: z
      .number()
      .int()
      .positive('Coupon value must be a positive integer (percentage 1-100 or paise amount)'),
    maxRedemptions: z.number().int().positive().optional().nullable(),
    perUserLimit: z.number().int().positive().default(1),
    validFrom: z.coerce.date().default(() => new Date()),
    validUntil: z.coerce.date().optional().nullable(),
    productId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .strict();

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
