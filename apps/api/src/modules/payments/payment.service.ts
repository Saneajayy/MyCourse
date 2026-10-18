import { env } from '../../config/env.js';
import { PaymentGateway } from './payment-gateway.interface.js';
import { RazorpayPaymentGateway } from './razorpay.gateway.js';
import { FakePaymentGateway } from './fake-payment.gateway.js';
import { logger } from '../../common/logger/logger.js';

let activeGateway: PaymentGateway | null = null;

export function initializePaymentGateway(): PaymentGateway {
  if (env.NODE_ENV === 'production' && env.PAYMENT_PROVIDER === 'fake') {
    throw new Error('FATAL: Cannot initialize FakePaymentGateway in production mode.');
  }

  if (env.PAYMENT_PROVIDER === 'razorpay' && env.NODE_ENV !== 'test') {
    logger.info('Initializing RazorpayPaymentGateway');
    activeGateway = new RazorpayPaymentGateway({
      keyId: env.RAZORPAY_KEY_ID,
      keySecret: env.RAZORPAY_KEY_SECRET,
      webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    });
  } else {
    logger.info('Initializing FakePaymentGateway (test/development mock)');
    activeGateway = new FakePaymentGateway();
  }
  return activeGateway;
}

export function getPaymentGateway(): PaymentGateway {
  if (!activeGateway) {
    return initializePaymentGateway();
  }
  return activeGateway;
}

export function setPaymentGateway(gateway: PaymentGateway): void {
  if (env.NODE_ENV === 'production' && gateway instanceof FakePaymentGateway) {
    throw new Error('FATAL: Cannot set FakePaymentGateway in production mode.');
  }
  activeGateway = gateway;
}
