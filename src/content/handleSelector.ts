import FindElement from '@/utils/FindElement';
import type { SelectorBlock, SelectorQueryData } from '@/types/migration-helpers';
import { visibleInViewport, isXPath } from '@/utils/helper';
type HandleSelectorOptions = {
  onSelected?: (element: Element) => void | Promise<void>;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  withDocument?: boolean;
  returnElement?: boolean;
};
type SelectorLookupResult = Element | Element[] | NodeListOf<Element> | null;
const normalizeElements = (elements: SelectorLookupResult): Element[] => {
  if (!elements) return [];
  if (Array.isArray(elements)) return elements;
  if (elements instanceof NodeList) return Array.from(elements);
  return [elements];
};
export const markElement = (
  el: Element,
  {
    id,
    data,
  }: {
    id?: string;
    data: SelectorQueryData;
  }
) => {
  if (data.markEl) {
    el.setAttribute(`block--${id}`, '');
  }
};
export const getDocumentCtx = (frameSelector?: string | null) => {
  if (!frameSelector) return document;
  let documentCtx: Document | null = document;
  const iframeSelectors = frameSelector.split('|>');
  const type = isXPath(frameSelector) ? 'xpath' : 'cssSelector';
  iframeSelectors.forEach((selector) => {
    if (!documentCtx) return;
    const element = FindElement[type]({ selector }, documentCtx);
    documentCtx = element instanceof HTMLIFrameElement ? element.contentDocument : null;
  });
  return documentCtx;
};
export const queryElements = (
  data: SelectorQueryData,
  documentCtx: Document = document
) => {
  return new Promise<SelectorLookupResult>((resolve) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let isTimeout = false;
    const findSelector = () => {
      if (isTimeout) return;
      const selectorType = data.findBy || 'cssSelector';
      const elements = FindElement[selectorType](data, documentCtx);
      const isElNotFound =
        !elements ||
        (Array.isArray(elements) || elements instanceof NodeList
          ? elements.length === 0
          : false);
      if (isElNotFound && data.waitForSelector) {
        setTimeout(findSelector, 200);
      } else {
        if (timeout) clearTimeout(timeout);
        resolve(elements);
      }
    };
    findSelector();
    if (data.waitForSelector) {
      timeout = setTimeout(() => {
        isTimeout = true;
        resolve(null);
      }, data.waitSelectorTimeout);
    }
  });
};
export default async function (
  { data, id, frameSelector, debugMode }: SelectorBlock,
  { onSelected, onError, onSuccess, withDocument }: HandleSelectorOptions = {}
) {
  if (!data || !data.selector) {
    if (onError) onError(new Error('selector-empty'));
    return null;
  }
  const documentCtx = getDocumentCtx(frameSelector);
  if (!documentCtx) {
    if (onError) onError(new Error('iframe-not-found'));
    return null;
  }
  try {
    data.blockIdAttr = `block--${id}`;
    const elements = await queryElements(data, documentCtx);
    const elementsArr = normalizeElements(elements);
    if (elementsArr.length === 0) {
      if (onError) onError(new Error('element-not-found'));
      return null;
    }
    await Promise.allSettled(
      elementsArr.map(async (el) => {
        markElement(el, { id, data });
        if (debugMode) {
          const isInViewport = visibleInViewport(el);
          if (!isInViewport) el.scrollIntoView();
        }
        if (onSelected) await onSelected(el);
      })
    );
    if (onSuccess) onSuccess();
    if (withDocument) {
      return {
        elements,
        document: documentCtx,
      };
    }
    return elements;
  } catch (error) {
    if (onError) onError(error);
    throw error;
  }
}
