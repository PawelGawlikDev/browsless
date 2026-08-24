import type { ElementRect } from '../utils';
import type {
  ContentSelectorFinderOptions,
  ContentSelectorSettings,
} from '@/types/content';

export type ElementSelectorType = 'cssSelector' | 'xpath';
export type ElementSelectorMode = 'css' | 'xpath';

export interface GenerateElementsSelectorParams {
  list?: boolean;
  target: Element;
  selectorType?: ElementSelectorMode;
  frameElement?: HTMLIFrameElement | null;
  hoveredElements: Element[];
  selectorSettings?: ContentSelectorFinderOptions;
}

export interface ListSelectorOptions {
  frameElement?: HTMLIFrameElement | null;
  onlyInList?: boolean;
  selectorSettings?: ContentSelectorFinderOptions;
}

export interface SelectorFrameRect {
  top: number;
  left: number;
}

export type SelectorSettingsMessage = ContentSelectorSettings;

export interface GetElementRectMessage extends SelectorFrameRect {
  type: 'browsless:get-element-rect';
  clientX: number;
  clientY: number;
  click?: boolean;
  list?: boolean;
  onlyInList?: boolean;
  selectorType?: ElementSelectorMode;
  selectorSettings?: SelectorSettingsMessage;
  withAttributes?: boolean;
}

export interface ResetElementSelectorMessage {
  type: 'browsless:reset-element-selector';
  clearCache?: boolean;
}

export interface FindElementMessage {
  type: 'browsless:find-element';
  selector: string;
  selectorType: ElementSelectorType;
  frameRect: SelectorFrameRect;
}

export type SelectorFrameMessage =
  GetElementRectMessage | ResetElementSelectorMessage | FindElementMessage;

export interface IframeElementRectPayload {
  type: 'browsless:iframe-element-rect';
  elements: Array<Partial<ElementRect>>;
  click?: boolean;
  selector?: string;
}

export interface SelectedElementsPayload {
  type: 'browsless:selected-elements';
  elements: Array<Partial<ElementRect>>;
}
