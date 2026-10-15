import type { InjectionKey, Ref } from 'vue';

export interface UiTabsContext {
  modelValue: Ref<string | number>;
  type: Ref<'default' | 'fill'>;
  color: Ref<string>;
  small: Ref<boolean>;
  fill: Ref<boolean>;
  updateActive: (id: string | number) => void;
  hoverHandler: (event: MouseEvent) => void;
}

export interface UiTabPanelsContext {
  modelValue: Ref<string | number>;
  cache: Ref<boolean>;
}

export const uiTabsKey: InjectionKey<UiTabsContext> = Symbol('ui-tabs');
export const uiTabPanelsKey: InjectionKey<UiTabPanelsContext> = Symbol('ui-tab-panels');
