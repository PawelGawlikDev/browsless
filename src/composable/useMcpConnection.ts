import { readonly, shallowRef } from 'vue';
import { browser } from 'wxt/browser';
import { z } from 'zod';
import { useWorkflowStore } from '@/stores/workflow';
import {
  MCP_BRIDGE_VERSION,
  MCP_DEFAULT_PORT,
  MCP_MAX_BYTES,
  pairResponseSchema,
  pollResponseSchema,
  workflowDraftSchema,
  type BridgeRequest,
} from '@/mcp/protocol';
import {
  compileMcpWorkflow,
  getMcpBlockSchema,
  listMcpBlocks,
  validateMcpWorkflow,
} from '@/mcp/workflows';

const status = shallowRef<'disconnected' | 'pairing' | 'connected'>('disconnected');
const error = shallowRef('');
const connectedPort = shallowRef(MCP_DEFAULT_PORT);
const lastDraft = shallowRef<{ id: string; name: string } | null>(null);
type Connection = { base: string; token: string; controller: AbortController };
let current: Connection | null = null;
let pairing: AbortController | null = null;
const draftTimes: number[] = [];

async function post(
  base: string,
  path: string,
  body: unknown,
  signal: AbortSignal,
  token = ''
) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Browsless-Protocol': String(MCP_BRIDGE_VERSION),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.body) throw new Error('Empty companion response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > MCP_MAX_BYTES) {
      await reader.cancel();
      throw new Error('Companion response exceeds 512 KiB');
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const result: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!response.ok) {
    const message =
      result &&
      typeof result === 'object' &&
      'error' in result &&
      typeof result.error === 'string'
        ? result.error
        : `Companion returned HTTP ${response.status}`;
    throw new Error(message);
  }
  return result;
}

async function handle(request: BridgeRequest) {
  switch (request.operation) {
    case 'list_blocks':
      z.strictObject({}).parse(request.input);
      return { protocolVersion: MCP_BRIDGE_VERSION, blocks: listMcpBlocks() };
    case 'get_block_schema': {
      const { block } = z
        .strictObject({ block: z.string().min(1).max(100) })
        .parse(request.input);
      return getMcpBlockSchema(block);
    }
    case 'validate_workflow': {
      const { workflow } = z
        .strictObject({ workflow: workflowDraftSchema })
        .parse(request.input);
      const { warnings } = validateMcpWorkflow(workflow);
      return { valid: true, warnings };
    }
    case 'create_workflow_draft': {
      const { workflow } = z
        .strictObject({ workflow: workflowDraftSchema })
        .parse(request.input);
      const { draft, warnings } = compileMcpWorkflow(workflow);
      const now = Date.now();
      while (draftTimes.length && now - draftTimes[0] > 60_000) draftTimes.shift();
      if (draftTimes.length >= 5)
        throw new Error('Draft limit reached: at most five drafts per minute');
      const store = useWorkflowStore();
      if (!store.retrieved) throw new Error('Dashboard storage is not ready');
      draftTimes.push(now);
      // No trigger registration, execution messages, updates, or permission requests.
      const inserted = await store.insert(draft);
      const saved = Object.values(inserted)[0];
      if (!saved) throw new Error('Unable to save workflow draft');
      lastDraft.value = { id: saved.id, name: saved.name };
      return {
        workflowId: saved.id,
        path: `/workflows/${saved.id}`,
        disabled: true,
        warnings,
      };
    }
  }
}

function disconnect(reason = '') {
  pairing?.abort();
  pairing = null;
  const connection = current;
  current = null;
  connection?.controller.abort();
  status.value = 'disconnected';
  error.value = reason;
  if (connection) {
    void post(
      connection.base,
      '/disconnect',
      {},
      new AbortController().signal,
      connection.token
    ).catch(() => {});
  }
}

async function poll(connection: Connection) {
  const processed = new Set<string>();
  try {
    while (current === connection && !connection.controller.signal.aborted) {
      const payload = pollResponseSchema.parse(
        await post(
          connection.base,
          '/poll',
          {},
          connection.controller.signal,
          connection.token
        )
      );
      if (current !== connection) return;
      if (payload.request) {
        const request = payload.request;
        if (processed.has(request.id))
          throw new Error('Companion replayed a request; connection revoked');
        processed.add(request.id);
        if (processed.size > 1000) {
          const first = processed.values().next().value;
          if (first) processed.delete(first);
        }
        let response: unknown;
        try {
          const result = await handle(request);
          response = { id: request.id, ok: true, result };
        } catch (failure) {
          response = {
            id: request.id,
            ok: false,
            error: (failure instanceof Error ? failure.message : 'Request failed').slice(
              0,
              4000
            ),
          };
        }
        if (current !== connection) return;
        await post(
          connection.base,
          '/respond',
          response,
          connection.controller.signal,
          connection.token
        );
      }
      await new Promise<void>((resolve) => {
        const timer = setTimeout(finish, 750);
        function finish() {
          clearTimeout(timer);
          connection.controller.signal.removeEventListener('abort', finish);
          resolve();
        }
        connection.controller.signal.addEventListener('abort', finish, { once: true });
        if (connection.controller.signal.aborted) finish();
      });
    }
  } catch (failure) {
    if (current === connection)
      disconnect(
        failure instanceof Error ? failure.message : 'Connection lost. Pair again.'
      );
  }
}

async function connect(port: number, code: string) {
  if (status.value !== 'disconnected') return;
  const controller = new AbortController();
  pairing = controller;
  error.value = '';
  status.value = 'pairing';
  try {
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      throw new Error('Port must be between 1024 and 65535');
    if (!/^[a-f0-9]{32}$/.test(code.trim()))
      throw new Error('Paste the 32-character pairing code from get_connection_info');
    const base = `http://127.0.0.1:${port}`;
    const result = pairResponseSchema.parse(
      await post(
        base,
        '/pair',
        {
          protocolVersion: MCP_BRIDGE_VERSION,
          extensionId: browser.runtime.id,
          code: code.trim(),
        },
        controller.signal
      )
    );
    if (controller.signal.aborted || pairing !== controller) return;
    const connection = { base, token: result.token, controller };
    pairing = null;
    current = connection;
    connectedPort.value = port;
    status.value = 'connected';
    void poll(connection);
  } catch (failure) {
    if (pairing === controller) {
      pairing = null;
      status.value = 'disconnected';
      error.value = failure instanceof Error ? failure.message : 'Unable to pair';
    }
  }
}

export function useMcpConnection() {
  return {
    status: readonly(status),
    error: readonly(error),
    connectedPort: readonly(connectedPort),
    lastDraft: readonly(lastDraft),
    connect,
    disconnect,
  };
}
