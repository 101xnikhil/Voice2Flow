import { Request, Response, NextFunction } from 'express';
import { AuthService } from './service.js';
import { env } from '../../config/env.js';
import { REFRESH_COOKIE_NAME, REFRESH_TOKEN_EXPIRY_DAYS } from '@voice2flow/shared';

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
  });
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientInfo = {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
      };

      const result = await AuthService.register(req.body, clientInfo);
      setRefreshCookie(res, result.refreshToken);

      res.status(201).json({
        data: {
          user: result.user,
          settings: result.settings,
          accessToken: result.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientInfo = {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
      };

      const result = await AuthService.login(req.body, clientInfo);
      setRefreshCookie(res, result.refreshToken);

      res.status(200).json({
        data: {
          user: result.user,
          settings: result.settings,
          accessToken: result.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
      const clientInfo = {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
      };

      const result = await AuthService.refresh(rawToken, clientInfo);
      setRefreshCookie(res, result.refreshToken);

      res.status(200).json({
        data: {
          user: result.user,
          settings: result.settings,
          accessToken: result.accessToken,
        },
      });
    } catch (err) {
      clearRefreshCookie(res);
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
      await AuthService.logout(rawToken);
      clearRefreshCookie(res);

      res.status(200).json({
        data: {
          message: 'Logged out successfully',
        },
      });
    } catch (err) {
      clearRefreshCookie(res);
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.me(req.userId!);
      res.status(200).json({
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
