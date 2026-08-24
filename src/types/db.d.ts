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
}
