import { DeleteTaskNodeParams } from '@voice2flow/shared';
import { ActionContext, ActionResult } from './types.js';
import { Prisma } from '@prisma/client';

export async function executeDeleteTask(
  ctx: ActionContext,
  params: DeleteTaskNodeParams
): Promise<ActionResult> {
  const now = ctx.clock ? ctx.clock.now() : new Date();

  // Case 1: Single task by ref
  if (params.taskRef) {
    let taskId: string | undefined;
    if (params.taskRef.kind === 'ID') {
      taskId = params.taskRef.id;
    } else if (params.taskRef.kind === 'QUERY') {
      const match = await ctx.prisma.task.findFirst({
        where: {
          userId: ctx.userId,
          deletedAt: null,
          title: { contains: params.taskRef.query, mode: 'insensitive' },
        },
      });
      if (match) taskId = match.id;
    }


    if (!taskId) {
      return { success: false, error: 'Task not found or inaccessible' };
    }

    const task = await ctx.prisma.task.findFirst({
      where: { id: taskId, userId: ctx.userId, deletedAt: null },
    });

    if (!task) {
      return { success: false, error: 'Task not found or already deleted' };
    }

    const updated = await ctx.prisma.task.update({
      where: { id: task.id },
      data: { deletedAt: now },
    });

    await ctx.prisma.activityLog.create({
      data: {
        userId: ctx.userId,
        action: 'DELETE_TASK',
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
      affectedCount: 1,
      summary: `Deleted task "${task.title}"`,
    };
  }

  // Case 2: Bulk delete (scope: ALL or FILTERED)
  const where: Prisma.TaskWhereInput = {
    userId: ctx.userId,
    deletedAt: null,
  };

  if (params.filter) {
    if (params.filter.status) where.status = params.filter.status;
    if (params.filter.category) where.category = params.filter.category;
    if (params.filter.priority) where.priority = params.filter.priority;
  }

  const tasksToDelete = await ctx.prisma.task.findMany({
    where,
    select: { id: true, title: true },
  });

  if (tasksToDelete.length === 0) {
    return {
      success: true,
      affectedCount: 0,
      summary: 'No tasks to delete',
    };
  }

  const result = await ctx.prisma.task.updateMany({
    where,
    data: { deletedAt: now },
  });

  await ctx.prisma.activityLog.create({
    data: {
      userId: ctx.userId,
      action: 'BULK_DELETE',
      entityType: 'TASK',
      entityId: ctx.executionId,
      source: 'COMMAND',
      executionId: ctx.executionId,
      before: { count: tasksToDelete.length, ids: tasksToDelete.map((t) => t.id) },
      after: { count: result.count, deletedAt: now.toISOString() },
      ip: ctx.ip || null,
    },
  });

  return {
    success: true,
    affectedCount: result.count,
    summary: `Deleted ${result.count} tasks`,
  };
}
