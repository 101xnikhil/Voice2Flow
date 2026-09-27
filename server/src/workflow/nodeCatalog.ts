/**
 * Workflow Node Catalog
 * Single source of truth for node types, labels, descriptions, and parameter schemas.
 */

import { z } from 'zod';
import {
  WorkflowNodeType,
  CreateTaskNodeParamsSchema,
  UpdateTaskNodeParamsSchema,
  CompleteTaskNodeParamsSchema,
  DeleteTaskNodeParamsSchema,
  RestoreTaskNodeParamsSchema,
  QueryTasksNodeParamsSchema,
  EndNodeParamsSchema,
  ConditionExprSchema,
  TaskRefSchema,
} from '@voice2flow/shared';

export interface NodeCatalogEntry {
  type: WorkflowNodeType;
  label: string;
  description: string;
  paramsSchema: z.ZodType<unknown>;
  isInternal?: boolean;
}

export const NODE_CATALOG: Record<WorkflowNodeType, NodeCatalogEntry> = {
  START: {
    type: 'START',
    label: 'Start',
    description: 'Entry point of the workflow execution.',
    paramsSchema: z.record(z.unknown()).optional(),
  },
  CREATE_TASK: {
    type: 'CREATE_TASK',
    label: 'Create Task',
    description: 'Creates a new task in the user workspace.',
    paramsSchema: CreateTaskNodeParamsSchema,
  },
  UPDATE_TASK: {
    type: 'UPDATE_TASK',
    label: 'Update Task',
    description: 'Modifies fields of an existing task or reschedules it.',
    paramsSchema: UpdateTaskNodeParamsSchema,
  },
  COMPLETE_TASK: {
    type: 'COMPLETE_TASK',
    label: 'Complete Task',
    description: 'Marks an active task as completed.',
    paramsSchema: CompleteTaskNodeParamsSchema,
  },
  DELETE_TASK: {
    type: 'DELETE_TASK',
    label: 'Delete Task',
    description: 'Soft-deletes a task or multiple tasks into trash.',
    paramsSchema: DeleteTaskNodeParamsSchema,
  },
  RESTORE_TASK: {
    type: 'RESTORE_TASK',
    label: 'Restore Task',
    description: 'Restores a soft-deleted task back to active status.',
    paramsSchema: RestoreTaskNodeParamsSchema,
  },
  QUERY_TASKS: {
    type: 'QUERY_TASKS',
    label: 'Query Tasks',
    description: 'Searches or filters tasks owned by the user.',
    paramsSchema: QueryTasksNodeParamsSchema,
    isInternal: true,
  },
  REMINDER: {
    type: 'REMINDER',
    label: 'Reminder',
    description: 'Creates and dispatches a notification or scheduled reminder.',
    paramsSchema: z.object({
      taskRef: TaskRefSchema.optional(),
      message: z.string().min(1),
      skipIfCompleted: z.boolean().default(true),
    }),
  },
  NOTIFICATION: {
    type: 'NOTIFICATION',
    label: 'Notification',
    description: 'Sends an in-app notification.',
    paramsSchema: z.object({
      taskRef: TaskRefSchema.optional(),
      title: z.string().min(1),
      body: z.string().min(1),
    }),
  },
  WAIT: {
    type: 'WAIT',
    label: 'Wait',
    description: 'Pauses workflow execution until a timestamp or duration.',
    paramsSchema: z.object({
      until: z.union([
        z.object({ mode: z.literal('ABSOLUTE'), at: z.string() }),
        z.object({ mode: z.literal('DURATION'), minutes: z.number().int().positive() }),
      ]),
    }),
  },
  CHECK_STATUS: {
    type: 'CHECK_STATUS',
    label: 'Check Status',
    description: 'Loads the latest snapshot of a referenced task into context.',
    paramsSchema: z.object({
      taskRef: TaskRefSchema,
    }),
  },
  CONDITION: {
    type: 'CONDITION',
    label: 'Condition',
    description: 'Branches workflow execution based on context variables.',
    paramsSchema: z.object({
      expr: ConditionExprSchema,
    }),
  },
  END: {
    type: 'END',
    label: 'End',
    description: 'Terminal node marking successful completion of the workflow.',
    paramsSchema: EndNodeParamsSchema,
  },
};
