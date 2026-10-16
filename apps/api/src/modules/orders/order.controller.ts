import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service.js';
import { createOrderSchema, createRefundSchema, verifyPaymentSchema } from '@course/shared';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/app-error.js';
import { prisma } from '../../common/db/prisma.js';

export class OrderController {
  public async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idempotencyKey =
        (req.headers['idempotency-key'] as string) || (req.headers['Idempotency-Key'] as string);
      if (!idempotencyKey) {
        throw new BadRequestError('Idempotency-Key header is required.');
      }

      const input = createOrderSchema.parse(req.body);
      const userId = req.user!.id;

      const result = await orderService.createOrder(input, userId, idempotencyKey);
      res.status(result.isReplay ? 200 : 201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = verifyPaymentSchema.parse(req.body);
      const userId = req.user!.id;

      const result = await orderService.verifyBrowserPayment(input, userId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: req.params.id as string },
        include: {
          product: true,
          coupon: true,
          payments: true,
          invoice: true,
          entitlements: true,
        },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      if (order.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
        throw new ForbiddenError('You do not have permission to view this order.');
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  public async listUserOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const orders = await prisma.order.findMany({
        where: { userId },
        include: {
          product: {
            select: { id: true, title: true, slug: true, thumbnailUrl: true },
          },
          coupon: {
            select: { id: true, code: true, type: true, value: true },
          },
          invoice: {
            select: { id: true, invoiceNumber: true, issuedAt: true, totalPaise: true },
          },
          payments: {
            select: { id: true, status: true, amountPaise: true, method: true, capturedAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (err) {
      next(err);
    }
  }

  public async processRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paymentId = req.params.paymentId as string;
      const input = createRefundSchema.parse(req.body);
      const adminUserId = req.user!.id;

      const result = await orderService.initiateRefund(paymentId, input, adminUserId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async reconcileStuckOrders(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await orderService.reconcileStuckOrders();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const orderController = new OrderController();
