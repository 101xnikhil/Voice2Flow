import { RestoreTaskNodeParams } from '@voice2flow/shared';
import { ActionContext, ActionResult } from './types.js';

export async function executeRestoreTask(
  ctx: ActionContext,
  params: RestoreTaskNodeParams
): Promise<ActionResult> {
  let taskId: string | undefined;

  if (params.taskRef.kind === 'ID') {
    taskId = params.taskRef.id;
  } else if (params.taskRef.kind === 'QUERY') {
    const match = await ctx.prisma.task.findFirst({
      where: {
        userId: ctx.userId,
        deletedAt: { not: null },
        title: { contains: params.taskRef.query, mode: 'insensitive' },
      },
    });
    if (match) taskId = match.id;
  }


  if (!taskId) {
    return { success: false, error: 'Task not found or inaccessible in trash' };
  }

  const task = await ctx.prisma.task.findFirst({
    where: { id: taskId, userId: ctx.userId },
  });

  if (!task) {
    return { success: false, error: 'Task not found or inaccessible' };
  }

  const updated = await ctx.prisma.task.update({
    where: { id: task.id },
    data: { deletedAt: null },
  });

  await ctx.prisma.activityLog.create({
    data: {
      userId: ctx.userId,
      action: 'RESTORE_TASK',
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
    summary: `Restored task "${task.title}"`,
    affectedCount: 1,
  };
}
