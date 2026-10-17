import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './common/logger/logger.js';
import { prisma, checkDatabaseHealth } from './common/db/prisma.js';
import { redisClient, checkRedisHealth } from './common/redis/redis.js';
import { initializePaymentGateway } from './modules/payments/payment.service.js';
import {
  initializeReconciliationWorker,
  stopReconciliationWorker,
} from './modules/reconciliation/reconciliation.worker.js';
import { initializeWebhookQueue, stopWebhookQueue } from './modules/webhooks/webhook.queue.js';
import {
  initializeExpiryWorker,
  stopExpiryWorker,
} from './modules/entitlements/entitlement-expiry.worker.js';
import { checkTurnstileConfiguration } from './modules/contact/contact.controller.js';

export { checkTurnstileConfiguration };

async function startServer(): Promise<void> {
  const app = createApp();

  // Initialize Payment Gateway and BullMQ Workers
  initializePaymentGateway();
  initializeReconciliationWorker();
  initializeWebhookQueue();
  initializeExpiryWorker();

  // Pre-flight boot readiness check
  const [dbHealthy, redisHealthy] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

  checkTurnstileConfiguration();

  if (env.NODE_ENV === 'production') {
    if (!dbHealthy || !redisHealthy) {
      logger.fatal(
        { dbHealthy, redisHealthy },
        'FATAL: Startup aborted. Required database or Redis connection failed in production.',
      );
      process.exit(1);
    }
  } else {
    logger.info({ dbHealthy, redisHealthy }, 'Development startup pre-flight check completed');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        apiUrl: env.API_URL,
      },
      `API Server successfully listening on port ${env.PORT}`,
    );
  });

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, 'Graceful shutdown initiated...');

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await stopReconciliationWorker();
        logger.info('Reconciliation worker stopped');
      } catch (err) {
        logger.error({ err }, 'Error stopping reconciliation worker');
      }

      try {
        await stopWebhookQueue();
        logger.info('Webhook queue worker stopped');
      } catch (err) {
        logger.error({ err }, 'Error stopping webhook queue worker');
      }

      try {
        await stopExpiryWorker();
        logger.info('Entitlement expiry worker stopped');
      } catch (err) {
        logger.error({ err }, 'Error stopping entitlement expiry worker');
      }

      try {
        await prisma.$disconnect();
        logger.info('Prisma disconnected');
      } catch (err) {
        logger.error({ err }, 'Error disconnecting Prisma');
      }

      try {
        await redisClient.quit();
        logger.info('Redis client disconnected');
      } catch (err) {
        logger.error({ err }, 'Error disconnecting Redis');
      }

      logger.info('Graceful shutdown completed');
      process.exit(0);
    });

    // Force shutdown if taking longer than 10 seconds
    setTimeout(() => {
      logger.error('Forcefully terminating process due to shutdown timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((err) => {
  logger.fatal({ err }, 'Unhandled fatal startup error');
  process.exit(1);
});
