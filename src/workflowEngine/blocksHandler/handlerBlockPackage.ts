import type {
  WorkflowHandlerBlock,
  WorkflowHandlerOptions,
  WorkflowHandlerContext,
  WorkflowBlockResult,
} from '@/types/workflow-engine';

type BlockPackageInput = {
  id: string;
  blockId: string;
};

type BlockPackageOutput = {
  id: string;
  handleId: string;
};

type BlockPackageBlockData = {
  inputs: BlockPackageInput[];
  outputs: BlockPackageOutput[];
  data: {
    nodes: Array<{ id: string } & Record<string, unknown>>;
    edges: Array<{
      sourceHandle?: string;
      target?: string;
      targetHandle?: string;
    }>;
  };
};

export default async function (
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<BlockPackageBlockData>,
  { targetHandle: prevTarget, prevBlockData }: WorkflowHandlerOptions
) {
  if (!this.engine.packagesCache[id]) {
    this.engine.packagesCache[id] = { extracted: false, nodes: {} };
  }

  const pkgCache = this.engine.packagesCache[id];

  const [, targetId] = (prevTarget ?? '').split('input-');
  const addBlockPrefix = (itemId: string) => `${id}__${itemId}`;
  const hasCache = targetId ? pkgCache.nodes[targetId] : undefined;
  if (hasCache)
    return {
      data: prevBlockData,
      nextBlockId: [{ id: hasCache }],
    };

  const input = data.inputs.find((item) => item.id === targetId);
  if (!input) {
    throw new Error('Input not found');
  }
  const block = data.data.nodes.find((node) => node.id === input.blockId);
  if (!block) {
    throw new Error(`Can't find block for this input`);
  }
  pkgCache.nodes[targetId] = addBlockPrefix(block.id);

  const connections: Record<string, Map<string, Record<string, unknown>>> = {};

  if (!pkgCache.extracted) {
    const outputsMap = new Set<string>();

    data.inputs.forEach((item) => {
      connections[addBlockPrefix(item.id)] = new Map([
        [
          item.id,
          {
            id: addBlockPrefix(item.blockId),
            targetId: `${addBlockPrefix(block.id)}-input-1`,
          },
        ],
      ]);
    });
    data.outputs.forEach((output) => {
      const connection = this.engine.connectionsMap[`${id}-output-${output.id}`];
      if (!connection) return;

      connections[addBlockPrefix(output.handleId)] = new Map(connection);
      outputsMap.add(output.handleId);
    });

    data.data.nodes.forEach((node) => {
      const newNodeId = addBlockPrefix(node.id);
      this.engine.blocks[newNodeId] = { ...node, id: newNodeId };
    });

    data.data.edges.forEach(({ sourceHandle, target, targetHandle }) => {
      if (outputsMap.has(sourceHandle as string)) return;

      const nodeSourceHandle = addBlockPrefix(sourceHandle as string);
      if (!connections[nodeSourceHandle]) connections[nodeSourceHandle] = new Map();

      const connectionId = addBlockPrefix(target as string);
      connections[nodeSourceHandle].set(connectionId, {
        id: connectionId,
        sourceHandle: nodeSourceHandle,
        targetHandle: addBlockPrefix(targetHandle as string),
      });
    });

    pkgCache.extracted = true;
  }

  Object.assign(this.engine.connectionsMap, connections);

  return {
    data: prevBlockData,
    nextBlockId: [{ id: addBlockPrefix(block.id) }],
  } satisfies WorkflowBlockResult;
}
