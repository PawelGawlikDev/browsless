import { customAlphabet } from 'nanoid';
import { excludeOnError } from '../shared';
import { getBlocks } from '../getSharedData';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 7);

type FlowNodeData = {
  onError?: { enable?: boolean };
} & Record<string, unknown>;

type FlowNode = {
  id: string;
  label?: string;
  type?: string;
  position?: { x: number; y: number };
  data?: FlowNodeData;
} & Record<string, unknown>;

type FlowEdge = {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  class?: string;
};

type EdgeChange = { type: 'remove'; id: string } | { type: 'add'; item: FlowEdge };

interface FlowEditor {
  getNode: { value: (id: string) => FlowNode };
  getEdges: { value: FlowEdge[] };
  addNodes: (nodes: FlowNode[]) => unknown;
  removeNodes: (nodes: FlowNode[]) => unknown;
  addEdges: (edges: FlowEdge[]) => unknown;
  applyEdgeChanges: (changes: EdgeChange[]) => unknown;
}

type DropBlockPayload = {
  id: string;
  component?: string;
  fromBlockBasic?: boolean;
  data?: Record<string, unknown>;
};

class DroppedNode {
  static isNode(target: Element): Element | null {
    if (target.closest('.vue-flow__handle')) return null;

    return target.closest('.vue-flow__node');
  }

  static isHandle(target: Element): Element | null {
    return target.closest('.vue-flow__handle.source');
  }

  static isEdge(target: Element): Element | null {
    return target.closest('.vue-flow__edge');
  }

  static replaceNode(
    editor: FlowEditor,
    { block, target: targetEl }: { block: DropBlockPayload; target: HTMLElement }
  ) {
    const targetNode = editor.getNode.value(targetEl.dataset.id as string);

    if (targetNode.label === 'blocks-group' || block.fromBlockBasic) return;

    let blockData = block;
    if (block.fromBlockBasic) {
      const blocks = getBlocks();
      blockData = { ...blocks[block.id], id: block.id } as DropBlockPayload;
    }

    const onErrorEnabled =
      targetNode.data?.onError?.enable && !excludeOnError.includes(blockData.id);
    const newNodeData = onErrorEnabled
      ? { ...blockData.data, onError: targetNode.data?.onError }
      : blockData.data;

    const newNode: FlowNode = {
      id: nanoid(),
      data: newNodeData,
      label: blockData.id,
      type: blockData.component,
      position: targetNode.position,
    };

    const edges = editor.getEdges.value.reduce<FlowEdge[]>((acc, edge) => {
      const sourceHandle = edge.sourceHandle ?? '';
      const targetHandle = edge.targetHandle ?? '';

      if (edge.target === targetNode.id) {
        acc.push({
          source: edge.source,
          target: newNode.id,
          sourceHandle,
          targetHandle: targetHandle.replace(edge.target, newNode.id),
          id: `edge-${nanoid()}`,
          class: `source-${sourceHandle} target-${targetHandle.replace(
            edge.target,
            newNode.id
          )}`,
        });
      } else if (edge.source === targetNode.id) {
        acc.push({
          source: newNode.id,
          target: edge.target,
          sourceHandle: sourceHandle.replace(edge.source, newNode.id),
          targetHandle,
          id: `edge-${nanoid()}`,
          class: `source-${sourceHandle.replace(
            edge.source,
            newNode.id
          )} target-${targetHandle}`,
        });
      }

      return acc;
    }, []);

    editor.removeNodes([targetNode]);
    editor.addNodes([newNode]);
    editor.addEdges(edges);
  }

  static appendNode(
    editor: FlowEditor,
    { target, nodeId }: { target: HTMLElement; nodeId: string }
  ) {
    const { nodeid: source, handleid } = target.dataset;
    if (!source || !handleid) return;

    editor.addEdges([
      {
        source,
        target: nodeId,
        sourceHandle: handleid,
        targetHandle: `${nodeId}-input-1`,
      },
    ]);
  }

  static insertBetweenNode(
    editor: FlowEditor,
    {
      target,
      nodeId,
      outputs,
    }: { target: Element | null; nodeId: string; outputs: number }
  ) {
    if (!target) return;

    const edgesChanges: EdgeChange[] = [];
    const targetEdge = {
      target: '',
      source: '',
      targetHandle: '',
      sourceHandle: '',
    };

    target.classList.forEach((name) => {
      if (name.startsWith('source-')) {
        const sourceHandle = name.replace('source-', '');
        const outputIndex = sourceHandle.indexOf('-output');
        const sourceId = sourceHandle.slice(0, outputIndex);

        targetEdge.source = sourceId;
        targetEdge.sourceHandle = sourceHandle;

        return;
      }

      if (name.startsWith('target-')) {
        const targetHandle = name.replace('target-', '');
        const inputIndex = targetHandle.indexOf('-input');
        const targetId = targetHandle.slice(0, inputIndex);

        targetEdge.target = targetId;
        targetEdge.targetHandle = targetHandle;
      }
    });

    editor.getEdges.value.forEach((edge) => {
      const matchTarget = edge.targetHandle === targetEdge.targetHandle;
      const matchSource = edge.sourceHandle === targetEdge.sourceHandle;

      if (matchTarget && matchSource) {
        edgesChanges.push({ type: 'remove', id: edge.id });
      }
    });

    if (outputs > 0) {
      edgesChanges.push({
        type: 'add',
        item: {
          source: nodeId,
          id: `edge-${nanoid()}`,
          target: targetEdge.target,
          sourceHandle: `${nodeId}-output-1`,
          targetHandle: targetEdge.targetHandle,
        },
      });
    }

    edgesChanges.push({
      type: 'add',
      item: {
        target: nodeId,
        id: `edge-${nanoid()}`,
        source: targetEdge.source,
        targetHandle: `${nodeId}-input-1`,
        sourceHandle: targetEdge.sourceHandle,
      },
    });

    editor.applyEdgeChanges(edgesChanges);
  }
}

export default DroppedNode;
