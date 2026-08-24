export interface RuntimeMessageEnvelope<T = unknown> {
  name: string;
  data: T;
}

export interface BrowserApiMessagePayload {
  name: string;
  args: unknown[];
}

export type MessageListenerCallback<T = unknown, R = unknown> = (
  data: T,
  sender: chrome.runtime.MessageSender
) => R | Promise<R>;

export interface WorkflowTriggerEntry {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface TriggerBlockData {
  type?: string;
  triggers?: WorkflowTriggerEntry[];
  contextMenuName?: string;
  contextTypes?: string[];
  interval?: number;
  delay?: number;
  fixedDelay?: boolean;
  date?: string;
  time?: string;
  days?: Array<number | { id: number; times: string[] }>;
  expression?: string;
  url?: string;
  isUrlRegex?: boolean;
  supportSPA?: boolean;
  shortcut?: string;
  [key: string]: unknown;
}

export interface VisitWebTriggerItem {
  id: string;
  url: string;
  isRegex?: boolean;
  supportSPA?: boolean;
}

export interface BrowserApiMapItem {
  path: string;
  api: () => unknown;
  isEvent?: true;
}

export interface BrowserApiEventController {
  addListener: (callback: (...args: unknown[]) => void) => void;
  removeListener: (callback: (...args: unknown[]) => void) => void;
  hasListener: (callback: (...args: unknown[]) => void) => boolean;
  hasListeners: () => boolean;
}

export interface SerializedFunctionMarker {
  __type: 'function';
  __value: string;
}

export type SerializedValue =
  | SerializedFunctionMarker
  | string
  | number
  | boolean
  | null
  | undefined
  | SerializedValue[]
  | { [key: string]: SerializedValue };
