/**
 * Command Processor
 * Implements the 10-step command pipeline defined in Spec §6.1.
 */

import { PrismaClient, ExecutionStatus, StepKind, StepStatus } from '@prisma/client';
import {
  ParsedCommand,
  CommandResponse,
  CommandRequest,
  WorkflowDefinition,
} from '@voice2flow/shared';

import { resilientAIService } from '../../ai/ResilientAIService.js';
import { resolveTask, TaskCandidate } from '../../nlp/taskResolver.js';
import { calculateFinalConfidence, getConfidenceDecision } from '../../nlp/confidence.js';
import { compileIntent } from '../../workflow/compiler.js';
import { describeWorkflow } from '../../workflow/describe.js';
import { WorkflowEngine } from '../../workflow/engine.js';
import { Clock, defaultClock } from '../../lib/clock.js';
import { AppError } from '../../lib/errors.js';

export interface CommandProcessorOptions {
  prisma: PrismaClient;
  clock?: Clock;
}

export class CommandProcessor {
  private prisma: PrismaClient;
  private clock: Clock;

  constructor(options: CommandProcessorOptions) {
    this.prisma = options.prisma;
    this.clock = options.clock || defaultClock;
  }

  async processCommand(
    userId: string,
    request: CommandRequest,
    ip?: string
  ): Promise<CommandResponse> {
    // 1. Sanitize & Length Check
    // eslint-disable-next-line no-control-regex
    const rawText = request.text.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    if (rawText.length === 0) {

      throw AppError.badRequest('Command text cannot be empty');
    }
    if (rawText.length > 1000) {
      throw AppError.badRequest('Command text exceeds maximum length of 1000 characters');
    }

    // Load User and Settings
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const timezone = user.timezone || 'Asia/Kolkata';
    const weekStartsOn = user.settings?.weekStartsOn ?? 1;
    const autoExecute = user.settings?.autoExecute ?? true;
    const autoExecuteThreshold = user.settings?.autoExecuteThreshold ?? 0.85;

    // Create WorkflowExecution row
    const execution = await this.prisma.workflowExecution.create({
      data: {
        userId,
        origin: 'COMMAND',
        inputMode: request.inputMode,
        rawInput: rawText,
        language: 'en',
        parser: resilientAIService.getParserMode(),
        status: ExecutionStatus.RUNNING,
        startedAt: this.clock.now(),
      },
    });

    let currentSeq = 0;

    // Stage 1: Input Received / Speech Recognised
    currentSeq++;
    await this.prisma.executionStep.create({
      data: {
        executionId: execution.id,
        seq: currentSeq,
        kind: StepKind.PIPELINE,
        name: request.inputMode === 'VOICE' ? 'Speech recognised' : 'Input received',
        status: StepStatus.SUCCESS,
        message: `Received command: "${rawText}"`,
        detail: {
          inputMode: request.inputMode,
          sttConfidence: request.sttConfidence,
        },
        startedAt: this.clock.now(),
        finishedAt: this.clock.now(),
        durationMs: 1,
      },
    });

    // 2. PARSE
    let parsed: ParsedCommand;
    try {
      parsed = await resilientAIService.parseCommand({
        text: rawText,
        now: this.clock.now(),
        timezone,
        weekStartsOn,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Parser error';
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: ExecutionStatus.FAILED, finishedAt: this.clock.now() },
      });
      return {
        status: 'FAILED',
        executionId: execution.id,
        error: { code: 'PARSE_FAILED', message: msg },
      };
    }

    // Stage 2: Intent Detected
    currentSeq++;
    await this.prisma.executionStep.create({
      data: {
        executionId: execution.id,
        seq: currentSeq,
        kind: StepKind.PIPELINE,
        name: 'Intent detected',
        status: StepStatus.SUCCESS,
        message: `Detected intent: ${parsed.intent}`,
        detail: {
          intent: parsed.intent,
          confidence: parsed.confidence,
          language: parsed.language,
        },
        startedAt: this.clock.now(),
        finishedAt: this.clock.now(),
        durationMs: 1,
      },
    });

