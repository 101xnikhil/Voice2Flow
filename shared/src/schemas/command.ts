import { z } from 'zod';
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from '../constants.js';

export const INTENTS = [
  'CREATE_TASK',
  'UPDATE_TASK',
  'DELETE_TASK',
  'COMPLETE_TASK',
  'RESTORE_TASK',
  'CREATE_REMINDER',
  'QUERY_TASKS',
  'CREATE_WORKFLOW',
  'RESCHEDULE_TASK',
  'LIST_TODAY_TASKS',
  'LIST_UPCOMING_TASKS',
  'SEARCH_TASKS',
  'UNKNOWN',
] as const;

export const IntentSchema = z.enum(INTENTS);
export type Intent = z.infer<typeof IntentSchema>;

export const CommandLanguageSchema = z.enum(['en', 'hi', 'hinglish']);
export type CommandLanguage = z.infer<typeof CommandLanguageSchema>;

export const CommandScopeSchema = z.enum(['SINGLE', 'FILTERED', 'ALL']);
export type CommandScope = z.infer<typeof CommandScopeSchema>;

export const CommandFiltersSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  category: z.enum(TASK_CATEGORIES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});
export type CommandFilters = z.infer<typeof CommandFiltersSchema>;

export const CommandEntitiesSchema = z
  .object({
    title: z.string().optional(),
    task: z.string().optional(), // alias accepted during normalization
    taskQuery: z.string().optional(),
    description: z.string().optional(),
    category: z.enum(TASK_CATEGORIES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    duration: z.string().optional(),
    person: z.string().optional(),
    location: z.string().optional(),
    recurrence: z.string().optional(),
    condition: z.string().optional(),
    scope: CommandScopeSchema.optional(),
    filters: CommandFiltersSchema.optional(),
    patch: z.record(z.unknown()).optional(),
  })
  .transform((val) => {
    if (!val.title && val.task) {
      const { task, ...rest } = val;
      return { ...rest, title: task };
    }
    return val;
  });
export type CommandEntities = z.infer<typeof CommandEntitiesSchema>;

export const AmbiguitySchema = z.object({
  field: z.string(),
  reason: z.string(),
});
export type Ambiguity = z.infer<typeof AmbiguitySchema>;

export const ResolvedDateSchema = z.object({
  dueAt: z.string().nullable().optional(), // ISO UTC instant
  isAllDay: z.boolean(),
  timezone: z.string(),
  rrule: z.string().optional(),
  assumptions: z.array(z.string()),
});
export type ResolvedDate = z.infer<typeof ResolvedDateSchema>;

export const ParsedCommandSchema = z.object({
  intent: IntentSchema,
  confidence: z.number().min(0).max(1),
  language: CommandLanguageSchema,
  isMultiStep: z.boolean(),
  entities: CommandEntitiesSchema,
  ambiguities: z.array(AmbiguitySchema).default([]),
  clarificationQuestion: z.string().optional(),
  resolved: ResolvedDateSchema.optional(),
});
export type ParsedCommand = z.infer<typeof ParsedCommandSchema>;
