import { Router } from 'express';
import { orderController } from './order.controller.js';
import { requireAuth, requireRole } from '../../common/middleware/auth.js';
import { UserRole } from '@course/shared';

export const orderRouter = Router();

// Student order placement and payment confirmation
orderRouter.post('/orders', requireAuth, (req, res, next) =>
  orderController.createOrder(req, res, next),
);
orderRouter.get('/orders/:id', requireAuth, (req, res, next) =>
  orderController.getOrderById(req, res, next),
);
orderRouter.post('/payments/verify', requireAuth, (req, res, next) =>
  orderController.verifyPayment(req, res, next),
);

// Admin refunds and manual reconciliation
export const adminOrderRouter = Router();

adminOrderRouter.post(
  '/payments/:paymentId/refund',
  requireAuth,
  requireRole(UserRole.ADMIN),
  (req, res, next) => orderController.processRefund(req, res, next),
);

adminOrderRouter.post(
  '/orders/reconcile',
  requireAuth,
  requireRole(UserRole.ADMIN),
  (req, res, next) => orderController.reconcileStuckOrders(req, res, next),
);
