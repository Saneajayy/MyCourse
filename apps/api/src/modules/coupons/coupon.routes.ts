import { Router } from 'express';
import { couponController } from './coupon.controller.js';
import { requireAuth, requireRole } from '../../common/middleware/auth.js';
import { UserRole } from '@course/shared';

export const couponRouter = Router();

// Public coupon lookup/validation
couponRouter.get('/coupons/:code', requireAuth, (req, res, next) =>
  couponController.getCouponByCode(req, res, next),
);

// Admin coupon management
export const adminCouponRouter = Router();

adminCouponRouter.post('/coupons', requireAuth, requireRole(UserRole.ADMIN), (req, res, next) =>
  couponController.createCoupon(req, res, next),
);

adminCouponRouter.get('/coupons', requireAuth, requireRole(UserRole.ADMIN), (req, res, next) =>
  couponController.listCoupons(req, res, next),
);
