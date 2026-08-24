import FindElement from '@/utils/FindElement';
import { getElementRect } from '../utils';
import findElementList from './listSelector';
import generateElementsSelector from './generateElementsSelector';
import getSelectorOptions from './getSelectorOptions';
import type {
  FindElementMessage,
  GetElementRectMessage,
  IframeElementRectPayload,
  ResetElementSelectorMessage,
  SelectedElementsPayload,
  SelectorFrameMessage,
  SelectorFrameRect,
} from './types';
let hoveredElements: Element[] = [];
let prevSelectedElement: Element | null = null;
const getElementRectWithOffset = (
  element: Element,
  data: SelectorFrameRect & {
    click?: boolean;
    withAttributes?: boolean;
  }
) => {
  const withAttributes = data.withAttributes && data.click;
  const elementRect = getElementRect(element, withAttributes);
  elementRect.y += data.top;
  elementRect.x += data.left;
  return elementRect;
};
const getElementsRect = (data: GetElementRectMessage) => {
  const [element] = document.elementsFromPoint(
    data.clientX - data.left,
    data.clientY - data.top
  );
  if ((!element || element === prevSelectedElement) && !data.click) return;
  const payload: IframeElementRectPayload = {
    elements: [],
    type: 'browsless:iframe-element-rect',
  };
  if (data.click) {
    if (hoveredElements.length === 0) return;
    payload.click = true;
    const [selectedElement] = hoveredElements;
    const selector = generateElementsSelector({
      hoveredElements,
      list: data.list,
      target: selectedElement,
      selectorType: data.selectorType,
      selectorSettings: getSelectorOptions(data.selectorSettings || {}),
    });
    payload.selector = selector;
    payload.elements = hoveredElements.map((el) => getElementRectWithOffset(el, data));
  } else {
    prevSelectedElement = element;
    let elementsRect = [];
    if (data.list) {
      const elements =
        findElementList(element, {
          onlyInList: data.onlyInList,
        }) || [];
      hoveredElements = elements;
      elementsRect = elements.map((el) => getElementRectWithOffset(el, data));
    } else {
      hoveredElements = [element];
      elementsRect = [getElementRectWithOffset(element, data)];
    }
    payload.elements = elementsRect;
  }
  window.top.postMessage(payload, '*');
};
const resetElementSelector = (data: ResetElementSelectorMessage) => {
  const prevSelectedList = document.querySelectorAll('[browsless-el-list]');
  prevSelectedList.forEach((el) => {
    el.removeAttribute('browsless-el-list');
  });
  if (data.clearCache) {
    hoveredElements = [];
    prevSelectedElement = null;
  }
};
const findElement = ({ selector, selectorType, frameRect }: FindElementMessage) => {
  const payload: SelectedElementsPayload = {
    elements: [],
    type: 'browsless:selected-elements',
  };
  try {
    const elements = FindElement[selectorType]({ multiple: true, selector });
    const list = Array.isArray(elements)
      ? elements
      : elements instanceof NodeList
        ? Array.from(elements)
        : [];
    payload.elements = list.map((el) =>
      getElementRectWithOffset(el, {
        withAttributes: true,
        click: true,
        ...frameRect,
      })
    );
  } catch (error) {
    console.error(error);
    payload.elements = [];
  }
  window.top.postMessage(payload, '*');
};
const onMessage = ({ data }: MessageEvent<SelectorFrameMessage>) => {
  if (!data?.type) return;
  switch (data.type) {
    case 'browsless:get-element-rect':
      getElementsRect(data);
      break;
    case 'browsless:reset-element-selector':
      resetElementSelector(data);
      break;
    case 'browsless:find-element':
      findElement(data);
      break;
    default:
  }
};
export default function () {
  window.addEventListener('message', onMessage);
}
