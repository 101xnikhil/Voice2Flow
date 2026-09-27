/**
 * Workflow Engine
 * Sequential execution of workflow nodes with one DB transaction per node,
 * originKey idempotency, and ExecutionStep logging.
 */

import { PrismaClient, ExecutionStatus, StepKind, StepStatus } from '@prisma/client';
import { WorkflowDefinition, WorkflowNodeType, ConditionExpr } from '@voice2flow/shared';
import { executeAction, ActionResult } from './actions/index.js';
import { evaluateCondition, EvaluationContext } from './expressions.js';

import { Clock, defaultClock } from '../lib/clock.js';
import { AppError } from '../lib/errors.js';

export interface WorkflowEngineOptions {
  prisma: PrismaClient;
  clock?: Clock;
  ip?: string;
}

export interface EngineRunResult {
  executionId: string;
  status: ExecutionStatus;
  summary: string;
  result?: unknown;
  error?: unknown;
  stepsCount: number;
}

export class WorkflowEngine {
  private prisma: PrismaClient;
  private clock: Clock;
  private ip?: string;

  constructor(options: WorkflowEngineOptions) {
    this.prisma = options.prisma;
    this.clock = options.clock || defaultClock;
    this.ip = options.ip;
  }

  async run(executionId: string): Promise<EngineRunResult> {
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        steps: { orderBy: { seq: 'asc' } },
        workflow: true,
      },
    });

    if (!execution) {
      throw AppError.notFound(`Workflow execution ${executionId} not found`);
    }

    const definition = (execution.definitionSnapshot ||
      execution.workflow?.definition) as unknown as WorkflowDefinition;

    if (!definition || !definition.nodes) {
      throw AppError.badRequest('Workflow definition missing from execution');
    }

    const nodesById = new Map(definition.nodes.map((n) => [n.id, n]));
    const edgesByFrom = new Map<string, typeof definition.edges>();

    for (const edge of definition.edges) {
      const existing = edgesByFrom.get(edge.from) || [];
      existing.push(edge);
      edgesByFrom.set(edge.from, existing);
    }

    // Determine starting node
    let currentNodeId =
      execution.currentNodeId || definition.nodes.find((n) => n.type === 'START')?.id;

    if (!currentNodeId || !nodesById.has(currentNodeId)) {
      throw AppError.badRequest('No valid start node found in workflow definition');
    }

    // Ensure status is RUNNING
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.RUNNING,
        startedAt: execution.startedAt || this.clock.now(),
      },
    });

    let currentSeq = execution.steps.length;
    let finalSummary = 'Workflow executed successfully';
    let lastActionResult: ActionResult | undefined;
    let executionStatus: ExecutionStatus = ExecutionStatus.RUNNING;
    let executionError: unknown = null;
    let loopCount = 0;
    const maxNodes = 50;

    // Execution loop
    while (currentNodeId && loopCount < maxNodes) {
      loopCount++;
      const node = nodesById.get(currentNodeId);
      if (!node) break;

      const startTime = this.clock.now();

      if (node.type === 'START') {
        currentSeq++;
        await this.prisma.executionStep.create({
          data: {
            executionId,
            seq: currentSeq,
            kind: StepKind.NODE,
            name: 'START',
            nodeId: node.id,
            status: StepStatus.SUCCESS,
            message: 'Workflow started',
            startedAt: startTime,
            finishedAt: this.clock.now(),
            durationMs: Math.max(0, this.clock.now().getTime() - startTime.getTime()),
          },
        });

        const nextEdge = (edgesByFrom.get(node.id) || [])[0];
        currentNodeId = nextEdge ? nextEdge.to : undefined;
        continue;
      }

      if (node.type === 'END') {
        currentSeq++;
        await this.prisma.executionStep.create({
          data: {
            executionId,
            seq: currentSeq,
            kind: StepKind.NODE,
            name: 'END',
            nodeId: node.id,
            status: StepStatus.SUCCESS,
            message: 'Workflow completed',
            startedAt: startTime,
            finishedAt: this.clock.now(),
            durationMs: Math.max(0, this.clock.now().getTime() - startTime.getTime()),
          },
        });

        executionStatus = ExecutionStatus.SUCCEEDED;
        break;
      }

      if (node.type === 'WAIT') {
        const until = node.params?.until as { mode: string; at?: string; minutes?: number } | undefined;
        let resumeAt: Date;
        if (until?.mode === 'DURATION' && until.minutes) {
          resumeAt = new Date(this.clock.now().getTime() + until.minutes * 60 * 1000);
        } else if (until?.at) {
          resumeAt = new Date(until.at);
        } else {
          resumeAt = new Date(this.clock.now().getTime() + 60 * 1000);
        }

        currentSeq++;
        await this.prisma.executionStep.create({
          data: {
            executionId,
            seq: currentSeq,
            kind: StepKind.NODE,
            name: 'WAIT',
            nodeId: node.id,
            status: StepStatus.WAITING,
            message: `Paused until ${resumeAt.toISOString()}`,
            startedAt: startTime,
            finishedAt: this.clock.now(),
            durationMs: Math.max(0, this.clock.now().getTime() - startTime.getTime()),
          },
        });

        // Determine next node for resume
        const nextEdge = (edgesByFrom.get(node.id) || [])[0];
        await this.prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: ExecutionStatus.WAITING,
            resumeAt,
            currentNodeId: nextEdge?.to || null,
          },
        });

        executionStatus = ExecutionStatus.WAITING;
        finalSummary = `Workflow paused until ${resumeAt.toISOString()}`;
        break;
      }

      if (node.type === 'CONDITION') {
        const context = (execution.context || {}) as { task?: EvaluationContext['task'] };
        const expr = (node.params as { expr?: ConditionExpr } | undefined)?.expr;
        const branchResult = expr
          ? evaluateCondition(expr, {
              task: context.task,
              now: this.clock.now(),
            })
          : false;

        currentSeq++;
        await this.prisma.executionStep.create({
          data: {
            executionId,
            seq: currentSeq,
            kind: StepKind.NODE,
            name: 'CONDITION',
            nodeId: node.id,
            status: StepStatus.SUCCESS,
            message: `Condition evaluated to ${branchResult}`,
            detail: { result: branchResult },
            startedAt: startTime,
            finishedAt: this.clock.now(),
            durationMs: Math.max(0, this.clock.now().getTime() - startTime.getTime()),
          },
        });

        const branchEdges = edgesByFrom.get(node.id) || [];
        const chosenEdge = branchEdges.find(
          (e) => e.branch === (branchResult ? 'true' : 'false')
        );
        currentNodeId = chosenEdge ? chosenEdge.to : undefined;
        continue;
      }

      // Action node execution inside a transaction
      try {
        const stepSeq = ++currentSeq;
        const result = await this.prisma.$transaction(async (tx) => {
          const actionCtx = {
            prisma: tx,
            userId: execution.userId,
            executionId: execution.id,
            nodeId: node.id,
            clock: this.clock,
            ip: this.ip,
          };

          const actResult = await executeAction(
            node.type as WorkflowNodeType,
            actionCtx,
            (node.params || {}) as Record<string, unknown>
          );

          if (!actResult.success) {
            throw new Error(actResult.error || 'Action execution failed');
          }

          // Record successful node execution step
          await tx.executionStep.create({
            data: {
              executionId,
              seq: stepSeq,
              kind: StepKind.NODE,
              name: node.type,
              nodeId: node.id,
              status: StepStatus.SUCCESS,
              message: actResult.summary || `${node.type} completed successfully`,
              detail: actResult.data ? JSON.parse(JSON.stringify(actResult.data)) : undefined,
              startedAt: startTime,
              finishedAt: this.clock.now(),
              durationMs: Math.max(0, this.clock.now().getTime() - startTime.getTime()),
            },
          });

          return actResult;
        });

        lastActionResult = result;
        if (result.summary) {
          finalSummary = result.summary;
        }

        // Advance to next node
        const nextEdge = (edgesByFrom.get(node.id) || [])[0];
        currentNodeId = nextEdge ? nextEdge.to : undefined;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown execution failure';
        currentSeq++;

        await this.prisma.executionStep.create({
          data: {
            executionId,
            seq: currentSeq,
            kind: StepKind.NODE,
            name: node.type,
            nodeId: node.id,
            status: StepStatus.FAILED,
            message: errorMessage,
            startedAt: startTime,
            finishedAt: this.clock.now(),
            durationMs: Math.max(0, this.clock.now().getTime() - startTime.getTime()),
          },
        });

        executionStatus = ExecutionStatus.FAILED;
        executionError = { code: 'NODE_FAILED', message: errorMessage, nodeId: node.id };
        finalSummary = `Workflow failed at ${node.type}: ${errorMessage}`;
        break;
      }
    }

    // Finalize execution record if terminal
    if (executionStatus === ExecutionStatus.SUCCEEDED || executionStatus === ExecutionStatus.FAILED) {
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: executionStatus,
          finishedAt: this.clock.now(),
          error: executionError ? JSON.parse(JSON.stringify(executionError)) : undefined,
          currentNodeId: null,
        },
      });
    }

    return {
      executionId,
      status: executionStatus,
      summary: finalSummary,
      result: lastActionResult?.data,
      error: executionError,
      stepsCount: currentSeq,
    };
  }
}
