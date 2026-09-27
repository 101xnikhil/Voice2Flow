import { Router } from 'express';
import { UserController } from './controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import {
  UpdateUserSchema,
  UpdateUserSettingsSchema,
  ChangePasswordInputSchema,
  DeleteAccountInputSchema,
} from '@voice2flow/shared';

const router = Router();

// All user routes require authentication
router.use(requireAuth);

router.get('/me', UserController.getMe);
router.patch('/me', validateBody(UpdateUserSchema), UserController.updateMe);
router.post('/me/password', validateBody(ChangePasswordInputSchema), UserController.changePassword);

router.get('/me/settings', UserController.getSettings);
router.patch('/me/settings', validateBody(UpdateUserSettingsSchema), UserController.updateSettings);

router.get('/me/sessions', UserController.getSessions);
router.delete('/me/sessions/:id', UserController.revokeSession);

router.delete('/me', validateBody(DeleteAccountInputSchema), UserController.deleteAccount);

export default router;
