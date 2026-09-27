import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.id || (res.locals.requestId as string) || 'unknown';

  // 1. AppError (custom operational errors)
  if (err instanceof AppError) {
    logger.warn(
      {
        err: {
          code: err.code,
          message: err.message,
          details: err.details,
          httpStatus: err.httpStatus,
        },
        requestId,
        path: req.path,
        method: req.method,
      },
      `AppError: ${err.message}`
    );

    res.status(err.httpStatus).json({
      error: {
        code: err.code,
        message: err.userMessage,
        ...(err.details ? { details: err.details } : {}),
        requestId,
      },
    });
    return;
  }

  // 2. Zod validation errors
  if (err instanceof ZodError) {
    logger.warn(
      {
        issues: err.issues,
        requestId,
        path: req.path,
        method: req.method,
      },
      'Validation error (Zod)'
    );

    res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request payload failed schema validation',
        details: err.flatten(),
        requestId,
      },
    });
    return;
  }

  // 3. Prisma database errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error(
      {
        prismaCode: err.code,
        meta: err.meta,
        requestId,
        path: req.path,
        method: req.method,
      },
      `Prisma error [${err.code}]`
    );

    if (err.code === 'P2002') {
      res.status(409).json({
        error: {
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A record with this value already exists',
          details: err.meta,
          requestId,
        },
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Requested database record was not found',
          requestId,
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'Something went wrong on our side. Nothing was changed.',
        requestId,
      },
    });
    return;
  }

  // 4. Unhandled / Unexpected Errors
  logger.error(
    {
      err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
      requestId,
      path: req.path,
      method: req.method,
    },
    'Unhandled server error'
  );

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong on our side. Nothing was changed.',
      requestId,
    },
  });
}
