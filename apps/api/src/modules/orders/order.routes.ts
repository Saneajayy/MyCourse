import { Router } from 'express';
import { orderController } from './order.controller.js';
import { requireAuth, requireRole } from '../../common/middleware/auth.js';
import { UserRole } from '@course/shared';

export const orderRouter = Router();

// Student order placement and payment confirmation
orderRouter.post('/orders', requireAuth, (req, res, next) =>
  orderController.createOrder(req, res, next),
);
orderRouter.get('/orders', requireAuth, (req, res, next) =>
  orderController.listUserOrders(req, res, next),
);
// Public tax configuration endpoint for checkout tax display
orderRouter.get('/orders/tax-config', (req, res, next) =>
  orderController.getTaxConfig(req, res, next),
);

import { createRateLimiter } from '../../common/middleware/rate-limiter.js';

export const quoteRateLimiter = createRateLimiter({
  points: 20,
  duration: 60,
  keyPrefix: 'rl_quote',
  isSensitive: true,
});

// Price quote endpoint (POST only to prevent coupon code exposure in URLs/logs; rate-limited against enumeration)
orderRouter.post('/orders/quote', quoteRateLimiter, (req, res, next) =>
  orderController.getPriceQuote(req, res, next),
);
orderRouter.get('/orders/quote', (_req, res) => {
  res.status(405).json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'GET /orders/quote is not supported. Use POST /orders/quote with a JSON request body.',
    },
  });
});

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
