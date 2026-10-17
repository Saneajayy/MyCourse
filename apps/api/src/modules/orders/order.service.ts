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
import { streamService } from '../video/stream.service.js';
import { emailService } from '../../common/email/email.service.js';
import { logger } from '../../common/logger/logger.js';
import { env } from '../../config/env.js';

export class OrderService {
  /**
   * Creates an order with strict server-side price computation from the database,
   * Idempotency-Key header support, double-purchase/renewal window validation,
   * coupon application (with atomic reservation under lock), and UTM parameter capture.
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

    // 5. Calculate pricing, discounts, and taxes
    const orderId = uuidv7();

    if (input.couponCode) {
      return prisma.$transaction(
        async (tx) => {
          const couponResult = await couponService.validateAndCalculateDiscount(
            tx,
            input.couponCode!,
            userId,
            product.id,
            product.pricePaise,
          );
          const discountPaise = couponResult.discountPaise;
          const appliedCouponId = couponResult.couponId;
          const is100PercentCoupon = couponResult.is100Percent;

          const taxCalculation = await calculateTaxAndTotals(product.pricePaise, discountPaise, tx);
          const totalPaise = taxCalculation.totalPaise;
          const subtotalPaise = taxCalculation.subtotalPaise;
          const taxPaise = taxCalculation.taxPaise;

          // 6. If total is 0 (100% coupon), skip payment gateway and fulfill immediately
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

            // Check if zero-value invoices are enabled in AppSetting (R9)
            const shouldGenZeroInvoice = await invoiceService.shouldGenerateZeroValueInvoice(tx);
            let invoice = null;

            if (shouldGenZeroInvoice) {
              const invMeta = await invoiceService.generateInvoiceNumberUnderLock(tx, new Date());
              invoice = await tx.invoice.create({
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
            }

            await auditService.log(
              {
                actorUserId: userId,
                action: 'ORDER_PAID_FREE_COUPON',
                entityType: 'Order',
                entityId: orderId,
                afterState: paidOrder,
              },
              tx,
            );

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
              razorpayOrderId: gatewayOrder.id,
              billingDetails: (input.billingDetails as any) ?? null,
              utmSource: input.utmSource,
              utmMedium: input.utmMedium,
              utmCampaign: input.utmCampaign,
            },
            include: { product: true, coupon: true },
          });

          // R5: Count redemption at order creation under row lock
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

          await auditService.log(
            {
              actorUserId: userId,
              action: 'ORDER_CREATED',
              entityType: 'Order',
              entityId: orderId,
              afterState: order,
            },
            tx,
          );

          return {
            order,
            razorpayOrderId: gatewayOrder.id,
            razorpayKeyId: env.RAZORPAY_KEY_ID,
            isReplay: false,
          };
        },
        { timeout: 35000, maxWait: 15000 },
      );
    }

    // Standard order path without coupon:
    // Performs tax calculation and gateway creation outside DB transaction to prevent pool starvation
    const taxCalculation = await calculateTaxAndTotals(product.pricePaise, 0);
    const totalPaise = taxCalculation.totalPaise;
    const subtotalPaise = taxCalculation.subtotalPaise;
    const taxPaise = taxCalculation.taxPaise;

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

    const order = await prisma.$transaction(
      async (tx) => {
        const ord = await tx.order.create({
          data: {
            id: orderId,
            userId,
            productId: product.id,
            couponId: null,
            idempotencyKey,
            status: OrderStatus.CREATED,
            subtotalPaise,
            discountPaise: 0,
            taxPaise,
            totalPaise,
            currency: product.currency,
            razorpayOrderId: gatewayOrder.id,
            billingDetails: (input.billingDetails as any) ?? null,
            utmSource: input.utmSource,
            utmMedium: input.utmMedium,
            utmCampaign: input.utmCampaign,
          },
          include: { product: true, coupon: true },
        });

        await auditService.log(
          {
            actorUserId: userId,
            action: 'ORDER_CREATED',
            entityType: 'Order',
            entityId: orderId,
            afterState: ord,
          },
          tx,
        );

        return ord;
      },
      { timeout: 35000, maxWait: 15000 },
    );

    return {
      order,
      razorpayOrderId: gatewayOrder.id,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
      isReplay: false,
    };
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
    const result = await prisma.$transaction(
      async (tx) => {
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

        // Idempotency: If already paid, return existing state immediately
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

        // R1: Payment status must strictly be captured
        if (paymentDetails.status !== 'captured') {
          throw new BadRequestError(
            `Cannot mark order paid for non-captured payment status "${paymentDetails.status}".`,
          );
        }

        // R2: If order was previously expired/cancelled by job, late payment is permitted and granted access
        if (
          order.status !== OrderStatus.CREATED &&
          order.status !== OrderStatus.PENDING &&
          order.status !== OrderStatus.CANCELLED
        ) {
          throw new BadRequestError(`Cannot mark order paid from status "${order.status}".`);
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

        // Record or update Payment record
        const existingPayment = await tx.payment.findUnique({
          where: { razorpayPaymentId: paymentDetails.paymentId },
        });

        let paymentId: string;
        if (existingPayment) {
          paymentId = existingPayment.id;
          await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              status: PaymentStatus.CAPTURED,
              capturedAt: new Date(),
              rawGatewayPayload:
                paymentDetails.rawGatewayPayload ?? existingPayment.rawGatewayPayload,
            },
          });
        } else {
          paymentId = uuidv7();
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
        }

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

        // Ensure coupon redemption is recorded (e.g. if order was expired and coupon was released)
        if (order.couponId) {
          const existingRedemption = await tx.couponRedemption.findUnique({
            where: { orderId: order.id },
          });
          if (!existingRedemption) {
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
        }

        // Generate sequential invoice number per financial year with no gaps under row lock (R9: <= 16 chars)
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

        await auditService.log(
          {
            actorUserId: order.userId,
            action: 'ORDER_PAID',
            entityType: 'Order',
            entityId: order.id,
            afterState: { orderId: order.id, paymentId, invoiceNumber: invMeta.invoiceNumber },
          },
          tx,
        );

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
      },
      { timeout: 35000, maxWait: 15000 },
    );

    // Post-transaction side-effects: Enqueue durable receipt job (A2)
    if (!result.alreadyPaid) {
      await invoiceService.enqueueReceiptJob(result.order.id).catch((err) => {
        logger.error(
          { err, orderId: result.order.id },
          'Failed to enqueue durable receipt job for paid order',
        );
      });
    }

    return result;
  }

  /**
   * Browser Verify Endpoint:
   * 1. Validates ownership (R6: IDOR protection).
   * 2. Verifies HMAC signature.
   * 3. Fetches authoritative payment from gateway.
   * 4. R1: If "authorized", keeps order PENDING (no entitlement/invoice).
   * 5. If "captured", calls markOrderPaid.
   */
  public async verifyBrowserPayment(input: VerifyPaymentInput, userId: string) {
    const gateway = getPaymentGateway();

    // 1. Fetch order and enforce ownership (R6)
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId: input.razorpayOrderId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundError(`Order with gateway ID "${input.razorpayOrderId}" not found.`);
    }