    // Stage 3: Entities Extracted & Normalized
    currentSeq++;
    const entityKeys = Object.entries(parsed.entities)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k]) => k);
    await this.prisma.executionStep.create({
      data: {
        executionId: execution.id,
        seq: currentSeq,
        kind: StepKind.PIPELINE,
        name: 'Entities extracted',
        status: StepStatus.SUCCESS,
        message: entityKeys.length > 0 ? `Extracted entities: ${entityKeys.join(', ')}` : 'No entities extracted',
        detail: JSON.parse(
          JSON.stringify({
            entities: parsed.entities,
            resolved: parsed.resolved,
          })
        ),

        startedAt: this.clock.now(),
        finishedAt: this.clock.now(),
        durationMs: 1,
      },
    });

    // 4. RESOLVE (TaskResolver)
    let targetTask: TaskCandidate | undefined;
    let candidateCount = 0;
    let isFuzzyMatch = false;

    const requiresTarget = [
      'COMPLETE_TASK',
      'DELETE_TASK',
      'UPDATE_TASK',
      'RESCHEDULE_TASK',
      'RESTORE_TASK',
    ].includes(parsed.intent);

    if (requiresTarget) {
      if (parsed.entities.scope === 'ALL') {
        candidateCount = await this.prisma.task.count({
          where: { userId, deletedAt: null },
        });
      } else if (parsed.entities.taskQuery) {
        const resolution = await resolveTask(
          this.prisma,
          userId,
          parsed.entities.taskQuery,
          parsed.intent
        );

        if (resolution.status === 'AMBIGUOUS') {
          // Ambiguous match -> Needs clarification
          const candidates = (resolution.candidates || []).map((c) => ({
            id: c.id,
            label: c.title,
          }));

          currentSeq++;
          await this.prisma.executionStep.create({
            data: {
              executionId: execution.id,
              seq: currentSeq,
              kind: StepKind.PIPELINE,
              name: 'Context resolved',
              status: StepStatus.WAITING,
              message: `Multiple matching tasks found for "${parsed.entities.taskQuery}"`,
              detail: { candidates },
              startedAt: this.clock.now(),
              finishedAt: this.clock.now(),
              durationMs: 1,
            },
          });

          await this.prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: ExecutionStatus.AWAITING_CLARIFICATION,
              parsed: JSON.parse(JSON.stringify(parsed)),
              confidence: parsed.confidence,
              expiresAt: new Date(this.clock.now().getTime() + 10 * 60 * 1000),
            },
          });

          return {
            status: 'NEEDS_CLARIFICATION',
            executionId: execution.id,
            question: 'I found multiple matching tasks. Which one do you mean?',
            options: candidates,
            expectedSlot: 'taskChoice',
          };
        }

        if (resolution.status === 'NONE') {
          currentSeq++;
          await this.prisma.executionStep.create({
            data: {
              executionId: execution.id,
              seq: currentSeq,
              kind: StepKind.PIPELINE,
              name: 'Context resolved',
              status: StepStatus.FAILED,
              message: `No task found matching "${parsed.entities.taskQuery}"`,
              startedAt: this.clock.now(),
              finishedAt: this.clock.now(),
              durationMs: 1,
            },
          });

          await this.prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: ExecutionStatus.FAILED,
              finishedAt: this.clock.now(),
            },
          });

          return {
            status: 'FAILED',
            executionId: execution.id,
            error: {
              code: 'TASK_NOT_FOUND',
              message: `I couldn't find a task matching "${parsed.entities.taskQuery}".`,
            },
          };
        }

        if (resolution.status === 'SINGLE' && resolution.task) {
          targetTask = resolution.task;
          candidateCount = 1;
          isFuzzyMatch = resolution.isFuzzy || false;
        }
      }
    }

    // Stage 4: Validation Passed
    currentSeq++;
    await this.prisma.executionStep.create({
      data: {
        executionId: execution.id,
        seq: currentSeq,
        kind: StepKind.PIPELINE,
        name: 'Validation passed',
        status: StepStatus.SUCCESS,
        message: 'Semantic validation and target resolution passed',
        startedAt: this.clock.now(),
        finishedAt: this.clock.now(),
        durationMs: 1,
      },
    });

    // 5. DECIDE (clarify | confirm | execute)
    const isDestructive = parsed.intent === 'DELETE_TASK';
    const finalConfidence = calculateFinalConfidence({
      modelConfidence: parsed.confidence,
      isVoice: request.inputMode === 'VOICE',
      sttConfidence: request.sttConfidence,
      assumptions: parsed.resolved?.assumptions,
      isFuzzyTaskMatch: isFuzzyMatch,
    });

    const decision = getConfidenceDecision({
      intent: parsed.intent,
      finalConfidence,
      autoExecuteThreshold,
      autoExecute,
      isDestructive,
      isMultiStep: parsed.isMultiStep,
      isAmbiguousTaskMatch: false,
    });

    // 6. COMPILE Workflow
    const workflowDef = compileIntent(parsed, parsed.resolved, {
      resolvedTargetId: targetTask?.id,
      expectedCount: candidateCount,
    });
    const stepsDescription = describeWorkflow(workflowDef);

    // If confirmation is required (destructive or confidence < auto threshold or auto-execute off)
    if (decision === 'ALWAYS_CONFIRM' || decision === 'PREVIEW_CONFIRM') {
      const expiresAt = new Date(this.clock.now().getTime() + 10 * 60 * 1000); // 10 minutes

      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.AWAITING_CONFIRMATION,
          definitionSnapshot: JSON.parse(JSON.stringify(workflowDef)),
          confidence: finalConfidence,
          parsed: JSON.parse(JSON.stringify(parsed)),
          expiresAt,
        },
      });

      return {
        status: 'NEEDS_CONFIRMATION',
        executionId: execution.id,
        preview: {
          action: parsed.intent,
          count: candidateCount,
          targetTitle: targetTask?.title,
          steps: stepsDescription,
          entities: parsed.entities,
        },
        confidence: finalConfidence,
        assumptions: parsed.resolved?.assumptions || [],
        expiresAt: expiresAt.toISOString(),
      };
    }

    // 7. EXECUTE IMMEDIATELY
    await this.prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        definitionSnapshot: JSON.parse(JSON.stringify(workflowDef)),
        confidence: finalConfidence,
        parsed: JSON.parse(JSON.stringify(parsed)),
      },
    });

    const engine = new WorkflowEngine({
      prisma: this.prisma,
      clock: this.clock,
      ip,
    });

    const runResult = await engine.run(execution.id);

    return {
      status: 'EXECUTED',
      executionId: execution.id,
      summary: runResult.summary,
      result: runResult.result,
    };
  }

  async confirmCommand(
    userId: string,
    executionId: string,
    overrides?: Record<string, unknown>,
    ip?: string
  ): Promise<CommandResponse> {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: { id: executionId, userId },
    });

    if (!execution) {
      throw AppError.notFound(`Command execution ${executionId} not found`);
    }

    // Idempotency: if already executed, return current state
    if (execution.status === ExecutionStatus.SUCCEEDED) {
      return {
        status: 'EXECUTED',
        executionId: execution.id,
        summary: 'Command already executed successfully',
        result: execution.context || {},
      };
    }

    // Check expiry
    if (execution.expiresAt && execution.expiresAt.getTime() < this.clock.now().getTime()) {
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: ExecutionStatus.EXPIRED },
      });
      throw AppError.conflict('Preview has expired. Please run the command again.');
    }

    if (execution.status !== ExecutionStatus.AWAITING_CONFIRMATION) {
      throw AppError.badRequest(`Cannot confirm command in status ${execution.status}`);
    }

    const definition = execution.definitionSnapshot as unknown as WorkflowDefinition;
    if (!definition || !definition.nodes) {
      throw AppError.badRequest('Workflow definition missing from preview');
    }

    // STALE PREVIEW CHECK (409 Conflict)
    const actionNode = definition.nodes.find(
      (n) => n.type !== 'START' && n.type !== 'END'
    );


    if (actionNode && actionNode.type === 'DELETE_TASK') {
      const nodeParams = (actionNode.params || {}) as Record<string, unknown>;
      const scope = nodeParams.scope;
      const expectedCount = nodeParams.expectedCount;

      if (scope === 'ALL') {
        const freshCount = await this.prisma.task.count({
          where: { userId, deletedAt: null },
        });

        if (freshCount !== expectedCount) {
          // Stale preview! Update definition with fresh count and return 409 Conflict
          nodeParams.expectedCount = freshCount;
          actionNode.params = nodeParams;
          await this.prisma.workflowExecution.update({
            where: { id: execution.id },
            data: { definitionSnapshot: JSON.parse(JSON.stringify(definition)) },
          });

          throw new AppError(
            'STALE_PREVIEW',
            409,
            `Task count has changed from ${expectedCount} to ${freshCount}. Please confirm the updated count.`,
            {
              freshCount,
              executionId: execution.id,
              preview: {
                action: 'DELETE_TASK',
                count: freshCount,
                steps: describeWorkflow(definition),
              },
            }
          );
        }
      } else {
        const taskRef = nodeParams.taskRef as { kind: string; id?: string } | undefined;
        if (taskRef?.kind === 'ID' && taskRef.id) {
          const targetId = taskRef.id;
          const exists = await this.prisma.task.findFirst({
            where: { id: targetId, userId, deletedAt: null },
          });
          if (!exists) {
            throw new AppError(
              'STALE_PREVIEW',
              409,
              'The target task was already deleted or no longer exists.'
            );
          }
        }
      }
    }

    // Apply overrides if provided
    if (overrides && actionNode) {
      actionNode.params = {
        ...(actionNode.params || {}),
        ...overrides,
      };
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { definitionSnapshot: JSON.parse(JSON.stringify(definition)) },
      });
    }


    // Execute via WorkflowEngine
    const engine = new WorkflowEngine({
      prisma: this.prisma,
      clock: this.clock,
      ip,
    });

    const runResult = await engine.run(execution.id);

    return {
      status: 'EXECUTED',
      executionId: execution.id,
      summary: runResult.summary,
      result: runResult.result,
    };
  }

  async cancelCommand(userId: string, executionId: string): Promise<{ status: string; executionId: string }> {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: { id: executionId, userId },
    });

    if (!execution) {
      throw AppError.notFound(`Execution ${executionId} not found`);
    }

    await this.prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: ExecutionStatus.CANCELLED,
        finishedAt: this.clock.now(),
      },
    });

    return {
      status: 'CANCELLED',
      executionId: execution.id,
    };
  }

  async resolveClarification(
    userId: string,
    executionId: string,
    chosenOptionId?: string,
    answer?: string,
    ip?: string
  ): Promise<CommandResponse> {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: { id: executionId, userId },
    });

    if (!execution) {
      throw AppError.notFound(`Execution ${executionId} not found`);
    }

    if (execution.status !== ExecutionStatus.AWAITING_CLARIFICATION) {
      throw AppError.badRequest(`Cannot resolve command in status ${execution.status}`);
    }

    const parsed = execution.parsed as unknown as ParsedCommand;
    if (!parsed) {
      throw AppError.badRequest('Execution state missing parsed command data');
    }

    let targetTaskId = chosenOptionId;

    // If answer is textual (e.g. "first", "2nd", or task title), resolve it
    if (!targetTaskId && answer) {
      const match = await resolveTask(this.prisma, userId, answer, parsed.intent);
      if (match.status === 'SINGLE' && match.task) {
        targetTaskId = match.task.id;
      }
    }

    if (!targetTaskId) {
      throw AppError.badRequest('Please select one of the provided options');
    }

    const task = await this.prisma.task.findFirst({
      where: { id: targetTaskId, userId },
    });

    if (!task) {
      throw AppError.notFound('Selected task not found');
    }

    // Compile workflow with the resolved task
    const workflowDef = compileIntent(parsed, parsed.resolved, {
      resolvedTargetId: task.id,
      expectedCount: 1,
    });

    const isDestructive = parsed.intent === 'DELETE_TASK';

    if (isDestructive) {
      const expiresAt = new Date(this.clock.now().getTime() + 10 * 60 * 1000);
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.AWAITING_CONFIRMATION,
          definitionSnapshot: JSON.parse(JSON.stringify(workflowDef)),
          expiresAt,
        },
      });

      return {
        status: 'NEEDS_CONFIRMATION',
        executionId: execution.id,
        preview: {
          action: parsed.intent,
          count: 1,
          targetTitle: task.title,
          steps: describeWorkflow(workflowDef),
          entities: parsed.entities,
        },
        confidence: execution.confidence || 0.8,
        assumptions: parsed.resolved?.assumptions || [],
        expiresAt: expiresAt.toISOString(),
      };
    }

    // Execute immediately
    await this.prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        definitionSnapshot: JSON.parse(JSON.stringify(workflowDef)),
        status: ExecutionStatus.RUNNING,
      },
    });

    const engine = new WorkflowEngine({
      prisma: this.prisma,
      clock: this.clock,
      ip,
    });

    const runResult = await engine.run(execution.id);

    return {
      status: 'EXECUTED',
      executionId: execution.id,
      summary: runResult.summary,
      result: runResult.result,
    };
  }
}
