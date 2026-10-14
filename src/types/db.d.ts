export interface DbLogAuxRecord {
  id?: number;
  logId: string;
  data: unknown;
}

export interface DbLogItem {
  id?: number;
  name: string;
  endedAt: number;
  message: string;
  startedAt: number;
  parentLog: string | null;
  workflowId: string | null;
  status: string;
  collectionId: string | null;
  [key: string]: unknown;
}

export interface DbStorageVariable {
  id?: number;
  name: string;
  value: unknown;
}

export interface DbStorageCredential {
  id?: number;
  name: string;
  value: unknown;
  createdAt?: number;
}

export interface DbStorageTableItem {
  id?: number;
  name: string;
  columns: import('./models').WorkflowDataColumn[];
  rowsCount: number;
  createdAt: number;
  modifiedAt: number;
}

export interface DbStorageTableData {
  id?: number;
  tableId: number;
  items: Record<string, unknown>[];
  columnsIndex: Record<string, { index: number; type: string; name: string }>;
}
