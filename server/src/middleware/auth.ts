import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  timezone: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      userId?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Authentication required'));
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next(AppError.unauthorized('Authentication token is missing'));
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findFirst({
      where: {
        id: payload.userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
      },
    });

    if (!user) {
      return next(AppError.unauthorized('User account not found or has been deactivated'));
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    next(err);
  }
}
