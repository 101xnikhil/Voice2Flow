import {
  WorkflowNodeType,
  CreateTaskNodeParams,
  UpdateTaskNodeParams,
  DeleteTaskNodeParams,
  CompleteTaskNodeParams,
  RestoreTaskNodeParams,
  QueryTasksNodeParams,
} from '@voice2flow/shared';
import { ActionContext, ActionResult } from './types.js';
import { executeCreateTask } from './createTask.js';
import { executeUpdateTask } from './updateTask.js';
import { executeDeleteTask } from './deleteTask.js';
import { executeCompleteTask } from './completeTask.js';
import { executeRestoreTask } from './restoreTask.js';
import { executeQueryTasks } from './queryTasks.js';

export * from './types.js';
export * from './createTask.js';
export * from './updateTask.js';
export * from './deleteTask.js';
export * from './completeTask.js';
export * from './restoreTask.js';
export * from './queryTasks.js';

export async function executeAction(
  type: WorkflowNodeType,
  ctx: ActionContext,
  params: Record<string, unknown>
): Promise<ActionResult> {
  switch (type) {
    case 'CREATE_TASK':
      return executeCreateTask(ctx, params as unknown as CreateTaskNodeParams);
    case 'UPDATE_TASK':
      return executeUpdateTask(ctx, params as unknown as UpdateTaskNodeParams);
    case 'DELETE_TASK':
      return executeDeleteTask(ctx, params as unknown as DeleteTaskNodeParams);
    case 'COMPLETE_TASK':
      return executeCompleteTask(ctx, params as unknown as CompleteTaskNodeParams);
    case 'RESTORE_TASK':
      return executeRestoreTask(ctx, params as unknown as RestoreTaskNodeParams);
    case 'QUERY_TASKS':
      return executeQueryTasks(ctx, params as unknown as QueryTasksNodeParams);
    default:
      return {
        success: false,
        error: `Action handler for ${type} is not implemented in this phase`,
      };
  }
}
