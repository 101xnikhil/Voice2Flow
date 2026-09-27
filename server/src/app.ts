import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalRateLimiter } from './middleware/rateLimit.js';
import { AppError } from './lib/errors.js';
import { healthRouter } from './modules/health/routes.js';
import { authRouter } from './modules/auth/routes.js';
import userRouter from './modules/users/routes.js';
import taskRouter from './modules/tasks/routes.js';
import commandRouter from './modules/commands/routes.js';
import executionRouter from './modules/executions/routes.js';
import { API_PREFIX } from '@voice2flow/shared';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    })
  );

  // Cookie parser
  app.use(cookieParser());

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Global rate limiter
  app.use(globalRateLimiter);

  // Request ID injection
  app.use(requestIdMiddleware);

  // HTTP Request Logging
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id || 'unknown',
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === `${API_PREFIX}/health`,
      },
    })
  );

  // Platform root health check (spec §16: GET /health)
  app.use('/', healthRouter);

  // API v1 routes
  const apiRouter = express.Router();
  apiRouter.use('/', healthRouter);
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/users', userRouter);
  apiRouter.use('/tasks', taskRouter);
  apiRouter.use('/commands', commandRouter);
  apiRouter.use('/executions', executionRouter);

  app.use(API_PREFIX, apiRouter);


  // 404 Catch-all handler
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(AppError.notFound('Endpoint not found'));
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
