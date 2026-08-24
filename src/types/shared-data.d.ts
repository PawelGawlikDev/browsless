export interface SharedBlockDefinition {
  name?: string;
  icon?: string;
  component?: string;
  category?: string;
  data?: Record<string, unknown>;
  refDataKeys?: string[];
  [key: string]: unknown;
}

export type SharedBlocksMap = Record<string, SharedBlockDefinition>;

export type WorkflowHandlerRegistry = Record<string, unknown>;
