import { z } from 'zod';

export const billingDetailsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+ -]{10,15}$/, 'Invalid phone number format')
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
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
    .optional()
    .nullable(),
});

export type BillingDetails = z.infer<typeof billingDetailsSchema>;

export const createOrderSchema = z.object({
  productId: z.string().uuid(),
  couponCode: z.string().trim().toUpperCase().optional().nullable(),
  billingDetails: billingDetailsSchema.optional().nullable(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
