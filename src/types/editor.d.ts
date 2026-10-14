import type { Ref } from 'vue';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type {
  DrawflowData,
  SavedPackage,
  Workflow,
  WorkflowDataColumn,
} from '@/types/models';

export type CodeMirrorCompletionSource = (
  context: CompletionContext
) => CompletionResult | null;

export interface ExportFileType {
  mime: string;
  ext: string;
}

export interface ExportOptions {
  name?: string;
  type: 'plain-text' | 'json' | 'csv';
  addBOMHeader?: boolean;
  csvOptions?: Record<string, unknown>;
  returnUrl?: boolean;
  returnBlob?: boolean;
}

export type LegacyEditorBlock = {
  id: string;
  name: string;
  html: string;
  pos_x: number;
  pos_y: number;
  data: Record<string, unknown>;
  outputs: Record<
    string,
    {
      connections: Array<{ node: string; output: string }>;
    }
  >;
};

export interface LegacyEditorDrawflow {
  drawflow: {
    Home: {
      data: Record<string, LegacyEditorBlock>;
    };
  };
}

export type WorkflowLike = Workflow & {
  drawflow: DrawflowData | LegacyEditorDrawflow | string;
};

// src/dashboard/pages/workflows/[id].vue's `workflow` computed can hold either
// a plain Workflow or a package (SavedPackage) being edited, depending on route.
export type WorkflowOrPackage = (Workflow | SavedPackage) & {
  testingMode?: boolean;
  isExternal?: boolean;
  data?: DrawflowData;
  asBlock?: boolean;
};

// Shape of the values `provide('workflow', ...)` / `provide('workflow-utils', ...)`
// pass down from src/dashboard/pages/workflows/[id].vue to block components.
export interface WorkflowInjectionContext {
  editState?: {
    editing?: boolean;
    blockData?: ({ itemId?: string } & Record<string, unknown>) | false;
    [key: string]: unknown;
  };
  isPackage?: boolean;
  data: Ref<WorkflowOrPackage | undefined>;
  columns?: Ref<WorkflowDataColumn[]>;
}

export interface WorkflowUtilsInjectionContext {
  executeFromBlock: (blockId: string) => void;
}

// A workflow drawflow node's `data` as consumed by the Block* editor
// components (src/components/block/). Every block type has its own extra
// fields on top of this, hence the index signature.
export interface BlockNodeData {
  description?: string;
  disableBlock?: boolean;
  loopId?: string;
  refKey?: string;
  onError?: { enable?: boolean; toDo?: 'fallback' | string };
  $breakpoint?: boolean;
  [key: string]: unknown;
}

export interface RunningWorkflowEntry {
  id: string;
  workflowId?: string;
  status?: string;
  state: {
    name: string;
    startedTimestamp: number;
    tabId?: number;
    nextBlockBreakpoint?: boolean;
    currentBlock: { id: string; name: string; startedAt: number }[];
    logs?: { id: string; name: string; duration: number; description?: string }[];
    ctxData?: {
      ctxData: Record<
        string,
        {
          referenceData: { loopData: string; variables: string; [key: string]: unknown };
          [key: string]: unknown;
        }
      >;
      dataSnapshot: Record<string, unknown>;
    };
  };
}

export interface EditedBlock {
  id?: string;
  blockId?: string;
  itemId?: string;
  name?: string;
  editComponent?: string | import('vue').Component;
  data?: Record<string, unknown>;
  connections?: { id: string; name: string }[];
  editCondition?: string;
}
export interface EditorContextSelection {
  nodes: import('@vue-flow/core').GraphNode[];
  edges: import('@vue-flow/core').GraphEdge[];
  nodeId?: string;
  handleId?: string;
  position?: { clientX: number; clientY: number };
}
