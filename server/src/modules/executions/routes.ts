import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { ExecutionsController } from './controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', ExecutionsController.listExecutions);
router.get('/:id', ExecutionsController.getExecutionById);
router.post('/:id/cancel', ExecutionsController.cancelExecution);

export default router;
