import { Request, Response, NextFunction } from 'express';
import { UserService } from './service.js';
import { hashToken } from '../../lib/jwt.js';
import { COOKIE_REFRESH_TOKEN } from '@voice2flow/shared';

export class UserController {
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await UserService.getMe(req.user!.id);
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.updateMe(req.user!.id, req.body);
      res.json({
        success: true,
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await UserService.changePassword(req.user!.id, req.body);
      res.json({
        success: true,
        data: { message: 'Password changed successfully' },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await UserService.getSettings(req.user!.id);
      res.json({
        success: true,
        data: settings,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await UserService.updateSettings(req.user!.id, req.body);
      res.json({
        success: true,
        data: settings,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.[COOKIE_REFRESH_TOKEN];
      const tokenHash = rawRefreshToken ? hashToken(rawRefreshToken) : undefined;
      const sessions = await UserService.getSessions(req.user!.id, tokenHash);
      res.json({
        success: true,
        data: sessions,
      });
    } catch (err) {
      next(err);
    }
  }

  static async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await UserService.revokeSession(req.user!.id, req.params.id);
      res.json({
        success: true,
        data: { message: 'Session revoked successfully' },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await UserService.deleteAccount(req.user!.id, req.body);
      res.clearCookie(COOKIE_REFRESH_TOKEN, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
      });
      res.json({
        success: true,
        data: { message: 'Account deleted successfully' },
      });
    } catch (err) {
      next(err);
    }
  }
}
