import { z } from 'zod';
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from '../constants.js';

export const CreateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().max(5000).optional().nullable(),
  category: z.enum(TASK_CATEGORIES).optional().default('OTHER'),
  priority: z.enum(TASK_PRIORITIES).optional().default('MEDIUM'),
  dueAt: z.string().datetime({ offset: true }).optional().nullable(),
  isAllDay: z.boolean().optional().default(false),
  estimatedMinutes: z.number().int().min(1).max(10080).optional().nullable(),
  personName: z.string().trim().max(100).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  recurrenceRule: z.string().trim().max(200).optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(TASK_STATUSES).optional(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const TaskQueryFiltersSchema = z.object({
  status: z.string().optional(),
  category: z.enum(TASK_CATEGORIES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  q: z.string().optional(),
  tab: z.enum(['active', 'completed', 'overdue', 'trash']).optional(),
  deleted: z.union([z.boolean(), z.enum(['true', 'false', 'only'])]).optional(),
  sort: z
    .enum(['dueAt:asc', 'dueAt:desc', 'priority:desc', 'createdAt:desc', 'title:asc'])
    .optional()
    .default('createdAt:desc'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type TaskQueryFilters = z.infer<typeof TaskQueryFiltersSchema>;

export const BulkTaskActionSchema = z.object({
  action: z.enum(['complete', 'reopen', 'delete', 'restore', 'permanentDelete', 'updatePriority', 'updateCategory']),
  taskIds: z.array(z.string().uuid()).min(1, 'Select at least one task').max(100, 'Maximum 100 tasks at a time'),
  priority: z.enum(TASK_PRIORITIES).optional(),
  category: z.enum(TASK_CATEGORIES).optional(),
});

export type BulkTaskActionInput = z.infer<typeof BulkTaskActionSchema>;
