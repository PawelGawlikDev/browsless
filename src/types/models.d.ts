export type Dictionary<T = unknown> = Record<string, T>;

export interface Position {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  label: string;
  type: string;
  position: Position;
  data: Dictionary;
  [key: string]: unknown;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  markerEnd?: string;
  [key: string]: unknown;
}

export interface DrawflowData {
  edges: WorkflowEdge[];
  nodes: WorkflowNode[];
  zoom?: number;
  position?: number[];
  [key: string]: unknown;
}

export interface WorkflowSettings {
  publicId: string;
  aipowerToken: string;
  blockDelay: number;
  saveLog: boolean;
  debugMode: boolean;
  restartTimes: number;
  notification: boolean;
  execContext: 'popup' | 'background' | string;
  reuseLastState: boolean;
  inputAutocomplete: boolean;
  onError: string;
  executedBlockOnWeb: boolean;
  insertDefaultColumn: boolean;
  defaultColumnName: string;
  [key: string]: unknown;
}

export interface WorkflowDataColumn {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

export interface Workflow {
  id: string;
  name: string;
  icon: string;
  folderId: string | null;
  content: unknown;
  connectedTable: unknown;
  drawflow: DrawflowData;
  table: WorkflowDataColumn[];
  dataColumns: WorkflowDataColumn[];
  description: string;
  trigger: unknown;
  createdAt: number;
  updatedAt: number;
  isDisabled: boolean;
  settings: WorkflowSettings;
  version: string;
  globalData: string;
  [key: string]: unknown;
}

export type WorkflowMap = Record<string, Workflow>;

export interface WorkflowStateEntry {
  workflowId?: string;
  [key: string]: unknown;
}

export interface Folder {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface PackageIoItem {
  id: string;
  name: string;
  blockId: string;
  handleId?: string;
  [key: string]: unknown;
}

export interface PackageSettings {
  asBlock: boolean;
  [key: string]: unknown;
}

export interface SavedPackage {
  id: string;
  name: string;
  icon: string;
  isExtenal: boolean;
  content: unknown;
  inputs: PackageIoItem[];
  outputs: PackageIoItem[];
  variable: unknown[];
  settings: PackageSettings;
  data: DrawflowData;
  createdAt?: number;
  description?: string;
  [key: string]: unknown;
}

export interface EditorSettings {
  minZoom: number;
  maxZoom: number;
  arrow: boolean;
  snapToGrid: boolean;
  lineType: string;
  saveWhenExecute: boolean;
  snapGrid: Record<number, number>;
  [key: string]: unknown;
}

export interface MainSettings {
  locale: string;
  deleteLogAfter: number | 'never';
  logsLimit: number;
  editor: EditorSettings;
  [key: string]: unknown;
}

export interface EditorClipboardState {
  edges: WorkflowEdge[];
  nodes: WorkflowNode[];
}

export interface WorkspaceTab {
  id: string;
  path: string;
  name: string;
  [key: string]: unknown;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object | undefined | null
      ? DeepPartial<NonNullable<T[K]>> | T[K]
      : T[K];
};
