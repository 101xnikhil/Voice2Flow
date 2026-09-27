import { PrismaClient, Prisma } from '@prisma/client';
import { Clock } from '../../lib/clock.js';

export interface ActionContext {
  prisma: Prisma.TransactionClient | PrismaClient;
  userId: string;
  executionId: string;
  nodeId: string;
  clock?: Clock;
  ip?: string;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  affectedCount?: number;
  summary?: string;
}
