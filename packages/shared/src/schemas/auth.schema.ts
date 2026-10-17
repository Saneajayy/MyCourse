import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().trim().email('Invalid email address').max(255),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters long')
      .max(128, 'Password must not exceed 128 characters'),
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+ -]{10,15}$/, 'Invalid phone number format')
      .optional()
      .nullable(),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z
  .object({
    token: z.string().min(1, 'Verification token is required'),
  })
  .strict();

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email('Invalid email address'),
  })
  .strict();

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters long')
      .max(128, 'Password must not exceed 128 characters'),
  })
  .strict();

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(10, 'Password must be at least 10 characters long')
      .max(128, 'Password must not exceed 128 characters'),
  })
  .strict();

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const adminTotpVerifySchema = z
  .object({
    token: z.string().regex(/^\d{6}$/, 'TOTP token must be 6 digits'),
  })
  .strict();

export type AdminTotpVerifyInput = z.infer<typeof adminTotpVerifySchema>;
