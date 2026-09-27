import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { CommandProcessor } from './processor.js';
import { CommandRequest, CommandConfirm, CommandResolve } from '@voice2flow/shared';

const processor = new CommandProcessor({ prisma });

export async function handleCommand(
  req: Request<unknown, unknown, CommandRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await processor.processCommand(userId, req.body, req.ip);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleConfirmCommand(
  req: Request<{ id: string }, unknown, CommandConfirm>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const executionId = req.params.id;
    const result = await processor.confirmCommand(
      userId,
      executionId,
      req.body?.overrides,
      req.ip
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleCancelCommand(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const executionId = req.params.id;
    const result = await processor.cancelCommand(userId, executionId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleResolveCommand(
  req: Request<{ id: string }, unknown, CommandResolve>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const executionId = req.params.id;
    const result = await processor.resolveClarification(
      userId,
      executionId,
      req.body?.optionId,
      req.body?.answer,
      req.ip
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
