import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ExtensionBridge } from '../src/bridge.ts';
import {
  compileMcpWorkflow,
  getMcpBlockSchema,
  listMcpBlocks,
  validateMcpWorkflow,
} from '../../../src/mcp/workflows.ts';
import { MCP_MAX_BYTES } from '../../../src/mcp/protocol.ts';

const origin = `chrome-extension://${'a'.repeat(32)}`;
const sample = {
  name: 'MCP smoke test',
  nodes: [
    { id: 'start', block: 'trigger', data: { type: 'manual' } },
    {
      id: 'open',
      block: 'new-tab',
      data: { url: 'https://example.com', waitTabLoaded: true },
    },
    {
      id: 'read',
      block: 'get-text',
      data: {
        selector: 'h1',
        saveData: false,
        assignVariable: true,
        variableName: 'heading',
      },
    },
  ],
  edges: [
    { source: 'start', target: 'open' },
    { source: 'open', target: 'read' },
  ],
};
const { draft } = compileMcpWorkflow(sample);
assert.equal(draft.isDisabled, true);
assert.equal(draft.drawflow.nodes[0].data.type, 'manual');
assert.deepEqual(draft.drawflow.nodes[0].data.triggers, undefined);
assert.equal(draft.drawflow.edges[0].sourceHandle, 'start-output-1');
assert.equal(draft.drawflow.edges[0].targetHandle, 'open-input-1');
assert.ok(listMcpBlocks().some((block) => block.id === 'javascript-code'));
assert.ok(!listMcpBlocks().some((block) => block.id === 'blocks-group'));
assert.equal(getMcpBlockSchema('javascript-code').requiresCarefulReview, true);
assert.equal(getMcpBlockSchema('trigger').manualOnly, true);
assert.ok(listMcpBlocks().some((block) => block.id === 'element-exists'));
assert.ok(getMcpBlockSchema('conditions').conditionReference);
const branch = await Bun.file(
  new URL('../../../examples/mcp/branching-workflow.json', import.meta.url)
).json();
const compiledBranch = compileMcpWorkflow(branch);
assert.ok(
  compiledBranch.draft.drawflow.edges.some(
    (edge) => edge.sourceHandle === 'check-output-heading-present'
  )
);
assert.throws(() =>
  compileMcpWorkflow({
    ...branch,
    edges: branch.edges.map((edge) =>
      edge.source === 'check' ? { ...edge, output: 'unknown' } : edge
    ),
  })
);
assert.throws(() => getMcpBlockSchema('__proto__'));
assert.equal(
  validateMcpWorkflow({
    ...sample,
    nodes: [
      ...sample.nodes,
      { id: 'code', block: 'javascript-code', data: { code: 'browslessNextBlock();' } },
    ],
    edges: [...sample.edges, { source: 'read', target: 'code' }],
  }).warnings.some((warning) => warning.includes('code: javascript-code')),
  true
);
for (const invalid of [
  null,
  { ...sample, nodes: [...sample.nodes, sample.nodes[1]] },
  { ...sample, nodes: sample.nodes.slice(1) },
  {
    ...sample,
    nodes: sample.nodes.map((node) =>
      node.id === 'start' ? { ...node, data: { type: 'interval' } } : node
    ),
  },
  {
    ...sample,
    nodes: sample.nodes.map((node) =>
      node.id === 'start' ? { ...node, data: { triggers: [] } } : node
    ),
  },
  {
    ...sample,
    nodes: sample.nodes.map((node) =>
      node.id === 'start' ? { ...node, data: { disableBlock: true } } : node
    ),
  },
  { ...sample, nodes: [{ id: 'start', block: 'trigger' }], edges: [] },
  {
    ...sample,
    nodes: sample.nodes.map((node) =>
      node.id === 'open' ? { ...node, block: 'unknown' } : node
    ),
  },
  {
    ...sample,
    nodes: sample.nodes.map((node) =>
      node.id === 'open' ? { ...node, data: { active: 'yes' } } : node
    ),
  },
  { ...sample, edges: [{ source: 'start', target: 'missing' }] },
  { ...sample, edges: [sample.edges[0]] },
  { ...sample, edges: [...sample.edges, sample.edges[0]] },
  { ...sample, edges: [{ source: 'open', target: 'start' }] },
  {
    ...sample,
    edges: [{ source: 'start', target: 'open', output: '9' }, sample.edges[1]],
  },
  { ...sample, globalData: JSON.parse('{"__proto__":{"polluted":true}}') },
  { ...sample, description: 'x'.repeat(5000) },
  { ...sample, globalData: { huge: 'x'.repeat(MCP_MAX_BYTES) } },
])
  assert.throws(() => compileMcpWorkflow(invalid));

