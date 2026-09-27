import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(AppError.rateLimited("You're going a little fast. Please slow down."));
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skip: () => process.env.NODE_ENV === 'test',
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = req.body && typeof req.body.email === 'string' ? req.body.email.toLowerCase() : '';
    return `${ip}:${email}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(AppError.rateLimited('Too many authentication attempts. Please try again in 15 minutes.'));
  },
});
