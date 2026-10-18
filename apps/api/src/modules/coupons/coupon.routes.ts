import { Router } from 'express';
import { couponController } from './coupon.controller.js';
import { requireAuth, requireRole, requireAdmin2FA } from '../../common/middleware/auth.js';
import { UserRole } from '@course/shared';
import { couponRateLimiter } from '../../common/middleware/rate-limiter.js';

export const couponRouter = Router();

// Public coupon lookup/validation (rate limited to prevent coupon code enumeration while allowing legitimate users)
couponRouter.get('/coupons/:code', requireAuth, couponRateLimiter, (req, res, next) =>
  couponController.getCouponByCode(req, res, next),
);

// Admin coupon management (Auth + Admin Role + Mandatory 2FA)
export const adminCouponRouter = Router();

adminCouponRouter.use(requireAuth, requireRole(UserRole.ADMIN), requireAdmin2FA);

adminCouponRouter.post('/coupons', (req, res, next) =>
  couponController.createCoupon(req, res, next),
);

adminCouponRouter.get('/coupons', (req, res, next) => couponController.listCoupons(req, res, next));

adminCouponRouter.patch('/coupons/:id', (req, res, next) =>
  couponController.updateCoupon(req, res, next),
);
