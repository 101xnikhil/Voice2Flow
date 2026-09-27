/**
 * Workflow Expression Evaluator
 * Safely evaluates whitelist-based condition trees (no eval).
 */

import { ConditionExpr } from '@voice2flow/shared';

export interface EvaluationContext {
  task?: {
    id: string;
    status: string;
    priority: string;
    dueAt?: string | null;
    exists: boolean;
  };
  now?: Date;
}

export function evaluateCondition(expr: ConditionExpr, context: EvaluationContext): boolean {
  if ('all' in expr) {
    return expr.all.every((sub) => evaluateCondition(sub, context));
  }
  if ('any' in expr) {
    return expr.any.some((sub) => evaluateCondition(sub, context));
  }
  if ('not' in expr) {
    return !evaluateCondition(expr.not, context);
  }

  // Comparison
  const leftValue = resolveVar(expr.left.var, context);
  const rightValue = expr.right;

  switch (expr.op) {
    case 'eq':
      return leftValue === rightValue;
    case 'neq':
      return leftValue !== rightValue;
    case 'gt':
      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return leftValue > rightValue;
      }
      if (leftValue instanceof Date && typeof rightValue === 'string') {
        return leftValue.getTime() > new Date(rightValue).getTime();
      }
      return false;
    case 'lt':
      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return leftValue < rightValue;
      }
      if (leftValue instanceof Date && typeof rightValue === 'string') {
        return leftValue.getTime() < new Date(rightValue).getTime();
      }
      return false;
    case 'in':
      if (Array.isArray(rightValue)) {
        return rightValue.includes(leftValue);
      }
      return false;
    default:
      return false;
  }
}

function resolveVar(varName: string, context: EvaluationContext): unknown {
  switch (varName) {
    case 'task.status':
      return context.task?.status;
    case 'task.priority':
      return context.task?.priority;
    case 'task.dueAt':
      return context.task?.dueAt;
    case 'task.exists':
      return context.task?.exists ?? false;
    case 'now':
      return context.now || new Date();
    default:
      return undefined;
  }
}
