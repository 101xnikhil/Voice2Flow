import { z } from 'zod';

export const UpdateUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100).optional(),
  timezone: z.string().min(1).optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const UpdateUserSettingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  sttLocale: z.enum(['en-IN', 'en-US', 'hi-IN']).optional(),
  autoExecute: z.boolean().optional(),
  autoExecuteThreshold: z.number().min(0.75).max(0.95).optional(),
  autoExecuteWorkflows: z.boolean().optional(),
  showConfidence: z.boolean().optional(),
  defaultReminderOffsetMin: z.number().int().min(0).max(10080).optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
  notifyBrowser: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
});

export type UpdateUserSettingsInput = z.infer<typeof UpdateUserSettingsSchema>;
