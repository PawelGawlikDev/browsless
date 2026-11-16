import { z } from 'zod';

export const MCP_BRIDGE_VERSION = 1;
export const MCP_DEFAULT_PORT = 38491;
export const MCP_MAX_BYTES = 512 * 1024;
export const identifierSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const jsonData = z.record(z.string(), z.json());

/** Public authoring graph, not the extension's persistence/export format. */
export const workflowDraftSchema = z.strictObject({
  name: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  nodes: z
    .array(
      z.strictObject({
        id: identifierSchema,
        block: z.string().min(1).max(100),
        data: jsonData.optional(),
      })
    )
    .min(1)
    .max(200),
  edges: z
    .array(
      z.strictObject({
        source: identifierSchema,
        target: identifierSchema,
        output: z
          .string()
          .regex(/^[a-zA-Z0-9_-]{1,80}$/)
          .default('1'),
        input: z.literal('1').default('1'),
      })
    )
    .max(400),
  table: z
    .array(
      z.strictObject({
        id: identifierSchema,
        name: z.string().min(1).max(100),
        type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'any']),
      })
    )
    .max(50)
    .optional(),
  globalData: jsonData.optional(),
});
export type WorkflowDraft = z.infer<typeof workflowDraftSchema>;

export const bridgeRequestSchema = z.strictObject({
  id: z.string().uuid(),
  operation: z.enum([
    'list_blocks',
    'get_block_schema',
    'validate_workflow',
    'create_workflow_draft',
  ]),
  input: z.json(),
});
export type BridgeRequest = z.infer<typeof bridgeRequestSchema>;
export const bridgeResponseSchema = z.strictObject({
  id: z.string().uuid(),
  ok: z.boolean(),
  result: z.json().optional(),
  error: z.string().max(4000).optional(),
});
export type BridgeResponse = z.infer<typeof bridgeResponseSchema>;
export const pairRequestSchema = z.strictObject({
  protocolVersion: z.literal(MCP_BRIDGE_VERSION),
  extensionId: z.string().regex(/^[a-p]{32}$/),
  code: z.string().regex(/^[a-f0-9]{32}$/),
});
export const pairResponseSchema = z.strictObject({
  protocolVersion: z.literal(MCP_BRIDGE_VERSION),
  token: z.string().regex(/^[a-f0-9]{64}$/),
});
export const pollResponseSchema = z.strictObject({
  request: bridgeRequestSchema.nullable(),
});
