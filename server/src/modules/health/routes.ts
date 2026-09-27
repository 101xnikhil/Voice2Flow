import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { HealthResponse } from '@voice2flow/shared';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  let dbStatus: 'connected' | 'disconnected' | 'error' = 'connected';
  let dbError: string | undefined;
  let latencyMs = 0;

  try {
    await prisma.$queryRaw`SELECT 1`;
    latencyMs = Date.now() - startTime;
  } catch (err) {
    dbStatus = 'error';
    dbError = err instanceof Error ? err.message : 'Database query failed';
  }

  const aiMode =
    env.AI_PROVIDER !== 'rules' &&
    ((env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) ||
      (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) ||
      (env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY))
      ? ('Smart mode' as const)
      : ('Basic mode' as const);

  const payload: HealthResponse = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      latencyMs: dbStatus === 'connected' ? latencyMs : undefined,
      error: dbError,
    },
    scheduler: {
      enabled: env.SCHEDULER_ENABLED,
      status: env.SCHEDULER_ENABLED ? 'running' : 'disabled',
    },
    ai: {
      mode: aiMode,
      provider: env.AI_PROVIDER,
    },
    version: '0.1.0',
  };

  const httpStatus = dbStatus === 'connected' ? 200 : 503;
  res.status(httpStatus).json(payload);
});
