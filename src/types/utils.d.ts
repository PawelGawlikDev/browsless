import type { DrawflowData, WorkflowNode } from '@/types/models';

export interface FileRequestOptions {
  responseType?: 'blob' | 'text' | 'json' | 'arrayBuffer';
  returnValue?: boolean;
}

export interface FileResult {
  objUrl: string;
  path: string;
  type: string;
}

export interface KeyboardDefinition {
  key: string;
  code?: string;
  keyCode?: number;
  shiftKeyCode?: number;
  shiftKey?: string;
  text?: string;
  location?: number;
}

export type KeyboardDefinitions = Record<string, KeyboardDefinition>;

export type LocalFileResult = FileResult | Blob | string | unknown;

export interface LegacyDrawflowHome {
  drawflow?: {
    Home?: {
      data?: Record<string, WorkflowNode & { name?: string }>;
    };
  };
}

export type TriggerSearchDrawflow = DrawflowData | LegacyDrawflowHome | null | undefined;
