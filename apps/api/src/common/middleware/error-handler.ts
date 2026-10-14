import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { logger } from '../logger/logger.js';
import { env } from '../../config/env.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.id || 'unknown';

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(
        { err, requestId, path: req.path, method: req.method },
        'Operational server error',
      );
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        requestId,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const formattedDetails = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload or parameters',
        requestId,
        details: formattedDetails,
      },
    });
    return;
  }

  // Unexpected unhandled errors
  logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        name: err.name,
      },
      requestId,
      path: req.path,
      method: req.method,
    },
    'Unhandled server error',
  );

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please contact support if the issue persists.'
          : err.message,
      requestId,
    },
  });
}
