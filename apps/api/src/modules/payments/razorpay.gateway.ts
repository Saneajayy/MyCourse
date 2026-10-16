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
import { logger } from '../../common/logger/logger.js';
import { AppError } from '../../common/errors/app-error.js';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  timeoutMs?: number;
}

export class RazorpayPaymentGateway implements PaymentGateway {
  private readonly baseUrl = 'https://api.razorpay.com/v1';
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly timeoutMs: number;

  constructor(config: RazorpayConfig) {
    this.keyId = config.keyId;
    this.keySecret = config.keySecret;
    this.webhookSecret = config.webhookSecret;
    this.timeoutMs = config.timeoutMs ?? 10000;
  }

  private get authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        const errorMsg = data?.error?.description || data?.error?.message || 'Razorpay API error';
        logger.error(
          { endpoint, status: response.status, error: data?.error },
          'Razorpay request failed',
        );
        throw new AppError(response.status >= 500 ? 502 : 400, 'PAYMENT_GATEWAY_ERROR', errorMsg);
      }

      return data as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        logger.error({ endpoint }, 'Razorpay API request timed out');
        throw new AppError(504, 'GATEWAY_TIMEOUT', 'Payment gateway connection timed out');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  public async createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrder> {
    const payload = {
      amount: params.amountPaise,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
      payment_capture: 1, // Explicit auto-capture
    };

    const res = await this.request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      id: res.id,
      amountPaise: res.amount,
      currency: res.currency,
      receipt: res.receipt,
      status: res.status,
      createdAt: res.created_at,
    };
  }

  public verifyPaymentSignature(params: VerifySignatureParams): boolean {
    try {
      const body = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
      const expected = crypto.createHmac('sha256', this.keySecret).update(body).digest('hex');

      const expectedBuf = Buffer.from(expected, 'hex');
      const actualBuf = Buffer.from(params.razorpaySignature, 'hex');

      if (expectedBuf.length !== actualBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch (err) {
      logger.warn({ err }, 'Error checking payment signature');
      return false;
    }
  }

  public verifyWebhookSignature(rawBody: string, signature: string): boolean {
    try {
      const expected = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex');

      const expectedBuf = Buffer.from(expected, 'hex');
      const actualBuf = Buffer.from(signature, 'hex');

      if (expectedBuf.length !== actualBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch (err) {
      logger.warn({ err }, 'Error checking webhook signature');
      return false;
    }
  }

  public async fetchPayment(paymentId: string): Promise<GatewayPayment> {
    const res = await this.request<any>(`/payments/${paymentId}`, {
      method: 'GET',
    });

    return {
      id: res.id,
      orderId: res.order_id,
      amountPaise: res.amount,
      currency: res.currency,
      status: res.status,
      method: res.method,
      capturedAt: res.created_at,
      errorDescription: res.error_description,
    };
  }

  public async fetchOrderPayments(orderId: string): Promise<GatewayPayment[]> {
    const res = await this.request<any>(`/orders/${orderId}/payments`, {
      method: 'GET',
    });

    if (!res.items || !Array.isArray(res.items)) {
      return [];
    }

    return res.items.map((item: any) => ({
      id: item.id,
      orderId: item.order_id,
      amountPaise: item.amount,
      currency: item.currency,
      status: item.status,
      method: item.method,
      capturedAt: item.created_at,
      errorDescription: item.error_description,
    }));
  }

  public async createRefund(params: CreateRefundParams): Promise<GatewayRefund> {
    const payload: any = {
      notes: params.notes,
    };
    if (params.amountPaise) {
      payload.amount = params.amountPaise;
    }
    if (params.reason) {
      payload.notes = { ...payload.notes, reason: params.reason };
    }

    const res = await this.request<any>(`/payments/${params.paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      id: res.id,
      paymentId: res.payment_id,
      amountPaise: res.amount,
      currency: res.currency,
      status: res.status === 'processed' ? 'processed' : 'pending',
      createdAt: res.created_at,
    };
  }
}
