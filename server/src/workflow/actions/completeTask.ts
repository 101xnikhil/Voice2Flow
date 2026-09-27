import { CompleteTaskNodeParams } from '@voice2flow/shared';
import { ActionContext, ActionResult } from './types.js';
import { TaskStatus, Source } from '@prisma/client';
import { rrulestr } from 'rrule';

export async function executeCompleteTask(
  ctx: ActionContext,
  params: CompleteTaskNodeParams
): Promise<ActionResult> {
  const now = ctx.clock ? ctx.clock.now() : new Date();

  let taskId: string | undefined;
  if (params.taskRef.kind === 'ID') {
    taskId = params.taskRef.id;
  } else if (params.taskRef.kind === 'QUERY') {
    const match = await ctx.prisma.task.findFirst({
      where: {
        userId: ctx.userId,
        deletedAt: null,
        status: { not: TaskStatus.COMPLETED },
        title: { contains: params.taskRef.query, mode: 'insensitive' },
      },
    });
    if (match) taskId = match.id;
  }

  if (!taskId) {
    return { success: false, error: 'Task not found or inaccessible' };
  }

  const task = await ctx.prisma.task.findFirst({
    where: { id: taskId, userId: ctx.userId },
  });

  if (!task) {
    return { success: false, error: 'Task not found or inaccessible' };
  }

  const updated = await ctx.prisma.task.update({
    where: { id: task.id },
    data: {
      status: TaskStatus.COMPLETED,
      completedAt: now,
    },
  });

  // Check if recurring task needs next occurrence spawned (Spec §7.8)
  if (task.recurrenceRule && task.dueAt) {
    try {
      const rule = rrulestr(task.recurrenceRule);
      const nextDate = rule.after(task.dueAt);
      if (nextDate) {
        await ctx.prisma.task.create({
          data: {
            userId: ctx.userId,
            title: task.title,
            description: task.description,
            category: task.category,
            priority: task.priority,
            status: TaskStatus.PENDING,
            dueAt: nextDate,
            isAllDay: task.isAllDay,
            estimatedMinutes: task.estimatedMinutes,
            personName: task.personName,
            location: task.location,
            recurrenceRule: task.recurrenceRule,
            recurrenceParentId: task.recurrenceParentId || task.id,
            source: Source.TEXT,
          },
        });
      }
    } catch {
      // If rule fails parsing, do not fail completion
    }
  }


  await ctx.prisma.activityLog.create({
    data: {
      userId: ctx.userId,
      action: 'COMPLETE_TASK',
      entityType: 'TASK',
      entityId: task.id,
      source: 'COMMAND',
      executionId: ctx.executionId,
      before: JSON.parse(JSON.stringify(task)),
      after: JSON.parse(JSON.stringify(updated)),
      ip: ctx.ip || null,
    },
  });

  return {
    success: true,
    data: updated,
    summary: `Completed task "${task.title}"`,
    affectedCount: 1,
  };
}