    const requestingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (order.userId !== userId && requestingUser?.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission to verify payment for this order.');
    }

    // 2. Verify HMAC SHA-256 signature in constant time
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

    // 3. Fetch authoritative payment status directly from Gateway API
    const gatewayPayment = await gateway.fetchPayment(input.razorpayPaymentId);

    // 4. Confirm order ID matches
    if (gatewayPayment.orderId !== input.razorpayOrderId) {
      throw new BadRequestError('Gateway payment does not match the specified order.');
    }

    // R1: If payment is authorized, keep order PENDING and do NOT grant entitlement/invoice
    if (gatewayPayment.status === 'authorized') {
      logger.info(
        { orderId: order.id, paymentId: gatewayPayment.id },
        'Payment status is authorized; keeping order PENDING and deferring fulfillment to capture.',
      );

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PENDING },
      });

      const existingPayment = await prisma.payment.findUnique({
        where: { razorpayPaymentId: gatewayPayment.id },
      });

      if (!existingPayment) {
        await prisma.payment.create({
          data: {
            id: uuidv7(),
            orderId: order.id,
            razorpayPaymentId: gatewayPayment.id,
            amountPaise: gatewayPayment.amountPaise,
            method: gatewayPayment.method ?? 'gateway',
            status: PaymentStatus.PENDING,
            rawGatewayPayload: gatewayPayment as any,
          },
        });
      }

      return {
        order: updatedOrder,
        status: 'authorized',
        message:
          'Payment is authorized and pending capture. Entitlement will be activated upon capture confirmation.',
        entitlement: null,
        invoice: null,
      };
    }

    // If payment failed at gateway
    if (gatewayPayment.status === 'failed') {
      await this.handlePaymentFailed(input.razorpayOrderId, {
        paymentId: gatewayPayment.id,
        amountPaise: gatewayPayment.amountPaise,
        currency: gatewayPayment.currency,
        errorMessage: (gatewayPayment as any).error_description,
        rawGatewayPayload: gatewayPayment,
      });

      return {
        order,
        status: 'failed',
        message: 'Payment attempt failed. Order remains open for retry.',
        entitlement: null,
        invoice: null,
      };
    }

    // If captured: fulfill order
    return this.markOrderPaid(input.razorpayOrderId, {
      paymentId: gatewayPayment.id,
      amountPaise: gatewayPayment.amountPaise,
      currency: gatewayPayment.currency,
      status: 'captured',
      method: gatewayPayment.method,
      rawGatewayPayload: gatewayPayment,
    });
  }

  /**
   * Handles payment.failed: records the failure in Payment table, but keeps the
   * Order in CREATED/PENDING so the customer can retry without creating a new order (R2).
   */
  public async handlePaymentFailed(
    orderIdentifier: string,
    details: {
      paymentId: string;
      amountPaise: number;
      currency: string;
      errorMessage?: string;
      rawGatewayPayload?: any;
    },
  ) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      orderIdentifier,
    );
    const order = isUuid
      ? await prisma.order.findUnique({ where: { id: orderIdentifier } })
      : await prisma.order.findUnique({ where: { razorpayOrderId: orderIdentifier } });

    if (!order) {
      logger.warn(
        { orderIdentifier },
        'Order not found for payment.failed webhook; ignoring gracefully to prevent infinite retry',
      );
      return { success: false, reason: 'ORDER_NOT_FOUND' };
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { razorpayPaymentId: details.paymentId },
    });

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.FAILED,
          rawGatewayPayload: details.rawGatewayPayload ?? existingPayment.rawGatewayPayload,
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          id: uuidv7(),
          orderId: order.id,
          razorpayPaymentId: details.paymentId,
          amountPaise: details.amountPaise,
          method: details.rawGatewayPayload?.method ?? 'gateway',
          status: PaymentStatus.FAILED,
          rawGatewayPayload: details.rawGatewayPayload ?? {},
        },
      });
    }

    logger.info(
      { orderId: order.id, paymentId: details.paymentId, error: details.errorMessage },
      'Payment failure recorded. Order kept open for retries.',
    );

    return { success: true, orderId: order.id };
  }

  /**
   * R4: Initiates admin refund.
   * Row-locks Payment under FOR UPDATE, validates that requested refund does not exceed
   * (captured - already refunded/pending), calls gateway, and saves Refund as PENDING.
   * Does NOT alter order or revoke entitlement until refund.processed webhook confirms it.
   */
  public async initiateRefund(paymentId: string, input: CreateRefundInput, adminUserId: string) {
    return prisma.$transaction(async (tx) => {
      // Row lock Payment FOR UPDATE
      const lockedPayments = await tx.$queryRaw<
        Array<{
          id: string;
          amountPaise: number;
          status: string;
          razorpayPaymentId: string;
          orderId: string;
        }>
      >`
        SELECT id, "amountPaise", status, "razorpayPaymentId", "orderId"
        FROM "Payment"
        WHERE id = ${paymentId}::uuid
        FOR UPDATE
      `;

      const payment = lockedPayments[0];
      if (!payment) {
        throw new NotFoundError('Payment not found');
      }

      if (payment.status !== PaymentStatus.CAPTURED) {
        throw new BadRequestError(`Cannot refund payment with status "${payment.status}".`);
      }

      // Check existing refunds under lock (both PROCESSED and PENDING) to prevent concurrent over-refunds
      const existingRefunds = await tx.refund.findMany({
        where: {
          paymentId: payment.id,
          status: { in: [RefundStatus.PROCESSED, RefundStatus.PENDING] },
        },
      });

      const alreadyRefundedPaise = existingRefunds.reduce((sum, r) => sum + r.amountPaise, 0);
      const remainingRefundablePaise = payment.amountPaise - alreadyRefundedPaise;

      const requestedPaise = input.amountPaise ?? remainingRefundablePaise;

      if (requestedPaise <= 0) {
        throw new BadRequestError('Refund amount must be greater than 0 paise.');
      }

      if (requestedPaise > remainingRefundablePaise) {
        throw new BadRequestError(
          `Invalid refund amount. Available for refund: ${remainingRefundablePaise} paise, requested: ${requestedPaise} paise.`,
        );
      }

      // Call Gateway API
      const gateway = getPaymentGateway();
      const gatewayRefund = await gateway.createRefund({
        paymentId: payment.razorpayPaymentId,
        amountPaise: requestedPaise,
        reason: input.reason ?? 'Customer requested refund',
      });

      // Save Refund record with status PENDING
      const refundRecord = await tx.refund.create({
        data: {
          id: uuidv7(),
          paymentId: payment.id,
          razorpayRefundId: gatewayRefund.id,
          amountPaise: requestedPaise,
          reason: input.reason,
          status: RefundStatus.PENDING,
          initiatedByAdminId: adminUserId,
        },
      });

      await auditService.log(
        {
          actorUserId: adminUserId,
          action: 'PAYMENT_REFUND_INITIATED',
          entityType: 'Refund',
          entityId: refundRecord.id,
          afterState: {
            paymentId: payment.id,
            amountPaise: requestedPaise,
            status: RefundStatus.PENDING,
          },
        },
        tx,
      );

      return {
        refund: refundRecord,
        status: RefundStatus.PENDING,
        message:
          'Refund initiated with payment gateway. Status will update once confirmed via webhook.',
      };
    });
  }

  /**
   * R4: Handles refund.processed webhook from Razorpay.
   * Updates Refund to PROCESSED, sums all processed refunds on the payment,
   * transitions Order/Payment to REFUNDED or PARTIALLY_REFUNDED, and revokes entitlement on full refund.
   */
  public async handleRefundProcessed(gatewayRefund: any) {
    const refundId = gatewayRefund.id;
    logger.info({ refundId }, 'Handling refund.processed webhook');

    const result = await prisma.$transaction(async (tx) => {
      let refund = await tx.refund.findUnique({
        where: { razorpayRefundId: refundId },
        include: { payment: { include: { order: true } } },
      });

      if (!refund) {
        const payment = await tx.payment.findUnique({
          where: { razorpayPaymentId: gatewayRefund.payment_id },
          include: { order: true },
        });

        if (!payment) {
          logger.warn(
            { gatewayRefund },
            'Refund processed for unknown payment; skipping gracefully to prevent retry loops',
          );
          return { success: false, reason: 'PAYMENT_NOT_FOUND' };
        }

        refund = await tx.refund.create({
          data: {
            id: uuidv7(),
            paymentId: payment.id,
            razorpayRefundId: refundId,
            amountPaise: gatewayRefund.amount,
            status: RefundStatus.PENDING,
          },
          include: { payment: { include: { order: true } } },
        });
      }

      if (refund.status === RefundStatus.PROCESSED) {
        logger.info({ refundId }, 'Refund already marked PROCESSED; returning idempotently');
        return { success: true, alreadyProcessed: true };
      }

      // Mark Refund as PROCESSED
      await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.PROCESSED,
        },
      });

      // Row-lock Payment to atomically calculate total refunds
      const paymentRows = await tx.$queryRaw<
        Array<{ id: string; amountPaise: number; orderId: string }>
      >`
        SELECT id, "amountPaise", "orderId"
        FROM "Payment"
        WHERE id = ${refund.paymentId}::uuid
        FOR UPDATE
      `;
      const lockedPayment = paymentRows[0];
      if (!lockedPayment) {
        throw new NotFoundError(`Payment ${refund.paymentId} not found under lock`);
      }

      const allProcessed = await tx.refund.findMany({
        where: { paymentId: refund.paymentId, status: RefundStatus.PROCESSED },
      });
      const totalRefundedPaise = allProcessed.reduce((acc, r) => acc + r.amountPaise, 0);

      const isFullRefund = totalRefundedPaise >= lockedPayment.amountPaise;

      if (isFullRefund) {
        await tx.payment.update({
          where: { id: lockedPayment.id },
          data: { status: PaymentStatus.REFUNDED },
        });
        await tx.order.update({
          where: { id: lockedPayment.orderId },
          data: { status: OrderStatus.REFUNDED },
        });
        // Revoke entitlement on full refund
        await entitlementService.revokeEntitlement(
          tx,
          refund.payment.order.userId,
          refund.payment.order.productId,
          refund.reason ?? 'Full refund processed via gateway webhook',
        );
      } else {
        await tx.order.update({
          where: { id: lockedPayment.orderId },
          data: { status: OrderStatus.PARTIALLY_REFUNDED },
        });
      }

      await auditService.log(
        {
          actorUserId: refund.initiatedByAdminId || null,
          action: isFullRefund ? 'PAYMENT_REFUNDED_FULL' : 'PAYMENT_REFUNDED_PARTIAL',
          entityType: 'Refund',
          entityId: refund.id,
          afterState: { totalRefundedPaise, isFullRefund },
        },
        tx,
      );

      return {
        success: true,
        isFullRefund,
        totalRefundedPaise,
        userId: refund.payment.order.userId,
        refundId: refund.id,
      };
    });

    if (result.isFullRefund && result.userId) {
      await streamService.clearUserSessions(result.userId).catch(() => {});
    }

    if (result.success && !result.alreadyProcessed && (result as any).refundId) {
      try {
        const fullRefund = await prisma.refund.findUnique({
          where: { id: (result as any).refundId },
          include: {
            payment: {
              include: {
                order: {
                  include: {
                    user: true,
                    product: true,
                  },
                },
              },
            },
          },
        });

        if (fullRefund?.payment?.order?.user) {
          const ord = fullRefund.payment.order;
          await emailService.sendRefundConfirmationEmail({
            to: ord.user.email,
            name: ord.user.name,
            courseTitle: ord.product.title,
            orderId: ord.id,
            refundId: fullRefund.id,
            amountPaise: fullRefund.amountPaise,
            reason: fullRefund.reason ?? undefined,
            userId: ord.userId,
          });
        }
      } catch (err) {
        logger.error({ err, refundId }, 'Failed to dispatch refund confirmation email');
      }
    }

    return result;
  }

  /**
   * R4: Handles refund.failed webhook from Razorpay.
   * Updates Refund status to FAILED and preserves original order/entitlement.
   */
  public async handleRefundFailed(gatewayRefund: any) {
    const refundId = gatewayRefund.id;
    logger.warn({ refundId }, 'Handling refund.failed webhook');

    const refund = await prisma.refund.findUnique({
      where: { razorpayRefundId: refundId },
    });

    if (refund) {
      await prisma.refund.update({
        where: { id: refund.id },
        data: { status: RefundStatus.FAILED },
      });

      await auditService.log({
        actorUserId: null,
        action: 'PAYMENT_REFUND_FAILED',
        entityType: 'Refund',
        entityId: refund.id,
        afterState: { refundId, error: gatewayRefund.error_description },
      });
    }

    return { success: true };
  }

  /**
   * Reconciles stuck CREATED/PENDING orders by checking gateway status.
   * If captured: marks PAID.
   * If stuck > 30 minutes with no payment: marks CANCELLED and releases coupon redemption (R5).
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
    let authorizedAlerts = 0;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    for (const order of stuckOrders) {
      try {
        if (!order.razorpayOrderId) continue;

        const payments = await gateway.fetchOrderPayments(order.razorpayOrderId);
        const captured = payments.find((p) => p.status === 'captured');
        const authorized = payments.filter((p) => p.status === 'authorized');

        // S5: Log an error-level alert for payments sitting in "authorized" for more than 15 minutes
        for (const authPay of authorized) {
          if (order.createdAt <= fifteenMinutesAgo) {
            authorizedAlerts++;
            logger.error(
              {
                orderId: order.id,
                razorpayOrderId: order.razorpayOrderId,
                paymentId: authPay.id,
                orderCreatedAt: order.createdAt,
              },
              'CRITICAL ALERT: Payment has been sitting in "authorized" state for more than 15 minutes without capture. Verify that Razorpay Auto-Capture is ENABLED in your Razorpay Dashboard Settings, or manually capture this payment.',
            );
          }
        }

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
          // If order is older than 30 minutes with no captured payment, cancel order and release coupon
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          if (order.createdAt <= thirtyMinutesAgo) {
            await prisma.$transaction(async (tx) => {
              await tx.order.update({
                where: { id: order.id },
                data: { status: OrderStatus.CANCELLED },
              });
              // Release reserved coupon redemption (R5)
              await tx.couponRedemption.deleteMany({
                where: { orderId: order.id },
              });
            });
            expired++;
          }
        }
      } catch (err) {
        logger.error({ err, orderId: order.id }, 'Error during single order reconciliation');
      }
    }

    // S5: Also check local DB for any Payment records stuck in PENDING status for > 15 minutes
    const stuckAuthorizedDbPayments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        createdAt: { lte: fifteenMinutesAgo },
      },
    });

    for (const p of stuckAuthorizedDbPayments) {
      authorizedAlerts++;
      logger.error(
        {
          paymentId: p.id,
          razorpayPaymentId: p.razorpayPaymentId,
          orderId: p.orderId,
          createdAt: p.createdAt,
        },
        'CRITICAL ALERT: Payment has been sitting in "authorized" (PENDING) status for more than 15 minutes without capture. Verify that Razorpay Auto-Capture is ENABLED in Razorpay Dashboard Settings.',
      );
    }

    return {
      checked: stuckOrders.length,
      reconciled,
      expired,
      authorizedAlerts,
    };
  }

  /**
   * Calculates a price quote (subtotal, discount, tax, total) for checkout.
   * Can be queried before or after login. Zero tax or price computation in browser.
   */
  public async calculatePriceQuote(params: {
    productId?: string;
    courseSlug?: string;
    couponCode?: string;
    userId?: string;
  }) {
    const { productId, courseSlug, couponCode, userId } = params;

    let product = null;
    if (productId) {
      product = await prisma.product.findUnique({
        where: { id: productId, deletedAt: null },
      });
    } else if (courseSlug) {
      product = await prisma.product.findFirst({
        where: { slug: courseSlug, deletedAt: null },
      });
    }

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundError('Course product not found or not published.');
    }

    let discountPaise = 0;
    let appliedCoupon: any = null;

    if (couponCode && couponCode.trim()) {
      const code = couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({
        where: { code },
      });

      if (coupon && coupon.isActive) {
        const now = new Date();
        const isValidWindow =
          (!coupon.validFrom || coupon.validFrom <= now) &&
          (!coupon.validUntil || coupon.validUntil >= now);
        const matchesCourse = coupon.productId === null || coupon.productId === product.id;

        if (isValidWindow && matchesCourse) {
          let userEligible = true;
          if (userId && coupon.perUserLimit) {
            const userUses = await prisma.couponRedemption.count({
              where: { couponId: coupon.id, userId },
            });
            if (userUses >= coupon.perUserLimit) {
              userEligible = false;
            }
          }

          if (coupon.maxRedemptions) {
            const totalUses = await prisma.couponRedemption.count({
              where: { couponId: coupon.id },
            });
            if (totalUses >= coupon.maxRedemptions) {
              userEligible = false;
            }
          }

          if (userEligible) {
            if (coupon.type === 'PERCENT') {
              discountPaise = Math.round((product.pricePaise * coupon.value) / 100);
            } else {
              discountPaise = coupon.value;
            }
            discountPaise = Math.min(discountPaise, product.pricePaise);
            appliedCoupon = {
              code: coupon.code,
              type: coupon.type,
              value: coupon.value,
              discountPaise,
            };
          }
        }
      }
    }

    if (couponCode && couponCode.trim() && !appliedCoupon) {
      throw new BadRequestError('Invalid or expired coupon code.');
    }

    const taxCalculation = await calculateTaxAndTotals(product.pricePaise, discountPaise);

    return {
      productId: product.id,
      courseTitle: product.title,
      courseSlug: product.slug,
      basePricePaise: product.pricePaise,
      discountPaise,
      subtotalPaise: taxCalculation.subtotalPaise,
      taxPaise: taxCalculation.taxPaise,
      totalPaise: taxCalculation.totalPaise,
      currency: 'INR',
      isTaxApplicable: !taxCalculation.isTaxExemptOrZero,
      taxRatePercent: taxCalculation.gstRatePercent,
      pricesTaxInclusive: taxCalculation.pricesTaxInclusive,
      coupon: appliedCoupon,
    };
  }
}

export const orderService = new OrderService();
