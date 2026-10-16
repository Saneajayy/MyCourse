import { uuidv7 } from 'uuidv7';
import { prisma } from '../../common/db/prisma.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/app-error.js';
import {
  CreateOrderInput,
  CreateRefundInput,
  EntitlementSource,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  RefundStatus,
  VerifyPaymentInput,
} from '@course/shared';
import { getPaymentGateway } from '../payments/payment.service.js';
import { couponService } from '../coupons/coupon.service.js';
import { entitlementService } from '../entitlements/entitlement.service.js';
import { calculateTaxAndTotals, invoiceService } from '../invoices/invoice.service.js';
import { auditService } from '../audit/audit.service.js';
import { logger } from '../../common/logger/logger.js';
import { env } from '../../config/env.js';

export class OrderService {
  /**
   * Creates an order with strict server-side price computation from the database,
   * Idempotency-Key header support, double-purchase/renewal window validation,
   * coupon application, and UTM parameter capture.
   */
  public async createOrder(input: CreateOrderInput, userId: string, idempotencyKey: string) {
    if (!idempotencyKey) {
      throw new BadRequestError('Idempotency-Key header is required.');
    }

    // 1. Verify that user email is verified before allowing purchase
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenError('Email must be verified before purchasing courses.');
    }

    // 2. Check Idempotency-Key in database
    const existingOrder = await prisma.order.findUnique({
      where: { idempotencyKey },
      include: {
        product: true,
        coupon: true,
      },
    });

    if (existingOrder) {
      // Check if parameters match
      const sameUser = existingOrder.userId === userId;
      const sameProduct = existingOrder.productId === input.productId;
      const sameCoupon = (existingOrder.coupon?.code ?? null) === (input.couponCode ?? null);

      if (sameUser && sameProduct && sameCoupon) {
        return {
          order: existingOrder,
          razorpayOrderId: existingOrder.razorpayOrderId,
          razorpayKeyId: env.RAZORPAY_KEY_ID,
          isReplay: true,
        };
      } else {
        throw new ConflictError(
          'Idempotency key has already been used for a different order request.',
        );
      }
    }

