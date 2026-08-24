export interface WorkflowReferenceData {
  table: Record<string, unknown>[];
  variables: Record<string, unknown>;
  loopData: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WorkflowEngineStateEntry {
  id?: string;
  workflowId?: string;
  state?: unknown;
  status?: string;
  isDestroyed?: boolean;
  [key: string]: unknown;
}

export interface WorkflowEngineStates {
  states: Map<string, WorkflowEngineStateEntry>;
  getAll: Map<string, WorkflowEngineStateEntry>;
  stop: (id: string) => Promise<unknown>;
}

export interface WorkflowEngineLike {
  referenceData: WorkflowReferenceData;
  columns: Record<string, { name: string; index: number }>;
  id: string;
  workflow?: {
    settings?: Record<string, any>;
    name?: string;
    icon?: string;
    description?: string;
  };
  connectionsMap: Record<string, Map<string, { id: string }>>;
  blocks: Record<
    string,
    { id: string; label?: string; data?: Record<string, unknown> } & Record<
      string,
      unknown
    >
  >;
  packagesCache: Record<string, { extracted: boolean; nodes: Record<string, string> }>;
  waitConnections: Record<
    string,
    Record<string, { isHere: boolean; isContinue: boolean }>
  >;
  states: WorkflowEngineStates;
  logger: unknown;
  blocksHandler: Record<string, (...args: any[]) => any>;
  eventListeners: Record<string, Array<(params: unknown) => void>>;
  on: (name: string, listener: (params: unknown) => void) => void;
  addRefDataSnapshot: (key: string) => void;
  isPopup?: boolean;
  isDestroyed?: boolean;
  isUsingProxy?: boolean;
}

export interface WorkflowHandlerOptions {
  refData: WorkflowReferenceData;
  prevBlockData?: unknown;
  prevBlock?: unknown;
  targetHandle?: string;
  sourceHandle?: string;
  nextBlockBreakpointCount?: number | null;
}

export interface WorkflowBlockResult {
  data?: unknown;
  nextBlockId?: unknown[] | null;
  destroyWorker?: boolean;
  replacedValue?: unknown;
  status?: string;
  logId?: string | number;
  ctxData?: Record<string, unknown>;
}

export interface WorkflowHandlerContext {
  engine: WorkflowEngineLike;
  activeTab: {
    id: number | null;
    frameId?: number | null;
    url?: string | null;
    groupId?: number | null;
    windowId?: number | null;
    frames?: Record<string, unknown>;
  };
  windowId: number | null;
  repeatedTasks: Record<string, number>;
  loopList: Record<
    string,
    {
      type: string;
      index: number;
      data: unknown[];
      maxLoop: number;
      blockId: string;
      id?: string;
      loadMoreAction?: Record<string, unknown> & {
        type?: string;
        actionPageMaxWaitTime?: number;
      };
    }
  >;
  loopEls: Array<{
    url?: unknown;
    loopId?: string;
    max?: number;
    blockId: string;
    findBy?: unknown;
    selector?: unknown;
  }>;
  settings: Record<string, any>;
  preloadScripts: unknown[];
  debugAttached: boolean;
  frameSelector?: string;
  dialogParams?: { accept?: boolean; promptText?: string };
  childWorkflowId?: string | null;
  getBlockConnections: (id: string, outputIndex?: number | string) => unknown[] | null;
  addDataToColumn: (
    columnId: string | Record<string, unknown>[],
    value?: unknown
  ) => void;
  setVariable: (name: string, value: unknown) => Promise<void>;
  _sendMessageToTab: (
    payload: Record<string, unknown>,
    options?: Record<string, unknown>,
    force?: boolean
  ) => Promise<any>;
}

export interface WorkflowHandlerBlock<TData = Record<string, unknown>> {
  id: string;
  label?: string;
  data: TData;
}
