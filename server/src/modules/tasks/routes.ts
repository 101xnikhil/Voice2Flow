import { Router } from 'express';
import { TaskController } from './controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskQueryFiltersSchema,
  BulkTaskActionSchema,
} from '@voice2flow/shared';

const router = Router();

// All task routes require authentication
router.use(requireAuth);

router.get('/', validateQuery(TaskQueryFiltersSchema), TaskController.listTasks);
router.post('/', validateBody(CreateTaskSchema), TaskController.createTask);
router.post('/bulk', validateBody(BulkTaskActionSchema), TaskController.bulkAction);

router.get('/:id', TaskController.getTaskById);
router.patch('/:id', validateBody(UpdateTaskSchema), TaskController.updateTask);
router.delete('/:id', TaskController.softDeleteTask);

router.post('/:id/complete', TaskController.completeTask);
router.post('/:id/reopen', TaskController.reopenTask);
router.post('/:id/restore', TaskController.restoreTask);
router.delete('/:id/permanent', TaskController.permanentDeleteTask);

export default router;
