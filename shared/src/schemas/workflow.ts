import { z } from 'zod';
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from '../constants.js';
import { CommandFiltersSchema, CommandScopeSchema } from './command.js';

export const WORKFLOW_NODE_TYPES = [
  'START',
  'CREATE_TASK',
  'UPDATE_TASK',
  'COMPLETE_TASK',
  'DELETE_TASK',
  'RESTORE_TASK',
  'QUERY_TASKS',
  'REMINDER',
  'NOTIFICATION',
  'WAIT',
  'CHECK_STATUS',
  'CONDITION',
  'END',
] as const;


export const WorkflowNodeTypeSchema = z.enum(WORKFLOW_NODE_TYPES);
export type WorkflowNodeType = z.infer<typeof WorkflowNodeTypeSchema>;

export const TaskRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('NODE'), nodeId: z.string() }),
  z.object({ kind: z.literal('QUERY'), query: z.string(), expect: z.string().optional() }),
  z.object({ kind: z.literal('ID'), id: z.string() }),
]);
export type TaskRef = z.infer<typeof TaskRefSchema>;

// Condition grammar: expr := { op: 'eq'|'neq'|'gt'|'lt'|'in', left: Var, right: Literal | Var } | { all: expr[] } | { any: expr[] } | { not: expr }
export const ConditionVarSchema = z.object({
  var: z.enum(['task.status', 'task.priority', 'task.dueAt', 'task.exists', 'now']),
});
export type ConditionVar = z.infer<typeof ConditionVarSchema>;

export type ConditionExpr =
  | { op: 'eq' | 'neq' | 'gt' | 'lt' | 'in'; left: ConditionVar; right?: unknown }
  | { all: ConditionExpr[] }
  | { any: ConditionExpr[] }
  | { not: ConditionExpr };

export const ConditionExprSchema: z.ZodType<ConditionExpr> = z.lazy(() =>
  z.union([
    z.object({
      op: z.enum(['eq', 'neq', 'gt', 'lt', 'in']),
      left: ConditionVarSchema,
      right: z.unknown(),
    }),
    z.object({ all: z.array(ConditionExprSchema) }),
    z.object({ any: z.array(ConditionExprSchema) }),
    z.object({ not: ConditionExprSchema }),
  ])
);

// Node parameter schemas
export const CreateTaskNodeParamsSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  category: z.enum(TASK_CATEGORIES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueAt: z.string().nullable().optional(),
  isAllDay: z.boolean().optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  personName: z.string().optional(),
  location: z.string().optional(),
  recurrenceRule: z.string().optional(),
  reminderOffsetMinutes: z.number().int().optional(),
});
export type CreateTaskNodeParams = z.infer<typeof CreateTaskNodeParamsSchema>;

export const UpdateTaskNodeParamsSchema = z.object({
  taskRef: TaskRefSchema,
  patch: z.object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    category: z.enum(TASK_CATEGORIES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    dueAt: z.string().nullable().optional(),
    isAllDay: z.boolean().optional(),
    estimatedMinutes: z.number().int().nullable().optional(),
    recurrenceRule: z.string().nullable().optional(),
    restoreDeleted: z.boolean().optional(),
  }),
});
export type UpdateTaskNodeParams = z.infer<typeof UpdateTaskNodeParamsSchema>;

export const CompleteTaskNodeParamsSchema = z.object({
  taskRef: TaskRefSchema,
});
export type CompleteTaskNodeParams = z.infer<typeof CompleteTaskNodeParamsSchema>;

export const DeleteTaskNodeParamsSchema = z.object({
  taskRef: TaskRefSchema.optional(),
  filter: CommandFiltersSchema.optional(),
  scope: CommandScopeSchema.optional(),
  expectedCount: z.number().int().nonnegative().optional(),
});
export type DeleteTaskNodeParams = z.infer<typeof DeleteTaskNodeParamsSchema>;

export const RestoreTaskNodeParamsSchema = z.object({
  taskRef: TaskRefSchema,
});
export type RestoreTaskNodeParams = z.infer<typeof RestoreTaskNodeParamsSchema>;

export const QueryTasksNodeParamsSchema = z.object({
  filter: CommandFiltersSchema,
  limit: z.number().int().positive().max(100).default(50),
});
export type QueryTasksNodeParams = z.infer<typeof QueryTasksNodeParamsSchema>;

export const EndNodeParamsSchema = z.object({
  outcome: z.string().optional(),
});
export type EndNodeParams = z.infer<typeof EndNodeParamsSchema>;

export const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  type: WorkflowNodeTypeSchema,
  label: z.string().optional(),
  params: z.record(z.unknown()).optional(),
});
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

export const WorkflowEdgeSchema = z.object({
  id: z.string().optional(),
  from: z.string().min(1),
  to: z.string().min(1),
  branch: z.enum(['true', 'false']).optional(),
});
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;

export const WorkflowDefinitionSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  name: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(WorkflowNodeSchema).min(2),
  edges: z.array(WorkflowEdgeSchema),
});
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
