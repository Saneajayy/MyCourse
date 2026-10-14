import { z } from 'zod';
import { ProductStatus, LessonStatus } from '../enums.js';

export const createProductSchema = z.object({
  title: z.string().trim().min(3).max(255),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be URL-safe (lowercase alphanumeric with hyphens)',
    ),
  description: z.string().trim().min(10).max(5000),
  thumbnailUrl: z.string().url().optional().nullable(),
  pricePaise: z.number().int().nonnegative('Price must be non-negative integer in paise'),
  compareAtPricePaise: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().default('INR'),
  validityDays: z.number().int().positive().optional().nullable(), // null means lifetime
  allowRenewals: z.boolean().default(true),
  renewalWindowDays: z.number().int().positive().default(30),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const createSectionSchema = z.object({
  productId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
  position: z.number().int().nonnegative(),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const createLessonSchema = z.object({
  sectionId: z.string().uuid(),
  productId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  position: z.number().int().nonnegative(),
  videoProviderId: z.string().optional().nullable(),
  durationSeconds: z.number().int().nonnegative().default(0),
  isFreePreview: z.boolean().default(false),
  status: z.nativeEnum(LessonStatus).default(LessonStatus.PROCESSING),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
