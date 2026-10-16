import { Router } from 'express';
import { adminEntitlementController } from './admin-entitlement.controller.js';
import { requireAuth, requireRole, requireAdmin2FA } from '../../common/middleware/auth.js';
import { UserRole } from '@course/shared';

export const adminEntitlementRouter = Router();

// Strictly enforce: Authenticated + Admin Role + Mandatory 2FA Enrolled
adminEntitlementRouter.use(requireAuth, requireRole(UserRole.ADMIN), requireAdmin2FA);

adminEntitlementRouter.post('/users/:userId/entitlements', (req, res, next) =>
  adminEntitlementController.grantEntitlement(req, res, next),
);

adminEntitlementRouter.patch('/entitlements/:id/extend', (req, res, next) =>
  adminEntitlementController.extendEntitlement(req, res, next),
);

adminEntitlementRouter.post('/entitlements/:id/revoke', (req, res, next) =>
  adminEntitlementController.revokeEntitlement(req, res, next),
);

adminEntitlementRouter.get('/users/:userId/entitlements', (req, res, next) =>
  adminEntitlementController.listUserEntitlements(req, res, next),
);
