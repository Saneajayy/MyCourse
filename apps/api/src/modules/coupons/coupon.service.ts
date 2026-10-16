import { uuidv7 } from 'uuidv7';
import { prisma } from '../../common/db/prisma.js';
import { BadRequestError, NotFoundError } from '../../common/errors/app-error.js';
import { CouponType, CreateCouponInput } from '@course/shared';
import { Prisma } from '@prisma/client';

export interface ValidatedCouponResult {
  couponId: string;
  code: string;
  discountPaise: number;
  finalPricePaise: number;
  is100Percent: boolean;
}

export class CouponService {
  public async createCoupon(input: CreateCouponInput) {
    const existing = await prisma.coupon.findUnique({
      where: { code: input.code.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestError(`Coupon code "${input.code}" already exists.`);
    }

    if (input.type === CouponType.PERCENT && (input.value <= 0 || input.value > 100)) {
      throw new BadRequestError('Percentage coupon value must be between 1 and 100.');
    }

    return prisma.coupon.create({
      data: {
        id: uuidv7(),
        code: input.code.toUpperCase(),
        type: input.type,
        value: input.value,
        maxRedemptions: input.maxRedemptions,
        perUserLimit: input.perUserLimit ?? 1,
        validFrom: input.validFrom ?? new Date(),
        validUntil: input.validUntil,
        productId: input.productId,
        isActive: input.isActive ?? true,
      },
    });
  }

  public async getCouponByCode(code: string) {
    return prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
  }

  /**
   * Atomically validates a coupon under transaction and returns discount calculation.
   */
  public async validateAndCalculateDiscount(
    tx: Prisma.TransactionClient,
    code: string,
    userId: string,
    productId: string,
    basePricePaise: number,
  ): Promise<ValidatedCouponResult> {
    const cleanCode = code.trim().toUpperCase();

    // Lock coupon row for concurrency safety
    const lockedCoupons = await tx.$queryRaw<Array<any>>`
      SELECT id, code, type, value, "maxRedemptions", "perUserLimit", "validFrom", "validUntil", "productId", "isActive"
      FROM "Coupon"
      WHERE code = ${cleanCode}
      FOR UPDATE
    `;

    const coupon = lockedCoupons[0];
    if (!coupon) {
      throw new NotFoundError(`Coupon "${cleanCode}" not found.`);
    }

    if (!coupon.isActive) {
      throw new BadRequestError(`Coupon "${cleanCode}" is no longer active.`);
    }

    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      throw new BadRequestError(`Coupon "${cleanCode}" is not yet valid.`);
    }

    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      throw new BadRequestError(`Coupon "${cleanCode}" has expired.`);
    }

    if (coupon.productId && coupon.productId !== productId) {
      throw new BadRequestError(`Coupon "${cleanCode}" is not applicable to this course.`);
    }

    // Check total redemptions
    if (coupon.maxRedemptions !== null && coupon.maxRedemptions !== undefined) {
      const totalRedemptions = await tx.couponRedemption.count({
        where: { couponId: coupon.id },
      });
      if (totalRedemptions >= coupon.maxRedemptions) {
        throw new BadRequestError(
          `Coupon "${cleanCode}" has reached its maximum redemptions limit.`,
        );
      }
    }

    // Check per-user redemption limit
    const userRedemptions = await tx.couponRedemption.count({
      where: {
        couponId: coupon.id,
        userId,
      },
    });

    if (userRedemptions >= (coupon.perUserLimit ?? 1)) {
      throw new BadRequestError(
        `You have already reached the redemption limit (${coupon.perUserLimit ?? 1}) for coupon "${cleanCode}".`,
      );
    }

    // Calculate discount
    let discountPaise = 0;
    if (coupon.type === CouponType.PERCENT) {
      discountPaise = Math.min(basePricePaise, Math.round((basePricePaise * coupon.value) / 100));
    } else {
      // FLAT paise
      discountPaise = Math.min(basePricePaise, coupon.value);
    }

    const finalPricePaise = Math.max(0, basePricePaise - discountPaise);
    const is100Percent = finalPricePaise === 0;

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountPaise,
      finalPricePaise,
      is100Percent,
    };
  }
}

export const couponService = new CouponService();
