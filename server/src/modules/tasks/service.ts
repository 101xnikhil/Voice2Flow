import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activity.js';
import {
  CreateTaskInput,
  UpdateTaskInput,
  TaskQueryFilters,
  BulkTaskActionInput,
  TaskDTO,
} from '@voice2flow/shared';
import { Prisma, Category, Priority, TaskStatus, Source } from '@prisma/client';

function toTaskDTO(task: {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: Category;
  priority: Priority;
  status: TaskStatus;
  dueAt: Date | null;
  isAllDay: boolean;
  estimatedMinutes: number | null;
  personName: string | null;
  location: string | null;
  recurrenceRule: string | null;
  recurrenceParentId: string | null;
  completedAt: Date | null;
  deletedAt: Date | null;
  source: Source;
  executionId: string | null;
  originKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TaskDTO {
  return {
    id: task.id,
    userId: task.userId,
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    status: task.status,
    dueAt: task.dueAt?.toISOString() || null,
    isAllDay: task.isAllDay,
    estimatedMinutes: task.estimatedMinutes,
    personName: task.personName,
    location: task.location,
    recurrenceRule: task.recurrenceRule,
    recurrenceParentId: task.recurrenceParentId,
    completedAt: task.completedAt?.toISOString() || null,
    deletedAt: task.deletedAt?.toISOString() || null,
    source: task.source,
    executionId: task.executionId,
    originKey: task.originKey,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export class TaskService {
  static async listTasks(
    userId: string,
    filters: TaskQueryFilters
  ): Promise<{ tasks: TaskDTO[]; nextCursor: string | null; totalCount: number }> {
    const where: Prisma.TaskWhereInput = {
      userId,
    };

    // Tab handling
    if (filters.tab === 'trash' || filters.deleted === 'only' || filters.deleted === true || filters.deleted === 'true') {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    if (filters.tab === 'active') {
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    } else if (filters.tab === 'completed') {
      where.status = 'COMPLETED';
    } else if (filters.tab === 'overdue') {
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
      where.dueAt = { lt: new Date() };
    }

    // Explicit status filter (overrides tab status if specified)
    if (filters.status && filters.tab !== 'trash') {
      where.status = filters.status as TaskStatus;
    }

    if (filters.category) {
      where.category = filters.category as Category;
    }

    if (filters.priority) {
      where.priority = filters.priority as Priority;
    }

    if (filters.dueFrom || filters.dueTo) {
      where.dueAt = {
        ...(where.dueAt && typeof where.dueAt === 'object' ? where.dueAt : {}),
        ...(filters.dueFrom ? { gte: new Date(filters.dueFrom) } : {}),
        ...(filters.dueTo ? { lte: new Date(filters.dueTo) } : {}),
      };
    }

    if (filters.q && filters.q.trim().length > 0) {
      const q = filters.q.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { personName: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Sort order
    let orderBy: Prisma.TaskOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters.sort) {
      const [field, direction] = filters.sort.split(':');
      const dir = direction === 'asc' ? 'asc' : 'desc';
      if (field === 'dueAt') {
        orderBy = { dueAt: dir };
      } else if (field === 'priority') {
        orderBy = { priority: dir };
      } else if (field === 'createdAt') {
        orderBy = { createdAt: dir };
      } else if (field === 'title') {
        orderBy = { title: dir };
      }
    }

    const limit = filters.limit || 20;

    // Total count for current filter
    const totalCount = await prisma.task.count({ where });

    // Cursor pagination
    const queryArgs: Prisma.TaskFindManyArgs = {
      where,
      orderBy,
      take: limit + 1,
    };

    if (filters.cursor) {
      queryArgs.cursor = { id: filters.cursor };
      queryArgs.skip = 1;
    }

    const items = await prisma.task.findMany(queryArgs);

    let nextCursor: string | null = null;
    if (items.length > limit) {
      items.pop();
      nextCursor = items[items.length - 1]?.id || null;
    }

    return {
      tasks: items.map(toTaskDTO),
      nextCursor,
      totalCount,
    };
  }

  static async createTask(userId: string, input: CreateTaskInput): Promise<TaskDTO> {
    const task = await prisma.task.create({
      data: {
        userId,
        title: input.title,
        description: input.description || null,
        category: (input.category as Category) || Category.OTHER,
        priority: (input.priority as Priority) || Priority.MEDIUM,
        status: 'PENDING',
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        isAllDay: input.isAllDay ?? false,
        estimatedMinutes: input.estimatedMinutes || null,
        personName: input.personName || null,
        location: input.location || null,
        recurrenceRule: input.recurrenceRule || null,
        source: 'MANUAL',
      },
    });

    await logActivity({
      userId,
      action: 'TASK_CREATED',
      entityType: 'Task',
      entityId: task.id,
      after: { title: task.title, priority: task.priority, category: task.category },
    });

    return toTaskDTO(task);
  }

  static async getTaskById(userId: string, taskId: string): Promise<TaskDTO> {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    });

    if (!task) {
      throw AppError.notFound('Task not found');
    }

    return toTaskDTO(task);
  }

  static async updateTask(
    userId: string,
    taskId: string,
    input: UpdateTaskInput
  ): Promise<TaskDTO> {
    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!existing) {
      throw AppError.notFound('Task not found');
    }

    const updateData: Prisma.TaskUpdateInput = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.category !== undefined) updateData.category = input.category as Category;
    if (input.priority !== undefined) updateData.priority = input.priority as Priority;
    if (input.dueAt !== undefined) {
      updateData.dueAt = input.dueAt ? new Date(input.dueAt) : null;
    }
    if (input.isAllDay !== undefined) updateData.isAllDay = input.isAllDay;
    if (input.estimatedMinutes !== undefined) updateData.estimatedMinutes = input.estimatedMinutes;
    if (input.personName !== undefined) updateData.personName = input.personName;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.recurrenceRule !== undefined) updateData.recurrenceRule = input.recurrenceRule;

    if (input.status !== undefined) {
      updateData.status = input.status as TaskStatus;
      if (input.status === 'COMPLETED' && !existing.completedAt) {
        updateData.completedAt = new Date();
      } else if (input.status !== 'COMPLETED' && existing.completedAt) {
        updateData.completedAt = null;
      }
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    await logActivity({
      userId,
      action: 'TASK_UPDATED',
      entityType: 'Task',
      entityId: taskId,
      before: { title: existing.title, status: existing.status },
      after: { title: updated.title, status: updated.status },
    });

    return toTaskDTO(updated);
  }

  static async softDeleteTask(userId: string, taskId: string): Promise<TaskDTO> {
    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!existing) {
      throw AppError.notFound('Task not found');
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    await logActivity({
      userId,
      action: 'TASK_DELETED',
      entityType: 'Task',
      entityId: taskId,
    });

    return toTaskDTO(updated);
  }

  static async completeTask(userId: string, taskId: string): Promise<TaskDTO> {
    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!existing) {
      throw AppError.notFound('Task not found');
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    await logActivity({
      userId,
      action: 'TASK_COMPLETED',
      entityType: 'Task',
      entityId: taskId,
    });

    return toTaskDTO(updated);
  }

  static async reopenTask(userId: string, taskId: string): Promise<TaskDTO> {
    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!existing) {
      throw AppError.notFound('Task not found');
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'PENDING',
        completedAt: null,
      },
    });

    await logActivity({
      userId,
      action: 'TASK_REOPENED',
      entityType: 'Task',
      entityId: taskId,
    });

    return toTaskDTO(updated);
  }

  static async restoreTask(userId: string, taskId: string): Promise<TaskDTO> {
    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!existing) {
      throw AppError.notFound('Task not found');
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: null },
    });

    await logActivity({
      userId,
      action: 'TASK_RESTORED',
      entityType: 'Task',
      entityId: taskId,
    });

    return toTaskDTO(updated);
  }

  static async permanentDeleteTask(userId: string, taskId: string): Promise<void> {
    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!existing) {
      throw AppError.notFound('Task not found');
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    await logActivity({
      userId,
      action: 'TASK_PERMANENTLY_DELETED',
      entityType: 'Task',
      entityId: taskId,
    });
  }

  static async bulkAction(
    userId: string,
    input: BulkTaskActionInput
  ): Promise<{ count: number; action: string }> {
    const { action, taskIds } = input;

    // Filter to ensure all target tasks belong to this user
    const userTasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId,
      },
      select: { id: true },
    });

    const validIds = userTasks.map((t) => t.id);
    if (validIds.length === 0) {
      return { count: 0, action };
    }

    let count = 0;

    switch (action) {
      case 'complete': {
        const res = await prisma.task.updateMany({
          where: { id: { in: validIds } },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        count = res.count;
        break;
      }
      case 'reopen': {
        const res = await prisma.task.updateMany({
          where: { id: { in: validIds } },
          data: { status: 'PENDING', completedAt: null },
        });
        count = res.count;
        break;
      }
      case 'delete': {
        const res = await prisma.task.updateMany({
          where: { id: { in: validIds } },
          data: { deletedAt: new Date() },
        });
        count = res.count;
        break;
      }
      case 'restore': {
        const res = await prisma.task.updateMany({
          where: { id: { in: validIds } },
          data: { deletedAt: null },
        });
        count = res.count;
        break;
      }
      case 'permanentDelete': {
        const res = await prisma.task.deleteMany({
          where: { id: { in: validIds } },
        });
        count = res.count;
        break;
      }
      case 'updatePriority': {
        if (!input.priority) {
          throw AppError.badRequest('Priority is required for updatePriority action');
        }
        const res = await prisma.task.updateMany({
          where: { id: { in: validIds } },
          data: { priority: input.priority as Priority },
        });
        count = res.count;
        break;
      }
      case 'updateCategory': {
        if (!input.category) {
          throw AppError.badRequest('Category is required for updateCategory action');
        }
        const res = await prisma.task.updateMany({
          where: { id: { in: validIds } },
          data: { category: input.category as Category },
        });
        count = res.count;
        break;
      }
      default:
        throw AppError.badRequest(`Unsupported bulk action: ${action}`);
    }

    await logActivity({
      userId,
      action: `TASK_BULK_${action.toUpperCase()}`,
      entityType: 'Task',
      entityId: validIds[0] || 'bulk',
      after: { count, taskIds: validIds },
    });

    return { count, action };
  }
}
