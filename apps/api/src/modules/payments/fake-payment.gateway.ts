import crypto from 'crypto';
import {
  CreateGatewayOrderParams,
  CreateRefundParams,
  GatewayOrder,
  GatewayPayment,
  GatewayRefund,
  PaymentGateway,
  VerifySignatureParams,
} from './payment-gateway.interface.js';

export class FakePaymentGateway implements PaymentGateway {
  public orders = new Map<string, GatewayOrder>();
  public payments = new Map<string, GatewayPayment>();
  public refunds = new Map<string, GatewayRefund>();

  public keySecret = 'test_razorpay_key_secret_for_tests_123456';
  public webhookSecret = 'test_razorpay_webhook_secret_for_tests_123456';

  public async createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrder> {
    const id = `order_fake_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const order: GatewayOrder = {
      id,
      amountPaise: params.amountPaise,
      currency: params.currency,
      receipt: params.receipt,
      status: 'created',
      createdAt: Math.floor(Date.now() / 1000),
    };
    this.orders.set(id, order);
    return order;
  }

  public signPayment(orderId: string, paymentId: string, secret = this.keySecret): string {
    return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  }

  public signWebhook(rawBody: string, secret = this.webhookSecret): string {
    return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  }

  public verifyPaymentSignature(params: VerifySignatureParams): boolean {
    const expected = this.signPayment(params.razorpayOrderId, params.razorpayPaymentId);
    try {
      const expectedBuf = Buffer.from(expected, 'hex');
      const actualBuf = Buffer.from(params.razorpaySignature, 'hex');
      if (expectedBuf.length !== actualBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }

  public verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const expected = this.signWebhook(rawBody);
    try {
      const expectedBuf = Buffer.from(expected, 'hex');
      const actualBuf = Buffer.from(signature, 'hex');
      if (expectedBuf.length !== actualBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }

  public registerPayment(payment: GatewayPayment): void {
    this.payments.set(payment.id, payment);
  }

  public async fetchPayment(paymentId: string): Promise<GatewayPayment> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      let matchedOrderId = 'order_unknown';
      if (paymentId.includes('_for_')) {
        const extracted = paymentId.split('_for_')[1];
        if (extracted) {
          matchedOrderId = extracted;
        }
      }
      return {
        id: paymentId,
        orderId: matchedOrderId,
        amountPaise: 499900,
        currency: 'INR',
        status: 'captured',
        method: 'card',
        capturedAt: Math.floor(Date.now() / 1000),
      };
    }
    return payment;
  }

  public async fetchOrderPayments(orderId: string): Promise<GatewayPayment[]> {
    const list: GatewayPayment[] = [];
    for (const p of this.payments.values()) {
      if (p.orderId === orderId) {
        list.push(p);
      }
    }
    return list;
  }

  public async createRefund(params: CreateRefundParams): Promise<GatewayRefund> {
    const id = `rfnd_fake_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payment = this.payments.get(params.paymentId);
    const amount = params.amountPaise ?? payment?.amountPaise ?? 1000;

    const refund: GatewayRefund = {
      id,
      paymentId: params.paymentId,
      amountPaise: amount,
      currency: payment?.currency ?? 'INR',
      status: 'processed',
      createdAt: Math.floor(Date.now() / 1000),
    };

    this.refunds.set(id, refund);
    return refund;
  }
}
