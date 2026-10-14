<template>
  <svg
    v-if="!disabled"
    class="browsless-element-highlighter"
    style="
      height: 100%;
      width: 100%;
      top: 0;
      left: 0;
      pointer-events: none;
      position: fixed;
      z-index: 999999;
    "
  >
    <shared-element-highlighter
      :items="elementsState.hovered"
      stroke="#fbbf24"
      fill="rgba(251, 191, 36, 0.1)"
    />
    <shared-element-highlighter
      :items="elementsState.selected"
      stroke="#2563EB"
      active-stroke="#f87171"
      fill="rgba(37, 99, 235, 0.1)"
      active-fill="rgba(248, 113, 113, 0.1)"
    />
  </svg>
  <teleport to="html">
    <div
      v-if="!disabled"
      id="browsless-selector-overlay"
      style="
        z-index: 9999999;
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
      "
    ></div>
  </teleport>
</template>
<script setup lang="ts">
import { reactive, watch, onBeforeUnmount, toRaw } from 'vue';
import { finder } from '@medv/finder';
import { debounce } from '@/utils/helper';
import getSelectorOptions from '@/content/elementSelector/getSelectorOptions';
import { generateXPath, getElementPath, getElementRect } from '@/content/utils';
import findElementList from '@/content/elementSelector/listSelector';
import generateElementsSelector from '@/content/elementSelector/generateElementsSelector';
import type {
  ElementSelectorMode,
  IframeElementRectPayload,
  SelectedElementRect,
} from '@/content/elementSelector/types';
import type { ContentSelectorSettings } from '@/types/content';
import SharedElementHighlighter from './SharedElementHighlighter.vue';

