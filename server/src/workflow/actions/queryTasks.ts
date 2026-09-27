import { QueryTasksNodeParams } from '@voice2flow/shared';
import { ActionContext, ActionResult } from './types.js';
import { Prisma } from '@prisma/client';

export async function executeQueryTasks(
  ctx: ActionContext,
  params: QueryTasksNodeParams
): Promise<ActionResult> {
  const where: Prisma.TaskWhereInput = {
    userId: ctx.userId,
    deletedAt: null,
  };

  if (params.filter) {
    if (params.filter.status) where.status = params.filter.status;
    if (params.filter.category) where.category = params.filter.category;
    if (params.filter.priority) where.priority = params.filter.priority;
    if (params.filter.dateFrom || params.filter.dateTo) {
      where.dueAt = {};
      if (params.filter.dateFrom) where.dueAt.gte = new Date(params.filter.dateFrom);
      if (params.filter.dateTo) where.dueAt.lte = new Date(params.filter.dateTo);
    }
    if (params.filter.keywords && params.filter.keywords.length > 0) {
      where.OR = params.filter.keywords.map((kw) => ({
        title: { contains: kw, mode: 'insensitive' },
      }));
    }
  }

  const tasks = await ctx.prisma.task.findMany({
    where,
    orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    take: params.limit || 50,
  });

  return {
    success: true,
    data: tasks,
    affectedCount: tasks.length,
    summary: `Found ${tasks.length} tasks`,
  };
}
