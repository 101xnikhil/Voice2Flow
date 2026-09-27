import { prisma } from './prisma.js';
import { logger } from './logger.js';
import { Prisma } from '@prisma/client';

export interface LogActivityParams {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  source?: string;
  executionId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

export async function logActivity(
  params: LogActivityParams,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const db = tx ?? prisma;
  try {
    await db.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        source: params.source ?? 'SYSTEM',
        executionId: params.executionId,
        before: params.before ? (params.before as Prisma.InputJsonValue) : Prisma.DbNull,
        after: params.after ? (params.after as Prisma.InputJsonValue) : Prisma.DbNull,
        ip: params.ip,
      },
    });
  } catch (err) {
    // Non-blocking log recording
    logger.warn({ err, params }, 'Failed to write ActivityLog entry');
  }
}
