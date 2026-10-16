export interface CreateGatewayOrderParams {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface GatewayOrder {
  id: string; // razorpayOrderId (e.g. order_xxx)
  amountPaise: number;
  currency: string;
  receipt: string;
  status: string;
  createdAt: number;
}

export interface VerifySignatureParams {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface GatewayPayment {
  id: string; // razorpayPaymentId (e.g. pay_xxx)
  orderId: string;
  amountPaise: number;
  currency: string;
  status: 'captured' | 'authorized' | 'failed' | 'refunded';
  method?: string;
  email?: string;
  contact?: string;
  capturedAt?: number;
  errorDescription?: string;
}

export interface CreateRefundParams {
  paymentId: string;
  amountPaise?: number; // null/undefined for full refund
  reason?: string;
  notes?: Record<string, string>;
}

export interface GatewayRefund {
  id: string; // razorpayRefundId (e.g. rfd_xxx)
  paymentId: string;
  amountPaise: number;
  currency: string;
  status: 'processed' | 'pending' | 'failed';
  createdAt: number;
}

export interface PaymentGateway {
  createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrder>;
  verifyPaymentSignature(params: VerifySignatureParams): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  fetchPayment(paymentId: string): Promise<GatewayPayment>;
  fetchOrderPayments(orderId: string): Promise<GatewayPayment[]>;
  createRefund(params: CreateRefundParams): Promise<GatewayRefund>;
}
