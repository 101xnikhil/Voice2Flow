import { Router } from 'express';
import { AuthController } from './controller.js';
import { validateBody } from '../../middleware/validate.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';
import { RegisterInputSchema, LoginInputSchema } from '@voice2flow/shared';

export const authRouter = Router();

authRouter.post(
  '/register',
  authRateLimiter,
  validateBody(RegisterInputSchema),
  AuthController.register
);

authRouter.post(
  '/login',
  authRateLimiter,
  validateBody(LoginInputSchema),
  AuthController.login
);

authRouter.post('/refresh', AuthController.refresh);

authRouter.post('/logout', AuthController.logout);

authRouter.get('/me', requireAuth, AuthController.me);
