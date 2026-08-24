import findSelector from '@/lib/findSelector';
import { generateXPath } from '../utils';
import type { ContentSelectorFinderOptions } from '@/types/content';
import type { GenerateElementsSelectorParams } from './types';

export default function ({
  list,
  target,
  selectorType,
  frameElement,
  hoveredElements,
  selectorSettings,
}: GenerateElementsSelectorParams) {
  let selector = '';

  const selectorOptions = selectorSettings || {};
  const [selectedElement] = hoveredElements;
  if (!selectedElement) return selector;

  const finderOptions = { ...selectorOptions } as ContentSelectorFinderOptions;
  let documentCtx: Document | Element = document;

  if (frameElement) {
    const frameBody = frameElement.contentDocument?.body;
    if (!frameBody) return selector;

    documentCtx = frameBody;
    finderOptions.root = documentCtx;
  }

  if (list) {
    const isInList = target.closest('[browsless-el-list]');

    if (isInList) {
      const childSelector = findSelector(target, {
        root: isInList,
        ...selectorOptions,
        idName: () => false,
      });
      const listSelector = isInList.getAttribute('browsless-el-list');
      if (!listSelector) return selector;

      selector = `${listSelector} ${childSelector}`;
    } else {
      const parentElement = selectedElement.parentElement;
      if (!parentElement) return selector;

      const parentSelector = findSelector(parentElement, finderOptions);
      selector = `${parentSelector} > ${selectedElement.tagName.toLowerCase()}`;

      const prevSelectedList = documentCtx.querySelectorAll('[browsless-el-list]');
      prevSelectedList.forEach((el) => {
        el.removeAttribute('browsless-el-list');
      });

      hoveredElements.forEach((el) => {
        el.setAttribute('browsless-el-list', selector);
      });
    }
  } else {
    selector =
      selectorType === 'xpath'
        ? (generateXPath(selectedElement) ?? '')
        : findSelector(selectedElement, finderOptions);
  }

  return selector;
}
