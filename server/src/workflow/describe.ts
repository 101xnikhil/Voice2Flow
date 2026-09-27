/**
 * Workflow Describe
 * Deterministically turns a WorkflowDefinition into human-readable numbered steps.
 */

import { WorkflowDefinition } from '@voice2flow/shared';

export function describeWorkflow(def: WorkflowDefinition): string[] {
  const steps: string[] = [];

  for (const node of def.nodes) {
    const params = (node.params || {}) as Record<string, unknown>;

    switch (node.type) {
      case 'START':
        steps.push('Start workflow');
        break;

      case 'CREATE_TASK': {
        const title = (params.title as string) || 'New task';
        const priority = params.priority ? ` [${params.priority}]` : '';
        const due = params.dueAt ? ` (due ${params.dueAt})` : '';
        steps.push(`Create task "${title}"${priority}${due}`);
        break;
      }

      case 'UPDATE_TASK': {
        const patch = (params.patch || {}) as Record<string, unknown>;
        const changes: string[] = [];
        if (patch.title) changes.push(`title: "${patch.title}"`);
        if (patch.priority) changes.push(`priority: ${patch.priority}`);
        if (patch.dueAt) changes.push(`due: ${patch.dueAt}`);
        if (patch.status) changes.push(`status: ${patch.status}`);
        const details = changes.length > 0 ? ` with ${changes.join(', ')}` : '';
        steps.push(`Update task${details}`);
        break;
      }

      case 'COMPLETE_TASK':
        steps.push('Mark task as completed');
        break;

      case 'DELETE_TASK': {
        const count = params.expectedCount as number | undefined;
        if (count !== undefined && count > 1) {
          steps.push(`Delete ${count} tasks`);
        } else {
          steps.push('Delete task');
        }
        break;
      }

      case 'RESTORE_TASK':
        steps.push('Restore deleted task');
        break;

      case 'QUERY_TASKS':
        steps.push('Search matching tasks');
        break;

      case 'WAIT': {
        const until = params.until as { mode: string; at?: string; minutes?: number } | undefined;
        if (until?.mode === 'DURATION') {
          steps.push(`Wait for ${until.minutes} minutes`);
        } else if (until?.at) {
          steps.push(`Wait until ${until.at}`);
        } else {
          steps.push('Wait');
        }
        break;
      }

      case 'REMINDER': {
        const msg = (params.message as string) || 'reminder';
        steps.push(`Send reminder: "${msg}"`);
        break;
      }

      case 'NOTIFICATION': {
        const title = (params.title as string) || 'notification';
        steps.push(`Send notification: "${title}"`);
        break;
      }

      case 'CHECK_STATUS':
        steps.push('Check task status');
        break;

      case 'CONDITION':
        steps.push('Check condition and branch');
        break;

      case 'END':
        steps.push('End workflow');
        break;

      default:
        steps.push(`Execute ${node.type}`);
        break;
    }
  }

  return steps;
}
