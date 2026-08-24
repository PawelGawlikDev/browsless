import type { DrawflowData, WorkflowNode, WorkflowEdge } from '@/types/models';
import type {
  LegacyEditorBlock,
  LegacyEditorDrawflow,
  WorkflowLike,
} from '@/types/editor';
import { parseJSON, findTriggerBlock } from './helper';
const getFlowData = (workflow: WorkflowLike) =>
  typeof workflow.drawflow === 'string'
    ? parseJSON<LegacyEditorDrawflow | DrawflowData>(
        workflow.drawflow,
        {} as LegacyEditorDrawflow | DrawflowData
      )
    : workflow.drawflow;
const convertWorkflowData = (workflow: WorkflowLike) => {
  const data = getFlowData(workflow);
  if (!('drawflow' in data) || !data.drawflow) return workflow;
  const triggerBlock = findTriggerBlock(
    data as unknown as import('@/types/utils').TriggerSearchDrawflow
  );
  if (!triggerBlock) return workflow;
  const blocks = (data as LegacyEditorDrawflow).drawflow.Home.data;
  const tracedBlocks = new Set<string>();
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  const extractBlock = (blockId: string) => {
    if (tracedBlocks.has(blockId)) return;
    const block = blocks[blockId] as LegacyEditorBlock;
    nodes.push({
      id: block.id,
      type: block.html,
      label: block.name,
      position: {
        x: block.pos_x,
        y: block.pos_y,
      },
      data: block.data,
    });
    const nextBlockIds: string[] = [];
    const outputs = Object.values(block.outputs);
    outputs.forEach(({ connections }, outputIndex) => {
      let outputName: string | number = outputIndex + 1;
      const isLastIndex = outputs.length - 1 === outputIndex;
      const isConditionsBlock = block.name === 'conditions';
      const isFallbackBlock = block.html === 'BlockBasicWithFallback';
      const isBlockFallback = block.html === 'BlockBasic' && outputName >= 2;
      if ((isConditionsBlock || isFallbackBlock || isBlockFallback) && isLastIndex) {
        outputName = 'fallback';
      }
      if (isConditionsBlock && !isLastIndex) {
        outputName = (
          block.data.conditions as Array<{
            id: string;
          }>
        )[outputIndex].id;
      }
      connections.forEach(({ node: outputId, output }) => {
        const sourceHandle = `${block.id}-output-${outputName}`;
        const targetHandle = `${outputId}-${output.replace('_', '-')}`;
        edges.push({
          sourceHandle,
          targetHandle,
          source: block.id,
          target: outputId,
          updatable: true,
          selectable: true,
          id: `vueflow__edge-${sourceHandle}-${targetHandle}`,
          class: `source-${sourceHandle} target-${targetHandle}`,
        });
        nextBlockIds.push(outputId);
      });
    });
    tracedBlocks.add(blockId);
    nextBlockIds.forEach((nextId) => {
      extractBlock(nextId);
    });
  };
  extractBlock(triggerBlock.id);
  workflow.drawflow = { edges, nodes, x: 0, y: 0, zoom: 0 } as DrawflowData & {
    x: number;
    y: number;
  };
  return workflow;
};
export default convertWorkflowData;
