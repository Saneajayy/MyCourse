import { z } from 'zod';

export const billingDetailsSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    phone: z
      .string()
      .trim()
      .refine((val) => !val || /^[0-9+ -]{10,15}$/.test(val), {
        message: 'Invalid phone number format',
      })
      .transform((val) => (val && val.trim() ? val.trim() : null))
      .optional()
      .nullable(),
    address: z.string().trim().max(255).optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    state: z.string().trim().max(100).optional().nullable(),
    postalCode: z.string().trim().max(20).optional().nullable(),
    country: z.string().trim().default('IN'),
    gstin: z
      .string()
      .trim()
      .refine(
        (val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
        {
          message: 'Invalid GSTIN format',
        },
      )
      .transform((val) => (val && val.trim() ? val.trim().toUpperCase() : null))
      .optional()
      .nullable(),
  })
  .strict();

export type BillingDetails = z.infer<typeof billingDetailsSchema>;

export const createOrderSchema = z
  .object({
    productId: z.string().uuid(),
    couponCode: z
      .string()
      .trim()
      .transform((val) => (val && val.trim() ? val.trim().toUpperCase() : null))
      .optional()
      .nullable(),
    billingDetails: billingDetailsSchema.optional().nullable(),
    utmSource: z
      .string()
      .trim()
      .max(100)
      .transform((val) => (val && val.trim() ? val.trim() : null))
      .optional()
      .nullable(),
    utmMedium: z
      .string()
      .trim()
      .max(100)
      .transform((val) => (val && val.trim() ? val.trim() : null))
      .optional()
      .nullable(),
    utmCampaign: z
      .string()
      .trim()
      .max(100)
      .transform((val) => (val && val.trim() ? val.trim() : null))
      .optional()
      .nullable(),
  })
  .strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const verifyPaymentSchema = z
  .object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  })
  .strict();

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export const createRefundSchema = z
  .object({
    amountPaise: z.number().int().positive().optional().nullable(),
    reason: z.string().trim().max(255).optional().nullable(),
  })
  .strict();

export type CreateRefundInput = z.infer<typeof createRefundSchema>;
