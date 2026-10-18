import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { logger } from '../logger/logger.js';
import { env } from '../../config/env.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.id || 'unknown';

  if (err instanceof AppError) {
    if (err.statusCode === 503) {
      res.setHeader('Retry-After', '1');
    }

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

    logger.warn(
      { details: formattedDetails, requestId, path: req.path, method: req.method },
      'Request payload validation error',
    );

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

  // Multer upload errors (e.g. file size exceeded or upload format issues)
  if (err.name === 'MulterError' || (err as any).code === 'LIMIT_FILE_SIZE') {
    const isLimitSize = (err as any).code === 'LIMIT_FILE_SIZE';
    res.status(400).json({
      success: false,
      error: {
        code: 'FILE_UPLOAD_ERROR',
        message: isLimitSize ? 'File size exceeds maximum allowed limit of 5MB' : err.message,
        requestId,
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
        process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please contact support if the issue persists.'
          : err.message,
      requestId,
    },
  });
}
