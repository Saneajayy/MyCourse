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
import { NotFoundError } from './common/errors/app-error.js';
import { healthRouter } from './modules/health/health.routes.js';

export function createApp(): Express {
  const app = express();

  // 1. Trust proxy in production/reverse-proxy environments
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

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
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin [${origin}] not permitted by CORS policy`));
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
      limit: '1mb',
      verify: (req: Request, _res: Response, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // 8. Health and Readiness probes (available at both root and /api/v1)
  app.use(healthRouter);
  app.use('/api/v1', healthRouter);

  // 9. API Version 1 Router Placeholder
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
  app.use('/api/v1', v1Router);

  // 10. 404 Handler for undefined routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // 11. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
