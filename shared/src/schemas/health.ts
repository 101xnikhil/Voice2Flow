import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  timestamp: z.string(),
  uptime: z.number(),
  database: z.object({
    status: z.enum(['connected', 'disconnected', 'error']),
    latencyMs: z.number().optional(),
    error: z.string().optional(),
  }),
  scheduler: z.object({
    enabled: z.boolean(),
    status: z.string(),
  }),
  ai: z.object({
    mode: z.enum(['Smart mode', 'Basic mode']),
    provider: z.string(),
  }),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
