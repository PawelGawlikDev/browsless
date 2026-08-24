import type { Workflow } from '@/types/models';
import type { SharedBlockDefinition } from '@/types/shared-data';

export type ContentBlockDefinition = SharedBlockDefinition & {
  name: string;
};

export type ContentBlockHandler = (...args: unknown[]) => unknown;

export interface ContentSelectorSettings {
  idName?: boolean;
  tagName?: boolean;
  className?: boolean;
  attr?: boolean;
  attrNames?: string;
}

export interface ContentSelectorFinderOptions {
  idName: (name: string) => boolean;
  tagName: (tagName: string) => boolean;
  className: (className: string) => boolean;
  attr: (name: string, value?: string) => boolean;
  root?: Element;
}

export type ContentObserverOptions = MutationObserverInit & {
  attributeFilter?: string[];
};

export interface ContentObserveElementConfig {
  selector: string;
  baseSelector?: string;
  matchPattern: string;
  targetOptions: ContentObserverOptions;
  baseElOptions: ContentObserverOptions;
}

export type ContentElementChangeTrigger = Record<string, unknown> & {
  type: 'element-change';
  observeElement?: ContentObserveElementConfig;
};

export type ContentWorkflow = Omit<Workflow, 'trigger'> & {
  trigger: ContentElementChangeTrigger | Record<string, unknown> | null;
  includeTabId?: boolean;
};
