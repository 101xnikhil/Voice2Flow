import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { ExecutionStatus, Prisma } from '@prisma/client';

export class ExecutionsController {
  static async listExecutions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const status = req.query.status as ExecutionStatus | undefined;
      const origin = req.query.origin as string | undefined;
      const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
      const cursor = req.query.cursor as string | undefined;

      const where: Prisma.WorkflowExecutionWhereInput = { userId };
      if (status) where.status = status;
      if (origin) where.origin = origin;

      const executions = await prisma.workflowExecution.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        include: {
          steps: {
            orderBy: { seq: 'asc' },
            take: 10,
          },
        },
      });

      let nextCursor: string | undefined;
      if (executions.length > limit) {
        const nextItem = executions.pop();
        nextCursor = nextItem?.id;
      }

      res.json({
        data: executions,
        meta: { nextCursor },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getExecutionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const execution = await prisma.workflowExecution.findFirst({
        where: { id, userId },
        include: {
          steps: {
            orderBy: { seq: 'asc' },
          },
          workflow: true,
        },
      });

      if (!execution) {
        throw AppError.notFound(`Execution ${id} not found`);
      }

      res.json({ data: execution });
    } catch (err) {
      next(err);
    }
  }

  static async cancelExecution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const execution = await prisma.workflowExecution.findFirst({
        where: { id, userId },
      });

      if (!execution) {
        throw AppError.notFound(`Execution ${id} not found`);
      }

      const updated = await prisma.workflowExecution.update({
        where: { id },
        data: {
          status: ExecutionStatus.CANCELLED,
          finishedAt: new Date(),
        },
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
}
