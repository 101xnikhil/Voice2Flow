/**
 * Workflow Validator
 * Validates WorkflowDefinition against DAG rules, node catalog schemas, and constraints.
 */

import { WorkflowDefinition, WorkflowNodeType } from '@voice2flow/shared';
import { NODE_CATALOG } from './nodeCatalog.js';

export interface ValidationError {
  nodeId?: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export function validateWorkflow(def: WorkflowDefinition): ValidationResult {
  const errors: ValidationError[] = [];

  // Limit check: <= 25 nodes
  if (!def.nodes || def.nodes.length === 0) {
    return {
      ok: false,
      errors: [{ code: 'NO_NODES', message: 'Workflow must contain at least two nodes (START and END).' }],
    };
  }

  if (def.nodes.length > 25) {
    errors.push({
      code: 'MAX_NODES_EXCEEDED',
      message: `Workflow exceeds the maximum of 25 nodes (found ${def.nodes.length}).`,
    });
  }

  const nodeMap = new Map<string, (typeof def.nodes)[number]>();
  let startCount = 0;
  let endCount = 0;

  for (const node of def.nodes) {
    if (nodeMap.has(node.id)) {
      errors.push({
        nodeId: node.id,
        code: 'DUPLICATE_NODE_ID',
        message: `Duplicate node ID: ${node.id}`,
      });
    }
    nodeMap.set(node.id, node);

    if (node.type === 'START') {
      startCount++;
    } else if (node.type === 'END') {
      endCount++;
    }

    // Check unknown node type
    const catalogEntry = NODE_CATALOG[node.type as WorkflowNodeType];
    if (!catalogEntry) {
      errors.push({
        nodeId: node.id,
        code: 'UNKNOWN_NODE_TYPE',
        message: `Unknown node type: ${node.type}`,
      });
      continue;
    }

    // Validate params against schema
    if (catalogEntry.paramsSchema) {
      const parseResult = catalogEntry.paramsSchema.safeParse(node.params || {});
      if (!parseResult.success) {
        for (const issue of parseResult.error.issues) {
          errors.push({
            nodeId: node.id,
            code: 'INVALID_NODE_PARAMS',
            message: `Parameter '${issue.path.join('.')}': ${issue.message}`,
          });
        }
      }
    }
  }

  // Exactly one START
  if (startCount !== 1) {
    errors.push({
      code: 'INVALID_START_COUNT',
      message: `Workflow must have exactly one START node (found ${startCount}).`,
    });
  }

  // At least one END
  if (endCount < 1) {
    errors.push({
      code: 'NO_END_NODE',
      message: 'Workflow must have at least one END node.',
    });
  }

  // Edge validations
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const node of def.nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const edge of def.edges || []) {
    if (!nodeMap.has(edge.from)) {
      errors.push({
        code: 'INVALID_EDGE_FROM',
        message: `Edge source '${edge.from}' does not exist in nodes.`,
      });
    }
    if (!nodeMap.has(edge.to)) {
      errors.push({
        code: 'INVALID_EDGE_TO',
        message: `Edge target '${edge.to}' does not exist in nodes.`,
      });
    }

    if (nodeMap.has(edge.from) && nodeMap.has(edge.to)) {
      outgoing.get(edge.from)?.push(edge.to);
      incoming.get(edge.to)?.push(edge.from);
    }
  }

  // Node branch / connection constraints
  for (const node of def.nodes) {
    const outs = outgoing.get(node.id) || [];
    const ins = incoming.get(node.id) || [];

    if (node.type === 'START') {
      if (ins.length > 0) {
        errors.push({
          nodeId: node.id,
          code: 'START_HAS_INCOMING',
          message: 'START node cannot have incoming edges.',
        });
      }
      if (outs.length !== 1) {
        errors.push({
          nodeId: node.id,
          code: 'START_OUTGOING_COUNT',
          message: `START node must have exactly 1 outgoing edge (found ${outs.length}).`,
        });
      }
    } else if (node.type === 'END') {
      if (outs.length > 0) {
        errors.push({
          nodeId: node.id,
          code: 'END_HAS_OUTGOING',
          message: 'END node cannot have outgoing edges.',
        });
      }
      if (ins.length === 0) {
        errors.push({
          nodeId: node.id,
          code: 'END_NO_INCOMING',
          message: 'END node must have at least 1 incoming edge.',
        });
      }
    } else if (node.type === 'CONDITION') {
      // Condition nodes must have exactly 2 outgoing edges (branch 'true' and 'false')
      const conditionEdges = (def.edges || []).filter((e) => e.from === node.id);
      const hasTrue = conditionEdges.some((e) => e.branch === 'true');
      const hasFalse = conditionEdges.some((e) => e.branch === 'false');
      if (conditionEdges.length !== 2 || !hasTrue || !hasFalse) {
        errors.push({
          nodeId: node.id,
          code: 'INVALID_CONDITION_BRANCHES',
          message: 'CONDITION node must have exactly one "true" and one "false" outgoing branch.',
        });
      }
    } else {
      // Normal action nodes: max 1 outgoing edge, at least 1 incoming edge
      if (outs.length > 1) {
        errors.push({
          nodeId: node.id,
          code: 'MULTIPLE_OUTGOING_EDGES',
          message: `Node '${node.id}' of type ${node.type} cannot have more than 1 outgoing edge.`,
        });
      }
      if (outs.length === 0) {
        errors.push({
          nodeId: node.id,
          code: 'DANGLING_NODE',
          message: `Node '${node.id}' has no outgoing edges and is not an END node.`,
        });
      }
      if (ins.length === 0) {
        errors.push({
          nodeId: node.id,
          code: 'UNREACHABLE_NODE',
          message: `Node '${node.id}' has no incoming edges and cannot be reached from START.`,
        });
      }
    }
  }

  // Reachability from START
  const startNode = def.nodes.find((n) => n.type === 'START');
  if (startNode) {
    const visited = new Set<string>();
    const queue = [startNode.id];
    visited.add(startNode.id);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const next of outgoing.get(curr) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }

    for (const node of def.nodes) {
      if (!visited.has(node.id)) {
        errors.push({
          nodeId: node.id,
          code: 'UNREACHABLE_NODE',
          message: `Node '${node.id}' is unreachable from the START node.`,
        });
      }
    }
  }

  // Cycle detection (DFS)
  const visitedState = new Map<string, 'VISITING' | 'VISITED'>();
  let hasCycle = false;

  function dfs(nodeId: string): boolean {
    visitedState.set(nodeId, 'VISITING');
    for (const neighbor of outgoing.get(nodeId) || []) {
      const state = visitedState.get(neighbor);
      if (state === 'VISITING') {
        return true; // Cycle detected
      }
      if (!state && dfs(neighbor)) {
        return true;
      }
    }
    visitedState.set(nodeId, 'VISITED');
    return false;
  }

  for (const node of def.nodes) {
    if (!visitedState.has(node.id)) {
      if (dfs(node.id)) {
        hasCycle = true;
        break;
      }
    }
  }

  if (hasCycle) {
    errors.push({
      code: 'CYCLE_DETECTED',
      message: 'Workflows must be directed acyclic graphs (DAGs). Cycles are not allowed.',
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
