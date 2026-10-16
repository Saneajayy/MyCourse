import { Request, Response, NextFunction } from 'express';
import { couponService } from './coupon.service.js';
import { createCouponSchema } from '@course/shared';
import { prisma } from '../../common/db/prisma.js';
import { NotFoundError } from '../../common/errors/app-error.js';

export class CouponController {
  public async createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createCouponSchema.parse(req.body);
      const coupon = await couponService.createCoupon(input);
      res.status(201).json({
        success: true,
        data: coupon,
      });
    } catch (err) {
      next(err);
    }
  }

  public async listCoupons(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const coupons = await prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, title: true, slug: true } },
          _count: { select: { redemptions: true } },
        },
      });
      res.status(200).json({
        success: true,
        data: coupons,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getCouponByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.params.code as string;
      const coupon = await couponService.getCouponByCode(code);
      if (!coupon) {
        throw new NotFoundError(`Coupon "${code}" not found.`);
      }
      res.status(200).json({
        success: true,
        data: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          productId: coupon.productId,
          isActive: coupon.isActive,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const couponController = new CouponController();
