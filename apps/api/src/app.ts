import path from 'path';
import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './common/logger/logger.js';
import { requestIdMiddleware } from './common/middleware/request-id.js';
import { errorHandler } from './common/middleware/error-handler.js';
import { NotFoundError, ForbiddenError } from './common/errors/app-error.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { sessionsRouter } from './modules/sessions/sessions.routes.js';
import { adminCourseRouter, publicCourseRouter } from './modules/courses/course.routes.js';
import { bunnyWebhookController } from './modules/webhooks/bunny.webhook.js';
import { docsRouter } from './docs/openapi.js';

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export function createApp(): Express {
  const app = express();

  // 1. Trust proxy configuration for Cloudflare + 1 reverse proxy (F2)
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 2);
  } else {
    app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  }

  // Normalize client IP from CF-Connecting-IP header when running behind Cloudflare
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp && typeof cfIp === 'string' && cfIp.trim().length > 0) {
      Object.defineProperty(req, 'ip', {
        value: cfIp.trim(),
        writable: true,
        configurable: true,
      });
    }
    next();
  });

  // 2. Request ID correlation
  app.use(requestIdMiddleware);

  // 3. Structured HTTP logging
  if (env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        genReqId: (req) => req.id,
        customLogLevel: (_req, res, err) => {
          if (res.statusCode >= 500 || err) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
      }),
    );
  }

  // 4. Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 5. CORS Allow-List with Credentials
  const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server webhooks)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(
            new ForbiddenError(
              `Cross-origin request rejected: Origin [${origin}] not permitted by CORS policy`,
            ),
          );
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
      exposedHeaders: ['X-Request-Id', 'Retry-After'],
    }),
  );

  // 6. Compression
  app.use(compression());

  // 7. Body Parsing with rawBody preservation (critical for webhook HMAC verification)
  app.use(
    express.json({
      limit: '2mb',
      verify: (req: Request, _res: Response, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // Static uploads (thumbnails and public media)
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // 8. Health and Readiness probes (available at both root and /api/v1)
  app.use(healthRouter);
  app.use('/api/v1', healthRouter);

  // 9. Interactive API Documentation (served at /docs in non-production)
  if (env.NODE_ENV !== 'production') {
    app.use('/docs', docsRouter);
  }

  // 10. API Version 1 Router
  const v1Router = express.Router();
  v1Router.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        service: 'Hydraulic Engineering Course API',
        version: 'v1',
      },
    });
  });

  // Auth & Session routes
  v1Router.use('/auth', authRouter);
  v1Router.use('/sessions', sessionsRouter);

  // Public Course Catalog routes (zero-leakage of paid video IDs)
  v1Router.use('/courses', publicCourseRouter);

  // Admin Management routes (Protected by Auth + Admin Role + Mandatory 2FA)
  v1Router.use('/admin', adminCourseRouter);

  // Bunny Webhook endpoint (Signature-verified, exempt from CORS/CSRF)
  v1Router.post('/webhooks/bunny', (req, res, next) =>
    bunnyWebhookController.handleWebhook(req, res, next),
  );

  app.use('/api/v1', v1Router);

  // 11. 404 Handler for undefined routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // 12. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
