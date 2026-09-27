import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { commandRateLimiter } from '../../middleware/rateLimit.js';
import {
  CommandRequestSchema,
  CommandConfirmSchema,
  CommandResolveSchema,
} from '@voice2flow/shared';
import {
  handleCommand,
  handleConfirmCommand,
  handleCancelCommand,
  handleResolveCommand,
} from './controller.js';

const router = Router();

// Commands are protected by auth and rate-limited to 20 req/min
router.use(requireAuth);
router.use(commandRateLimiter);

router.post('/', validateBody(CommandRequestSchema), handleCommand);
router.post('/:id/confirm', validateBody(CommandConfirmSchema), handleConfirmCommand);
router.post('/:id/cancel', handleCancelCommand);
router.post('/:id/resolve', validateBody(CommandResolveSchema), handleResolveCommand);

export default router;
