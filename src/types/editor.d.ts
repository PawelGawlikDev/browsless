import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { DrawflowData, Workflow } from '@/types/models';

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
