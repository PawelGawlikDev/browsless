import type { TriggerBlockData } from '@/types/runtime';
import type { Workflow } from '@/types/models';

export interface LocalBackupSettings {
  includedItems: string[];
  folderName?: string;
  schedule: string;
  customSchedule: string;
  lastBackup?: number;
}

export interface ContextMenuMessagePayload {
  [key: string]: unknown;
}

export interface WorkflowWithTrigger extends Workflow {
  trigger?: TriggerBlockData | null;
}
