import { CreateTaskNodeParams } from '@voice2flow/shared';
import { ActionContext, ActionResult } from './types.js';
import { Category, Priority, Source } from '@prisma/client';

export async function executeCreateTask(
  ctx: ActionContext,
  params: CreateTaskNodeParams
): Promise<ActionResult> {
  const originKey = `${ctx.executionId}:${ctx.nodeId}`;

  // Idempotency check: see if task with originKey already exists
  const existing = await ctx.prisma.task.findUnique({
    where: { originKey },
  });

  if (existing) {
    return {
      success: true,
      data: existing,
      summary: `Created task "${existing.title}"`,
      affectedCount: 1,
    };
  }

  const dueAtDate = params.dueAt ? new Date(params.dueAt) : null;

  const task = await ctx.prisma.task.create({
    data: {
      userId: ctx.userId,
      title: params.title,
      description: params.description || null,
      category: (params.category as Category) || Category.OTHER,
      priority: (params.priority as Priority) || Priority.MEDIUM,
      dueAt: dueAtDate,
      isAllDay: params.isAllDay ?? false,
      estimatedMinutes: params.estimatedMinutes || null,
      personName: params.personName || null,
      location: params.location || null,
      recurrenceRule: params.recurrenceRule || null,
      source: Source.TEXT,
      executionId: ctx.executionId,
      originKey,
    },
  });


  // Audit log
  await ctx.prisma.activityLog.create({
    data: {
      userId: ctx.userId,
      action: 'CREATE_TASK',
      entityType: 'TASK',
      entityId: task.id,
      source: 'COMMAND',
      executionId: ctx.executionId,
      after: JSON.parse(JSON.stringify(task)),
      ip: ctx.ip || null,
    },
  });

  return {
    success: true,
    data: task,
    summary: `Created task "${task.title}"`,
    affectedCount: 1,
  };
}