const bridge = new ExtensionBridge(0);
await bridge.start();
const info = bridge.connectionInfo();
const base = `http://127.0.0.1:${info.port}`;
async function post(url, body, token = '', requestOrigin = origin, extraHeaders = {}) {
  return fetch(url, {
    method: 'POST',
    headers: {
      Origin: requestOrigin,
      'Content-Type': 'application/json',
      'X-Browsless-Protocol': '1',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
}
const pairBody = {
  protocolVersion: 1,
  extensionId: 'a'.repeat(32),
  code: info.pairingCode,
};
try {
  assert.equal(
    (await post(`${base}/pair`, pairBody, '', 'https://evil.example')).status,
    403
  );
  assert.equal((await post(`${base}/pair`, pairBody, '', '')).status, 403);
  assert.equal(
    (await post(`${base}/pair`, pairBody, '', origin, { Host: 'evil.example' })).status,
    403
  );
  assert.equal(
    (await post(`${base}/pair`, { ...pairBody, protocolVersion: 2 })).status,
    400
  );
  assert.equal(
    (await post(`${base}/pair`, { ...pairBody, code: '0'.repeat(32) })).status,
    403
  );
  const preflight = await fetch(`${base}/pair`, {
    method: 'OPTIONS',
    headers: { Origin: origin },
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  const paired = await post(`${base}/pair`, pairBody);
  assert.equal(paired.status, 200);
  const { token } = await paired.json();
  assert.equal(token.length, 64);
  assert.equal(bridge.connectionInfo().pairingCode, undefined);
  assert.equal((await post(`${base}/poll`, {}, 'wrong')).status, 401);
  assert.equal(
    (await post(`${base}/poll`, {}, token, `chrome-extension://${'b'.repeat(32)}`))
      .status,
    401
  );
  const pending = bridge.request('list_blocks', {});
  const { request } = await (await post(`${base}/poll`, {}, token)).json();
  assert.equal(request.operation, 'list_blocks');
  assert.equal((await (await post(`${base}/poll`, {}, token)).json()).request, null);
  assert.equal(
    (
      await post(
        `${base}/respond`,
        { id: crypto.randomUUID(), ok: true, result: {} },
        token
      )
    ).status,
    409
  );
  assert.equal(
    (
      await post(
        `${base}/respond`,
        { id: request.id, ok: true, result: { blocks: [] } },
        token
      )
    ).status,
    200
  );
  assert.deepEqual(await pending, { blocks: [] });
  await assert.rejects(
    () => bridge.request('list_blocks', { huge: 'x'.repeat(MCP_MAX_BYTES) }),
    /exceeds/
  );
  const disconnected = bridge.request('list_blocks', {}).catch((error) => error.message);
  assert.equal((await post(`${base}/disconnect`, {}, token)).status, 200);
  assert.equal(await disconnected, 'Extension disconnected');
  assert.equal((await post(`${base}/poll`, {}, token)).status, 401);
} finally {
  await bridge.close();
}

// Real MCP SDK client and built executable under Node, with a simulated dashboard.
const portServer = createServer();
await new Promise((resolve) => portServer.listen(0, '127.0.0.1', resolve));
const address = portServer.address();
const port = address.port;
await new Promise((resolve) => portServer.close(resolve));
const archive = process.env.BROWSLESS_MCP_ARCHIVE;
const transport = new StdioClientTransport({
  command: archive ? 'npx' : 'node',
  args: archive
    ? ['--yes', `--package=${archive}`, 'browsless-mcp']
    : [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
  env: { ...process.env, BROWSLESS_MCP_PORT: String(port) },
  stderr: 'pipe',
});
let logs = '';
transport.stderr?.on('data', (chunk) => {
  logs += chunk.toString();
});
const client = new Client({ name: 'browsless-check', version: '1.0.0' });
let stopped = false;
let worker;
const saved = [];
const decode = (result) => {
  assert.equal(result.isError, undefined, JSON.stringify(result));
  return JSON.parse(result.content[0].text);
};
try {
  await client.connect(transport);
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), [
    'create_workflow_draft',
    'get_block_schema',
    'get_connection_info',
    'list_blocks',
    'validate_workflow',
  ]);
  const unpaired = await client.callTool({ name: 'list_blocks', arguments: {} });
  assert.equal(unpaired.isError, true);
  const connection = decode(
    await client.callTool({ name: 'get_connection_info', arguments: {} })
  );
  const connectionBase = `http://127.0.0.1:${connection.port}`;
  const pair = await post(`${connectionBase}/pair`, {
    ...pairBody,
    code: connection.pairingCode,
  });
  assert.equal(pair.status, 200);
  const { token } = await pair.json();
  worker = (async () => {
    while (!stopped) {
      const response = await post(`${connectionBase}/poll`, {}, token);
      const { request } = await response.json();
      if (request) {
        let result;
        switch (request.operation) {
          case 'list_blocks':
            result = listMcpBlocks();
            break;
          case 'get_block_schema':
            result = getMcpBlockSchema(request.input.block);
            break;
          case 'validate_workflow':
            result = {
              valid: true,
              warnings: validateMcpWorkflow(request.input.workflow).warnings,
            };
            break;
          case 'create_workflow_draft': {
            const compiled = compileMcpWorkflow(request.input.workflow);
            saved.push(compiled.draft);
            result = { workflowId: 'simulated-draft', disabled: true };
            break;
          }
        }
        assert.equal(
          (
            await post(
              `${connectionBase}/respond`,
              { id: request.id, ok: true, result },
              token
            )
          ).status,
          200
        );
      }
      if (!stopped) await new Promise((resolve) => setTimeout(resolve, 25));
    }
  })();
  assert.ok(
    decode(await client.callTool({ name: 'list_blocks', arguments: {} })).length > 40
  );
  assert.equal(
    decode(
      await client.callTool({ name: 'get_block_schema', arguments: { block: 'new-tab' } })
    ).id,
    'new-tab'
  );
  assert.equal(
    decode(
      await client.callTool({
        name: 'validate_workflow',
        arguments: { workflow: sample },
      })
    ).valid,
    true
  );
  assert.equal(
    decode(
      await client.callTool({
        name: 'create_workflow_draft',
        arguments: { workflow: sample },
      })
    ).disabled,
    true
  );
  assert.equal(saved.length, 1);
  assert.equal(saved[0].isDisabled, true);
  assert.equal(saved[0].drawflow.nodes[0].data.type, 'manual');
  stopped = true;
  await worker;
  await post(`${connectionBase}/disconnect`, {}, token);
  assert.equal(
    (await client.callTool({ name: 'list_blocks', arguments: {} })).isError,
    true
  );
} finally {
  stopped = true;
  if (worker) await worker;
  await client.close();
}
assert.match(logs, /Browsless MCP ready/);
console.log(
  'MCP checks passed: graph validation/compiler, pairing/authentication, bridge round trips, and Node stdio tools. Chrome UI is not exercised.'
);
