import { z } from 'zod';
import { tasks, conditionBuilder } from '../utils/shared';
import type { DeepPartial, Workflow, WorkflowNode } from '../types/models';
import type { SharedBlockDefinition } from '../types/shared-data';
import { workflowDraftSchema, MCP_MAX_BYTES, type WorkflowDraft } from './protocol';

const definitions: Record<string, SharedBlockDefinition> = tasks;
const unsupported = new Set(['blocks-group', 'block-package', 'note']);
const sensitive = new Set([
  'javascript-code',
  'create-element',
  'cookie',
  'proxy',
  'execute-workflow',
  'workflow-state',
  'webhook',
  'clipboard',
  'upload-file',
  'save-assets',
]);

function getDefinition(id: string) {
  if (!Object.hasOwn(definitions, id) || unsupported.has(id)) {
    throw new Error(`Unsupported block: ${id}`);
  }
  return definitions[id];
}

function inferredSchema(value: unknown): z.ZodType {
  if (Array.isArray(value)) return z.array(z.json());
  if (value === null) return z.json();
  switch (typeof value) {
    case 'string':
      return z.string();
    // Numeric engine inputs often support templating.
    case 'number':
      return z.union([z.number(), z.string()]);
    case 'boolean':
      return z.boolean();
    case 'object': {
      const shape = Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          inferredSchema(entry).optional(),
        ])
      );
      return z.object(shape).catchall(z.json());
    }
    default:
      return z.json();
  }
}

export function listMcpBlocks() {
  return Object.entries(definitions)
    .filter(([id]) => !unsupported.has(id))
    .map(([id, block]) => ({
      id,
      name: block.name,
      description: String(block.description || ''),
      category: block.category,
      inputs: block.inputs,
      outputs: block.outputs,
      requiresCarefulReview: sensitive.has(id),
    }));
}

export function getMcpBlockSchema(id: string) {
  const block = getDefinition(id);
  return {
    id,
    name: block.name,
    dataSchema: z.toJSONSchema(inferredSchema(block.data || {})),
    defaults: structuredClone(block.data || {}),
    templateFields: block.refDataKeys || [],
    inputs: block.inputs,
    outputs: block.outputs,
    outputRules:
      id === 'conditions'
        ? 'Use the IDs in data.conditions plus fallback.'
        : id === 'while-loop'
          ? 'Use output 1 for true and fallback for false.'
          : `Use numbered outputs 1 through ${block.outputs}; fallback is also permitted for block error handling.`,
    validationScope:
      'Default-derived field types and graph structure, not complete block-specific semantic validation. Nested arrays need native configuration objects. Review in the editor.',
    manualOnly: id === 'trigger',
    requiresCarefulReview: sensitive.has(id),
    ...(id === 'conditions' || id === 'while-loop'
      ? {
          conditionReference: conditionBuilder,
          conditionGroupExample: [
            {
              conditions: [
                {
                  items: [
                    {
                      category: 'value',
                      type: 'element#exists',
                      data: { selector: 'h1' },
                    },
                  ],
                },
              ],
            },
          ],
          conditionInstructions:
            id === 'conditions'
              ? 'data.conditions is an array of {id, conditions: <condition groups>}; connect a matching id output and fallback. For comparisons, items are value → compare → value. Element items use category value.'
              : 'data.conditions contains condition groups directly. Output 1 is true; fallback is false. Return the loop body to this node to re-evaluate.',
        }
      : {}),
    ...(id === 'repeat-task'
      ? {
          outputInstructions:
            'Output 2 is the repeat body; return its last node to this repeat-task node. Output 1 continues after repetition.',
        }
      : {}),
  };
}

function checkJson(value: unknown, depth = 0): void {
  if (depth > 30) throw new Error('Workflow nesting exceeds 30 levels');
  if (typeof value !== 'object' || value === null) return;
  for (const [key, item] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) {
      throw new Error(`Unsafe JSON key: ${key}`);
    }
    checkJson(item, depth + 1);
  }
}