const props = withDefaults(
  defineProps<{
    selectorType?: ElementSelectorMode;
    selectedEls?: SelectedElementRect[];
    selectorSettings?: ContentSelectorSettings;
    list?: boolean;
    hide?: boolean;
    pause?: boolean;
    disabled?: boolean;
    onlyInList?: boolean;
    withAttributes?: boolean;
  }>(),
  {
    selectorType: 'css',
    selectedEls: () => [],
    selectorSettings: () => ({}),
  }
);
const emit = defineEmits<{
  selected: [
    payload: {
      selector?: string;
      selectElements?: SelectedElementRect[];
      elements?: SelectedElementRect[];
      path?: Node[];
    },
  ];
}>();
let frameElement: HTMLIFrameElement | null = null;
let frameElementRect: DOMRect | null = null;
let lastScrollPosY = window.scrollY;
let lastScrollPosX = window.scrollX;
const mousePosition = {
  x: 0,
  y: 0,
};
let hoveredElements: Element[] = [];
const elementsState = reactive<{
  hovered: SelectedElementRect[];
  selected: SelectedElementRect[];
}>({
  hovered: [],
  selected: [],
});
const onScroll = debounce(() => {
  if (props.disabled) return;
  hoveredElements = [];
  elementsState.hovered = [];
  const yPos = window.scrollY - lastScrollPosY;
  const xPos = window.scrollX - lastScrollPosX;
  elementsState.selected.forEach((_, index) => {
    elementsState.selected[index].x -= xPos;
    elementsState.selected[index].y -= yPos;
  });
  lastScrollPosX = window.scrollX;
  lastScrollPosY = window.scrollY;
}, 100);
const getElementRectWithOffset = (
  element: Element,
  {
    withAttribute,
    withElOptions,
  }: { withAttribute?: boolean; withElOptions?: boolean } = {}
): SelectedElementRect => {
  const rect: SelectedElementRect = getElementRect(element, withAttribute);
  if (frameElementRect) {
    rect.y = (rect.y ?? 0) + frameElementRect.top;
    rect.x = (rect.x ?? 0) + frameElementRect.left;
  }
  if (withElOptions && element.tagName === 'SELECT') {
    rect.options = Array.from(element.querySelectorAll('option')).map((el) => ({
      value: el.value,
      name: el.innerText,
    }));
  }
  return rect;
};
const removeElementsList = () => {
  const prevSelectedList = document.querySelectorAll('[browsless-el-list]');
  prevSelectedList.forEach((el) => {
    el.removeAttribute('browsless-el-list');
  });
};
const resetFramesElements = (options: Record<string, unknown> = {}) => {
  const elements = document.querySelectorAll('iframe, frame');
  elements.forEach((element) => {
    (element as HTMLIFrameElement).contentWindow?.postMessage(
      {
        ...options,
        type: 'browsless:reset-element-selector',
      },
      '*'
    );
  });
};
const retrieveElementsRect = (
  {
    clientX,
    clientY,
    target: eventTarget,
  }: { clientX: number; clientY: number; target: EventTarget | null },
  type: 'hovered' | 'selected'
) => {
  const isBrowslessContainer = (eventTarget as Element)?.classList?.contains(
    'browsless-element-selector'
  );
  if (props.disabled || isBrowslessContainer) return;
  const isSelectList = props.list && props.selectorType === 'css';
  let { 1: target } = document.elementsFromPoint(clientX, clientY);
  if (!target) return;
  const onlyInList = Boolean(props.onlyInList) && elementsState.selected.length > 0;
  const framesEl = ['IFRAME', 'FRAME'];
  if (framesEl.includes(target.tagName)) {
    const frameTarget = target as HTMLIFrameElement;
    if (type === 'selected') removeElementsList();
    if (frameTarget.contentDocument) {
      frameElement = frameTarget;
      frameElementRect = frameTarget.getBoundingClientRect();
      const yPos = clientY - frameElementRect.top;
      const xPos = clientX - frameElementRect.left;
      target = frameTarget.contentDocument.elementFromPoint(xPos, yPos) as Element;
      if (!target) return;
    } else {
      const { top, left } = frameTarget.getBoundingClientRect();
      const payload: Record<string, unknown> = {
        top,
        left,
        clientX,
        clientY,
        onlyInList,
        list: isSelectList,
        type: 'browsless:get-element-rect',
        withAttributes: props.withAttributes,
      };
      if (type === 'selected') {
        Object.assign(payload, {
          click: true,
          selectorType: props.selectorType,
          selectorSettings: toRaw(props.selectorSettings),
        });
      }
      frameTarget.contentWindow?.postMessage(payload, '*');
      frameElement = frameTarget;
      frameElementRect = frameTarget.getBoundingClientRect();
      return;
    }
  } else {
    frameElement = null;
    frameElementRect = null;
  }
  let elementsRect: SelectedElementRect[] = [];
  const withElOptions = type === 'selected';
  const withAttribute = Boolean(props.withAttributes) && type === 'selected';
  if (isSelectList) {
    const elements =
      findElementList(target, {
        onlyInList,
        frameElement,
      }) || [];
    if (type === 'hovered') hoveredElements = elements;
    elementsRect = elements.map((el) =>
      getElementRectWithOffset(el, { withAttribute, withElOptions })
    );
  } else {
    if (type === 'hovered') hoveredElements = [target];
    elementsRect = [getElementRectWithOffset(target, { withAttribute, withElOptions })];
  }
  elementsState[type] = elementsRect;
  if (type === 'selected') {
    if (!frameElement) resetFramesElements();
    const selectorOptions = getSelectorOptions(props.selectorSettings ?? {});
    let selector = generateElementsSelector({
      target,
      frameElement,
      hoveredElements,
      list: isSelectList,
      selectorType: props.selectorType,
      selectorSettings: selectorOptions,
    });
    if (frameElement) {
      const frameSelector = finder(frameElement, selectorOptions);
      selector = `${frameSelector} |> ${selector}`;
    }
    const selectElements = elementsRect.reduce<SelectedElementRect[]>(
      (acc, rect, index) => {
        if (rect.tagName !== 'SELECT') return acc;
        acc.push({ ...rect, elIndex: index });
        return acc;
      },
      []
    );
    emit('selected', {
      selector,
      selectElements,
      elements: elementsRect,
      path: getElementPath(target),
    });
  }
};
const onMousemove = (event: MouseEvent) => {
  if (props.pause) return;
  mousePosition.x = event.clientX;
  mousePosition.y = event.clientY;
  retrieveElementsRect(event, 'hovered');
};
const onKeydown = (event: KeyboardEvent) => {
  if (props.pause || event.repeat || event.code !== 'Space') return;
  const { 1: selectedElement } = document.elementsFromPoint(
    mousePosition.x,
    mousePosition.y
  );
  if (!selectedElement || selectedElement.id === 'browsless-selector-overlay') return;
  event.preventDefault();
  event.stopPropagation();
  retrieveElementsRect(
    {
      target: selectedElement,
      clientX: mousePosition.x,
      clientY: mousePosition.y,
    },
    'selected'
  );
};
const onMousedown = (event: MouseEvent) => {
  if ((event.target as Element)?.id === 'browsless-selector-overlay') {
    event.preventDefault();
    event.stopPropagation();
  }
  retrieveElementsRect(event, 'selected');
};
const onMessage = ({ data }: MessageEvent<Partial<IframeElementRectPayload>>) => {
  if (data.type !== 'browsless:iframe-element-rect') return;
  if (data.click) {
    const frameSelector =
      props.selectorType === 'css'
        ? finder(frameElement as Element, { tagName: () => true })
        : generateXPath(frameElement);
    emit('selected', {
      elements: data.elements,
      selector: `${frameSelector} |> ${data.selector}`,
    });
  }
  const key = data.click ? 'selected' : 'hovered';
  elementsState[key] = data.elements ?? [];
};
const attachListeners = () => {
  window.addEventListener('scroll', onScroll);
  window.addEventListener('message', onMessage);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('mousemove', onMousemove);
  document.addEventListener('mousedown', onMousedown);
};
const detachListeners = () => {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('message', onMessage);
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('mousemove', onMousemove);
  document.removeEventListener('mousedown', onMousedown);
};
watch(
  () => [props.list, props.disabled],
  () => {
    removeElementsList();
    resetFramesElements({ clearCache: true });
  }
);
watch(
  () => props.selectedEls,
  () => {
    elementsState.selected = props.selectedEls;
  }
);
watch(
  () => props.hide,
  () => {
    if (!props.hide) attachListeners();
    else detachListeners();
  },
  { immediate: true }
);
onBeforeUnmount(detachListeners);
</script>
