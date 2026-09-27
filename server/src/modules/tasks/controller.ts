import { Request, Response, NextFunction } from 'express';
import { TaskService } from './service.js';

export class TaskController {
  static async listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TaskService.listTasks(req.user!.id, req.query as any);
      res.json({
        success: true,
        data: result.tasks,
        meta: {
          nextCursor: result.nextCursor,
          totalCount: result.totalCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.createTask(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.getTaskById(req.user!.id, req.params.id);
      res.json({
        success: true,
        data: task,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.updateTask(req.user!.id, req.params.id, req.body);
      res.json({
        success: true,
        data: task,
      });
    } catch (err) {
      next(err);
    }
  }

  static async softDeleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.softDeleteTask(req.user!.id, req.params.id);
      res.json({
        success: true,
        data: task,
      });
    } catch (err) {
      next(err);
    }
  }

  static async completeTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.completeTask(req.user!.id, req.params.id);
      res.json({
        success: true,
        data: task,
      });
    } catch (err) {
      next(err);
    }
  }

  static async reopenTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.reopenTask(req.user!.id, req.params.id);
      res.json({
        success: true,
        data: task,
      });
    } catch (err) {
      next(err);
    }
  }

  static async restoreTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.restoreTask(req.user!.id, req.params.id);
      res.json({
        success: true,
        data: task,
      });
    } catch (err) {
      next(err);
    }
  }

  static async permanentDeleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await TaskService.permanentDeleteTask(req.user!.id, req.params.id);
      res.json({
        success: true,
        data: { message: 'Task permanently deleted' },
      });
    } catch (err) {
      next(err);
    }
  }

  static async bulkAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TaskService.bulkAction(req.user!.id, req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