    // 3. Fetch product from DB to ensure client cannot tamper with price or status
    const product = await prisma.product.findUnique({
      where: { id: input.productId, deletedAt: null },
    });

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundError('Course product not found or not published.');
    }

    // 4. Double-purchase prevention & Renewal window check
    const existingEntitlement = await entitlementService.getActiveEntitlement(userId, product.id);
    if (existingEntitlement) {
      // Lifetime access
      if (product.validityDays === null || existingEntitlement.expiresAt === null) {
        throw new ForbiddenError('You already have lifetime access to this course.');
      }

      if (!product.allowRenewals) {
        throw new ForbiddenError(
          'Course repurchases and renewals are not enabled for this product.',
        );
      }

      const now = Date.now();
      const expiresAtMs = existingEntitlement.expiresAt.getTime();
      const remainingDays = Math.ceil((expiresAtMs - now) / (1000 * 60 * 60 * 24));
      const windowDays = product.renewalWindowDays ?? 30;

      if (remainingDays > windowDays) {
        throw new ForbiddenError(
          `Renewal is only permitted within the last ${windowDays} days of your active access. (You currently have ${remainingDays} days remaining)`,
        );
      }
    }

    // 5. Calculate pricing, discounts, and taxes atomically
    return prisma.$transaction(async (tx) => {
      let discountPaise = 0;
      let appliedCouponId: string | null = null;
      let is100PercentCoupon = false;

      if (input.couponCode) {
        const couponResult = await couponService.validateAndCalculateDiscount(
          tx,
          input.couponCode,
          userId,
          product.id,
          product.pricePaise,
        );
        discountPaise = couponResult.discountPaise;
        appliedCouponId = couponResult.couponId;
        is100PercentCoupon = couponResult.is100Percent;
      }

      const taxCalculation = await calculateTaxAndTotals(product.pricePaise, discountPaise);
      const totalPaise = taxCalculation.totalPaise;
      const subtotalPaise = taxCalculation.subtotalPaise;
      const taxPaise = taxCalculation.taxPaise;

      const orderId = uuidv7();
      let razorpayOrderId: string | null = null;

      // 6. If total is 0 (100% coupon), skip payment gateway
      if (is100PercentCoupon || totalPaise === 0) {
        const paidOrder = await tx.order.create({
          data: {
            id: orderId,
            userId,
            productId: product.id,
            couponId: appliedCouponId,
            idempotencyKey,
            status: OrderStatus.PAID,
            subtotalPaise,
            discountPaise,
            taxPaise: 0,
            totalPaise: 0,
            currency: product.currency,
            razorpayOrderId: null,
            billingDetails: (input.billingDetails as any) ?? null,
            utmSource: input.utmSource,
            utmMedium: input.utmMedium,
            utmCampaign: input.utmCampaign,
            paidAt: new Date(),
          },
          include: { product: true, coupon: true },
        });

        // Grant entitlement immediately
        await entitlementService.grantOrExtendEntitlement(tx, {
          userId,
          productId: product.id,
          orderId,
          validityDays: product.validityDays,
          source: EntitlementSource.COUPON_100,
        });

        // Record coupon redemption
        if (appliedCouponId) {
          await tx.couponRedemption.create({
            data: {
              id: uuidv7(),
              couponId: appliedCouponId,
              userId,
              orderId,
              discountPaise,
            },
          });
        }

        // Generate sequential invoice
        const invMeta = await invoiceService.generateInvoiceNumberUnderLock(tx, new Date());
        const invoice = await tx.invoice.create({
          data: {
            id: uuidv7(),
            orderId,
            invoiceNumber: invMeta.invoiceNumber,
            financialYear: invMeta.financialYear,
            sequenceNumber: invMeta.sequenceNumber,
            subtotalPaise: 0,
            taxPaise: 0,
            totalPaise: 0,
            billingDetails: (input.billingDetails as any) ?? {},
            issuedAt: new Date(),
          },
        });

        await auditService.log({
          actorUserId: userId,
          action: 'ORDER_PAID_FREE_COUPON',
          entityType: 'Order',
          entityId: orderId,
          afterState: paidOrder,
        });

        return {
          order: paidOrder,
          invoice,
          razorpayOrderId: null,
          razorpayKeyId: env.RAZORPAY_KEY_ID,
          isReplay: false,
        };
      }

      // 7. Create order on Razorpay Gateway
      const gateway = getPaymentGateway();
      const gatewayOrder = await gateway.createOrder({
        amountPaise: totalPaise,
        currency: product.currency,
        receipt: `ord_${orderId.replace(/-/g, '').substring(0, 14)}`,
        notes: {
          orderId,
          userId,
          productId: product.id,
        },
      });

      razorpayOrderId = gatewayOrder.id;

      const order = await tx.order.create({
        data: {
          id: orderId,
          userId,
          productId: product.id,
          couponId: appliedCouponId,
          idempotencyKey,
          status: OrderStatus.CREATED,
          subtotalPaise,
          discountPaise,
          taxPaise,
          totalPaise,
          currency: product.currency,
          razorpayOrderId,
          billingDetails: (input.billingDetails as any) ?? null,
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
        },
        include: { product: true, coupon: true },
      });

      await auditService.log({
        actorUserId: userId,
        action: 'ORDER_CREATED',
        entityType: 'Order',
        entityId: orderId,
        afterState: order,
      });

      return {
        order,
        razorpayOrderId,
        razorpayKeyId: env.RAZORPAY_KEY_ID,
        isReplay: false,
      };
    });
  }

  /**
   * Unified, idempotent function to mark an order as PAID.
   * Executed within a single DB transaction with row locking on Order and Entitlement.
   * Safe against concurrent calls from verify endpoint, webhooks, and reconciliation workers.
   */
  public async markOrderPaid(
    orderIdentifier: string, // orderId or razorpayOrderId
    paymentDetails: {
      paymentId: string;
      amountPaise: number;
      currency: string;
      status: 'captured' | 'authorized' | 'failed' | 'refunded';
      method?: string;
      rawGatewayPayload?: any;
    },
  ) {
    const result = await prisma.$transaction(async (tx) => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        orderIdentifier,
      );
      const lockedRows = isUuid
        ? await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM "Order" WHERE id = ${orderIdentifier}::uuid FOR UPDATE
          `
        : await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM "Order" WHERE "razorpayOrderId" = ${orderIdentifier} FOR UPDATE
          `;

      const firstLocked = lockedRows[0];
      if (!firstLocked) {
        throw new NotFoundError(`Order not found for identifier "${orderIdentifier}".`);
      }

      const order = await tx.order.findUnique({
        where: { id: firstLocked.id },
        include: { product: true, user: true },
      });

      if (!order) {
        throw new NotFoundError(`Order not found for identifier "${orderIdentifier}".`);
      }

      // Idempotency: If already paid, return existing state immediately without repeating grants or invoice generation
      if (order.status === OrderStatus.PAID) {
        logger.info(
          { orderId: order.id },
          'Order is already marked PAID. Idempotently returning existing state.',
        );
        const existingEntitlement = await tx.entitlement.findFirst({
          where: { orderId: order.id },
        });
        const existingInvoice = await tx.invoice.findUnique({
          where: { orderId: order.id },
        });
        return {
          order,
          entitlement: existingEntitlement,
          invoice: existingInvoice,
          alreadyPaid: true,
        };
      }

      // Validate payment status
      if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
        throw new BadRequestError(
          `Cannot mark order paid for non-captured payment status "${paymentDetails.status}".`,
        );
      }

      // Validate payment amount in paise against order total
      if (paymentDetails.amountPaise !== order.totalPaise) {
        logger.error(
          { expected: order.totalPaise, received: paymentDetails.amountPaise, orderId: order.id },
          'Tampered or mismatched payment amount detected!',
        );
        throw new BadRequestError(
          `Payment amount mismatch: expected ${order.totalPaise} paise, received ${paymentDetails.amountPaise} paise.`,
        );
      }

      // Validate currency
      if (paymentDetails.currency.toUpperCase() !== order.currency.toUpperCase()) {
        throw new BadRequestError(
          `Payment currency mismatch: expected ${order.currency}, received ${paymentDetails.currency}.`,
        );
      }

      // Record Payment record
      const paymentId = uuidv7();
      await tx.payment.create({
        data: {
          id: paymentId,
          orderId: order.id,
          razorpayPaymentId: paymentDetails.paymentId,
          amountPaise: paymentDetails.amountPaise,
          method: paymentDetails.method ?? 'gateway',
          status: PaymentStatus.CAPTURED,
          rawGatewayPayload: paymentDetails.rawGatewayPayload ?? {},
          capturedAt: new Date(),
        },
      });

      // Update Order to PAID
      const paidOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paidAt: new Date(),
        },
        include: { product: true, user: true },
      });

      // Grant or extend entitlement
      const entitlement = await entitlementService.grantOrExtendEntitlement(tx, {
        userId: order.userId,
        productId: order.productId,
        orderId: order.id,
        validityDays: paidOrder.product.validityDays,
        source: EntitlementSource.PURCHASE,
      });

      // Record coupon redemption if coupon was attached
      if (order.couponId) {
        await tx.couponRedemption.create({
          data: {
            id: uuidv7(),
            couponId: order.couponId,
            userId: order.userId,
            orderId: order.id,
            discountPaise: order.discountPaise,
          },
        });
      }

      // Generate sequential invoice number per financial year with no gaps under row lock
      const invMeta = await invoiceService.generateInvoiceNumberUnderLock(tx, new Date());
      const invoice = await tx.invoice.create({
        data: {
          id: uuidv7(),
          orderId: order.id,
          invoiceNumber: invMeta.invoiceNumber,
          financialYear: invMeta.financialYear,
          sequenceNumber: invMeta.sequenceNumber,
          subtotalPaise: order.subtotalPaise,
          taxPaise: order.taxPaise,
          totalPaise: order.totalPaise,
          billingDetails: (order.billingDetails as any) ?? {},
          issuedAt: new Date(),
        },
      });

      await auditService.log({
        actorUserId: order.userId,
        action: 'ORDER_PAID',
        entityType: 'Order',
        entityId: order.id,
        afterState: { orderId: order.id, paymentId, invoiceNumber: invMeta.invoiceNumber },
      });

      return {
        order: paidOrder,
        entitlement,
        invoice,
        alreadyPaid: false,
        invoiceNumber: invMeta.invoiceNumber,
        userDetails: {
          email: paidOrder.user.email,
          name: paidOrder.user.name,
          courseTitle: paidOrder.product.title,
        },
      };
    });

    // Post-transaction side-effects (PDF generation & asynchronous email)
    if (!result.alreadyPaid && result.invoice && result.userDetails && result.invoiceNumber) {
      try {
        const businessSetting = await prisma.appSetting.findUnique({
          where: { key: 'business_profile' },
        });
        const taxSetting = await prisma.appSetting.findUnique({ where: { key: 'tax_config' } });

        const pdfUrl = await invoiceService.generateInvoicePdf(
          result.invoice.id,
          result.invoiceNumber,
          result.order,
          (businessSetting?.value as any) || {},
          (taxSetting?.value as any) || {},
        );

        await prisma.invoice.update({
          where: { id: result.invoice.id },
          data: { pdfUrl },
        });

        await invoiceService.sendInvoiceEmail(
          result.userDetails.email,
          result.userDetails.name,
          result.invoiceNumber,
          result.userDetails.courseTitle,
          result.order.totalPaise,
          pdfUrl,
        );
      } catch (err) {
        logger.error(
          { err, orderId: result.order.id },
          'Post-payment invoice PDF/email generation failed',
        );
      }
    }

    return result;
  }

  /**
   * Browser Verify Endpoint: Verifies HMAC signature, validates payment details from gateway,
   * and delegates to markOrderPaid.
   */
  public async verifyBrowserPayment(input: VerifyPaymentInput, _userId?: string) {
    const gateway = getPaymentGateway();

    // 1. Verify HMAC SHA-256 signature in constant time
    const isValidSignature = gateway.verifyPaymentSignature({
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
    });

    if (!isValidSignature) {
      logger.warn(
        { razorpayOrderId: input.razorpayOrderId },
        'Invalid Razorpay payment signature received in browser verify',
      );
      throw new BadRequestError('Invalid payment signature verification failed.');
    }

    // 2. Fetch authoritative payment status directly from Gateway API
    const gatewayPayment = await gateway.fetchPayment(input.razorpayPaymentId);

    // 3. Confirm order ID matches
    if (gatewayPayment.orderId !== input.razorpayOrderId) {
      throw new BadRequestError('Gateway payment does not match the specified order.');
    }

    // 4. Call idempotent markOrderPaid
    return this.markOrderPaid(input.razorpayOrderId, {
      paymentId: gatewayPayment.id,
      amountPaise: gatewayPayment.amountPaise,
      currency: gatewayPayment.currency,
      status: gatewayPayment.status,
      method: gatewayPayment.method,
      rawGatewayPayload: gatewayPayment,
    });
  }

  /**
   * Processes admin-initiated full or partial refund via Razorpay Refund API
   */
  public async processRefund(paymentId: string, input: CreateRefundInput, adminUserId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            product: true,
          },
        },
        refunds: true,
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      throw new BadRequestError('Payment has already been fully refunded.');
    }

    const previousRefundsTotal = payment.refunds
      .filter((r) => r.status === RefundStatus.PROCESSED)
      .reduce((acc, r) => acc + r.amountPaise, 0);

    const availableForRefund = payment.amountPaise - previousRefundsTotal;
    const requestedRefundAmount = input.amountPaise ?? availableForRefund;

    if (requestedRefundAmount <= 0 || requestedRefundAmount > availableForRefund) {
      throw new BadRequestError(
        `Invalid refund amount. Available for refund: ${availableForRefund} paise, requested: ${requestedRefundAmount} paise.`,
      );
    }

    const isFullRefund = previousRefundsTotal + requestedRefundAmount >= payment.amountPaise;

    // Call Razorpay Gateway
    const gateway = getPaymentGateway();
    const gatewayRefund = await gateway.createRefund({
      paymentId: payment.razorpayPaymentId,
      amountPaise: requestedRefundAmount,
      reason: input.reason ?? 'Customer requested refund',
    });

    return prisma.$transaction(async (tx) => {
      const refundRecord = await tx.refund.create({
        data: {
          id: uuidv7(),
          paymentId: payment.id,
          razorpayRefundId: gatewayRefund.id,
          amountPaise: requestedRefundAmount,
          reason: input.reason,
          status: RefundStatus.PROCESSED,
          initiatedByAdminId: adminUserId,
        },
      });

      // Update Payment status
      if (isFullRefund) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.REFUNDED },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.REFUNDED },
        });

        // Revoke entitlement on full refund
        await entitlementService.revokeEntitlement(
          tx,
          payment.order.userId,
          payment.order.productId,
          input.reason ?? 'Full refund processed',
        );
      } else {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.PARTIALLY_REFUNDED },
        });
      }

      await auditService.log({
        actorUserId: adminUserId,
        action: isFullRefund ? 'PAYMENT_REFUNDED_FULL' : 'PAYMENT_REFUNDED_PARTIAL',
        entityType: 'Payment',
        entityId: payment.id,
        afterState: {
          refundId: refundRecord.id,
          amountPaise: requestedRefundAmount,
          isFullRefund,
        },
      });

      return {
        refund: refundRecord,
        isFullRefund,
      };
    });
  }

  /**
   * Reconciles stuck CREATED/PENDING orders by checking gateway status
   */
  public async reconcileStuckOrders() {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stuckOrders = await prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.CREATED, OrderStatus.PENDING] },
        razorpayOrderId: { not: null },
        createdAt: { lte: tenMinutesAgo },
      },
      take: 50,
    });

    const gateway = getPaymentGateway();
    let reconciled = 0;
    let expired = 0;

    for (const order of stuckOrders) {
      try {
        if (!order.razorpayOrderId) continue;

        const payments = await gateway.fetchOrderPayments(order.razorpayOrderId);
        const captured = payments.find((p) => p.status === 'captured');

        if (captured) {
          logger.info(
            { orderId: order.id, paymentId: captured.id },
            'Reconciliation found captured payment for stuck order!',
          );
          await this.markOrderPaid(order.id, {
            paymentId: captured.id,
            amountPaise: captured.amountPaise,
            currency: captured.currency,
            status: captured.status,
            method: captured.method,
            rawGatewayPayload: captured,
          });
          reconciled++;
        } else {
          // If order is older than 2 hours with no captured payment, mark expired
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
          if (order.createdAt <= twoHoursAgo) {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.CANCELLED },
            });
            expired++;
          }
        }
      } catch (err) {
        logger.error({ err, orderId: order.id }, 'Error during single order reconciliation');
      }
    }

    return {
      checked: stuckOrders.length,
      reconciled,
      expired,
    };
  }
}

export const orderService = new OrderService();
