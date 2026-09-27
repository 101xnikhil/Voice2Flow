import { UpdateTaskNodeParams } from '@voice2flow/shared';
import { ActionContext, ActionResult } from './types.js';
import { Category, Priority, TaskStatus } from '@prisma/client';

export async function executeUpdateTask(
  ctx: ActionContext,
  params: UpdateTaskNodeParams
): Promise<ActionResult> {
  let taskId: string | undefined;

  if (params.taskRef.kind === 'ID') {
    taskId = params.taskRef.id;
  } else if (params.taskRef.kind === 'QUERY') {
    // If kind is QUERY, find best match task owned by user
    const existing = await ctx.prisma.task.findFirst({
      where: {
        userId: ctx.userId,
        deletedAt: null,
        title: { contains: params.taskRef.query, mode: 'insensitive' },
      },
    });
    if (existing) {
      taskId = existing.id;
    }
  }


  if (!taskId) {
    return {
      success: false,
      error: 'Task not found or inaccessible',
    };
  }

  const existingTask = await ctx.prisma.task.findFirst({
    where: { id: taskId, userId: ctx.userId },
  });

  if (!existingTask) {
    return {
      success: false,
      error: 'Task not found or inaccessible',
    };
  }

  const patch = params.patch;
  const updateData: Record<string, unknown> = {};

  if (patch.title !== undefined) updateData.title = patch.title;
  if (patch.description !== undefined) updateData.description = patch.description;
  if (patch.category !== undefined) updateData.category = patch.category as Category;
  if (patch.priority !== undefined) updateData.priority = patch.priority as Priority;
  if (patch.status !== undefined) updateData.status = patch.status as TaskStatus;
  if (patch.dueAt !== undefined) {
    updateData.dueAt = patch.dueAt ? new Date(patch.dueAt) : null;
  }
  if (patch.isAllDay !== undefined) updateData.isAllDay = patch.isAllDay;
  if (patch.estimatedMinutes !== undefined) updateData.estimatedMinutes = patch.estimatedMinutes;
  if (patch.recurrenceRule !== undefined) updateData.recurrenceRule = patch.recurrenceRule;
  if (patch.restoreDeleted) updateData.deletedAt = null;

  const updatedTask = await ctx.prisma.task.update({
    where: { id: existingTask.id },
    data: updateData,
  });

  await ctx.prisma.activityLog.create({
    data: {
      userId: ctx.userId,
      action: 'UPDATE_TASK',
      entityType: 'TASK',
      entityId: updatedTask.id,
      source: 'COMMAND',
      executionId: ctx.executionId,
      before: JSON.parse(JSON.stringify(existingTask)),
      after: JSON.parse(JSON.stringify(updatedTask)),
      ip: ctx.ip || null,
    },
  });

  return {
    success: true,
    data: updatedTask,
    summary: `Updated task "${updatedTask.title}"`,
    affectedCount: 1,
  };
}
