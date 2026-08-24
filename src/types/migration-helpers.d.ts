import type { SavedPackage } from '@/types/models';

export interface SelectorQueryData {
  selector: string;
  findBy?: 'cssSelector' | 'xpath' | string | null;
  multiple?: boolean;
  waitForSelector?: boolean;
  waitSelectorTimeout?: number;
  markEl?: boolean;
  blockIdAttr?: string;
  [key: string]: unknown;
}

export interface SelectorBlock {
  id?: string;
  data: SelectorQueryData & { selector: string };
  frameSelector?: string | null;
  debugMode?: boolean;
}

export interface SelectorVerifyResult {
  notFound: boolean;
}

export interface RecordingFlow {
  id: string;
  description?: string;
  isClickLink?: boolean;
  data: Record<string, unknown> & {
    url?: string;
    matchPattern?: string;
    createIfNoMatch?: boolean;
    updatePrevTab?: boolean;
  };
}

export interface RecordingActiveTab {
  id?: number | null;
  url?: string | null;
}

export interface RecordingState {
  flows: RecordingFlow[];
  name: string;
  activeTab: RecordingActiveTab;
  [key: string]: unknown;
}

export type StarterPackage = SavedPackage;