export function validateMcpWorkflow(input: unknown): {
  workflow: WorkflowDraft;
  warnings: string[];
} {
  const serialized = JSON.stringify(input);
  if (
    !serialized ||
    new TextEncoder().encode(serialized).byteLength > MCP_MAX_BYTES / 2
  ) {
    throw new Error('Workflow exceeds 256 KiB');
  }
  checkJson(input);
  const workflow = workflowDraftSchema.parse(input);
  const ids = new Set<string>();
  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]));
  const warnings = new Set<string>([
    'Draft is disabled. Review and explicitly enable it before running. Never enable untrusted generated code.',
    'Validation covers graph structure and default-derived field types; it does not prove runtime correctness.',
  ]);
  let triggerId = '';
  for (const node of workflow.nodes) {
    if (ids.has(node.id)) throw new Error(`Duplicate node ID: ${node.id}`);
    ids.add(node.id);
    const definition = getDefinition(node.block);
    inferredSchema(definition.data || {}).parse(node.data || {});
    if (node.block === 'trigger') {
      if (triggerId) throw new Error('Exactly one manual trigger is required');
      if (node.data?.type && node.data.type !== 'manual') {
        throw new Error('Only manual triggers are allowed in AI drafts');
      }
      if (node.data?.triggers) throw new Error('Additional triggers are not allowed');
      if (node.data?.disableBlock) throw new Error('The trigger cannot be disabled');
      triggerId = node.id;
    }
    if (sensitive.has(node.block))
      warnings.add(
        `Review ${node.id}: ${node.block} can execute code or affect browser/external state when enabled.`
      );
    for (const key of Object.keys(node.data || {})) {
      if (
        !Object.hasOwn(definition.data || {}, key) &&
        !['settings', 'onError'].includes(key)
      ) {
        warnings.add(
          `${node.id}.${key}: not present in block defaults; verify it in the editor.`
        );
      }
    }
  }
  if (!triggerId) throw new Error('Exactly one manual trigger is required');
  const edges = new Set<string>();
  const adjacency = new Map<string, string[]>();
  for (const edge of workflow.edges) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target)
      throw new Error(`Dangling edge: ${edge.source} → ${edge.target}`);
    if (target.block === 'trigger')
      throw new Error('Edges cannot target the manual trigger');
    const key = `${edge.source}:${edge.output}:${edge.target}`;
    if (edges.has(key)) throw new Error(`Duplicate edge: ${key}`);
    edges.add(key);
    const count = Number(getDefinition(source.block).outputs || 0);
    if (source.block === 'conditions') {
      const conditionIds = Array.isArray(source.data?.conditions)
        ? source.data.conditions.flatMap((condition) =>
            condition &&
            typeof condition === 'object' &&
            !Array.isArray(condition) &&
            typeof condition.id === 'string'
              ? [condition.id]
              : []
          )
        : [];
      if (edge.output !== 'fallback' && !conditionIds.includes(edge.output)) {
        throw new Error(`${source.id}: output must match a condition ID or fallback`);
      }
    } else if (
      source.block === 'while-loop' &&
      !['1', 'fallback'].includes(edge.output)
    ) {
      throw new Error(`${source.id}: while-loop outputs are 1 and fallback`);
    } else if (
      edge.output !== 'fallback' &&
      !Array.from({ length: count }, (_, index) => String(index + 1)).includes(
        edge.output
      )
    ) {
      throw new Error(`${source.id}: invalid output ${edge.output}`);
    }
    const targets = adjacency.get(edge.source) || [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
  }
  const reachable = new Set<string>();
  const pending = [triggerId];
  while (pending.length) {
    const id = pending.pop();
    if (!id || reachable.has(id)) continue;
    reachable.add(id);
    pending.push(...(adjacency.get(id) || []));
  }
  for (const id of ids)
    if (!reachable.has(id)) throw new Error(`Unreachable node: ${id}`);
  if (workflow.nodes.length === 1)
    throw new Error('Add at least one action after the trigger');
  const columns = new Set<string>();
  for (const column of workflow.table || []) {
    if (columns.has(column.id)) throw new Error(`Duplicate table column: ${column.id}`);
    columns.add(column.id);
  }
  return { workflow, warnings: [...warnings] };
}

export function compileMcpWorkflow(input: unknown): {
  draft: DeepPartial<Workflow>;
  warnings: string[];
} {
  const { workflow, warnings } = validateMcpWorkflow(input);
  const nodes: WorkflowNode[] = workflow.nodes.map((node, index) => {
    const definition = getDefinition(node.block);
    return {
      id: node.id,
      label: node.block,
      type: definition.component || 'BlockBasic',
      position: { x: 80 + (index % 5) * 280, y: 120 + Math.floor(index / 5) * 180 },
      data:
        node.block === 'trigger'
          ? { ...structuredClone(tasks.trigger.data), type: 'manual' }
          : {
              ...structuredClone(definition.data || {}),
              ...structuredClone(node.data || {}),
            },
    };
  });
  return {
    warnings,
    draft: {
      name: workflow.name,
      description: `[External AI draft — review before enabling]\n${workflow.description || ''}`,
      isDisabled: true,
      globalData: JSON.stringify(workflow.globalData || {}),
      table: workflow.table || [],
      drawflow: {
        zoom: 1,
        nodes,
        edges: workflow.edges.map((edge, index) => ({
          id: `mcp-edge-${index + 1}`,
          source: edge.source,
          target: edge.target,
          type: 'custom',
          sourceHandle: `${edge.source}-output-${edge.output}`,
          targetHandle: `${edge.target}-input-1`,
        })),
      },
      settings: {
        onError: 'stop-workflow',
        saveLog: true,
        reuseLastState: false,
        restartTimes: 0,
      },
    },
  };
}
