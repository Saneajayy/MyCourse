import { Request, Response, NextFunction } from 'express';
import { couponService } from './coupon.service.js';
import { createCouponSchema, AuditAction } from '@course/shared';
import { prisma } from '../../common/db/prisma.js';
import { NotFoundError } from '../../common/errors/app-error.js';
import { auditService } from '../audit/audit.service.js';

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

  public async updateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const {
        isActive,
        maxRedemptions,
        maxUses,
        perUserLimit,
        maxUsesPerUser,
        validFrom,
        validUntil,
      } = req.body;

      const existing = await prisma.coupon.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundError(`Coupon with ID "${id}" not found.`);
      }

      const finalMaxRedemptions =
        maxRedemptions !== undefined
          ? maxRedemptions === null
            ? null
            : Number(maxRedemptions)
          : maxUses !== undefined
            ? maxUses === null
              ? null
              : Number(maxUses)
            : undefined;

      const finalPerUserLimit =
        perUserLimit !== undefined
          ? Number(perUserLimit)
          : maxUsesPerUser !== undefined
            ? Number(maxUsesPerUser)
            : undefined;

      const updated = await prisma.coupon.update({
        where: { id },
        data: {
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
          ...(finalMaxRedemptions !== undefined ? { maxRedemptions: finalMaxRedemptions } : {}),
          ...(finalPerUserLimit !== undefined ? { perUserLimit: finalPerUserLimit } : {}),
          ...(validFrom !== undefined
            ? { validFrom: validFrom ? new Date(validFrom) : undefined }
            : {}),
          ...(validUntil !== undefined
            ? { validUntil: validUntil ? new Date(validUntil) : null }
            : {}),
        },
      });

      await auditService.log({
        actorUserId: req.user?.id,
        action: AuditAction.COUPON_UPDATED,
        entityType: 'Coupon',
        entityId: id,
        beforeState: existing,
        afterState: updated,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const couponController = new CouponController();
