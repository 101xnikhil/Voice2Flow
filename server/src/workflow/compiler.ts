/**
 * Workflow Compiler
 * Deterministic compilation of single-action intents into 3-node workflows: START -> ACTION -> END.
 */

import {
  WorkflowDefinition,
  ParsedCommand,
  ResolvedDate,
  WorkflowNodeType,
} from '@voice2flow/shared';

export interface CompileOptions {
  resolvedTargetId?: string;
  expectedCount?: number;
}

export function compileIntent(
  parsed: ParsedCommand,
  resolvedDate?: ResolvedDate,
  options?: CompileOptions
): WorkflowDefinition {
  const { intent, entities } = parsed;
  const targetId = options?.resolvedTargetId;

  let actionType: WorkflowNodeType;
  let actionParams: Record<string, unknown> = {};
  let workflowName = `${intent} execution`;

  switch (intent) {
    case 'CREATE_TASK': {
      actionType = 'CREATE_TASK';
      actionParams = {
        title: entities.title || 'New Task',
        description: entities.description,
        category: entities.category,
        priority: entities.priority,
        dueAt: resolvedDate?.dueAt ?? null,
        isAllDay: resolvedDate?.isAllDay ?? false,
        recurrenceRule: resolvedDate?.rrule ?? entities.recurrence,
        personName: entities.person,
        location: entities.location,
      };
      workflowName = `Create: ${entities.title || 'New Task'}`;
      break;
    }

    case 'RESCHEDULE_TASK':
    case 'UPDATE_TASK': {
      actionType = 'UPDATE_TASK';
      const patch: Record<string, unknown> = {
        ...(entities.patch || {}),
      };
      if (entities.priority) patch.priority = entities.priority;
      if (entities.category) patch.category = entities.category;
      if (entities.title && intent === 'UPDATE_TASK') patch.title = entities.title;
      if (resolvedDate) {
        patch.dueAt = resolvedDate.dueAt ?? null;
        patch.isAllDay = resolvedDate.isAllDay;
        if (resolvedDate.rrule) patch.recurrenceRule = resolvedDate.rrule;
      }
      actionParams = {
        taskRef: targetId
          ? { kind: 'ID', id: targetId }
          : { kind: 'QUERY', query: entities.taskQuery || '' },
        patch,
      };
      workflowName = `Update: ${entities.taskQuery || entities.title || 'Task'}`;
      break;
    }

    case 'COMPLETE_TASK': {
      actionType = 'COMPLETE_TASK';
      actionParams = {
        taskRef: targetId
          ? { kind: 'ID', id: targetId }
          : { kind: 'QUERY', query: entities.taskQuery || '' },
      };
      workflowName = `Complete: ${entities.taskQuery || 'Task'}`;
      break;
    }

    case 'DELETE_TASK': {
      actionType = 'DELETE_TASK';
      if (targetId) {
        actionParams = {
          taskRef: { kind: 'ID', id: targetId },
          scope: 'SINGLE',
          expectedCount: 1,
        };
        workflowName = `Delete: ${entities.taskQuery || 'Task'}`;
      } else {
        const scope = entities.scope || (entities.taskQuery ? 'SINGLE' : 'ALL');
        actionParams = {
          scope,
          filter: entities.filters || {},
          expectedCount: options?.expectedCount ?? 0,
        };
        workflowName = scope === 'ALL' ? 'Delete all tasks' : 'Delete filtered tasks';
      }
      break;
    }

    case 'RESTORE_TASK': {
      actionType = 'RESTORE_TASK';
      actionParams = {
        taskRef: targetId
          ? { kind: 'ID', id: targetId }
          : { kind: 'QUERY', query: entities.taskQuery || '' },
      };
      workflowName = `Restore: ${entities.taskQuery || 'Task'}`;
      break;
    }

    case 'QUERY_TASKS':
    case 'LIST_TODAY_TASKS':
    case 'LIST_UPCOMING_TASKS':
    case 'SEARCH_TASKS': {
      actionType = 'QUERY_TASKS';
      actionParams = {
        filter: entities.filters || {},
        limit: 50,
      };
      workflowName = `Query tasks`;
      break;
    }

    default: {
      actionType = 'QUERY_TASKS';
      actionParams = { filter: {} };
      workflowName = 'Unknown command';
      break;
    }
  }

  return {
    schemaVersion: 1,
    name: workflowName,
    description: `Auto-compiled for command: ${workflowName}`,
    nodes: [
      { id: 'start', type: 'START', label: 'Start' },
      { id: 'action', type: actionType, label: workflowName, params: actionParams },
      { id: 'end', type: 'END', label: 'End', params: { outcome: 'Success' } },
    ],
    edges: [
      { id: 'e1', from: 'start', to: 'action' },
      { id: 'e2', from: 'action', to: 'end' },
    ],
  };
}
