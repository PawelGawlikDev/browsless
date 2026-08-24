type LoopSelectorOptions = {
  max: number;
  attrId: string;
  frameSelector: string;
  reverseLoop?: boolean;
  startIndex?: number;
};
export type ElementRect = {
  width: number;
  height: number;
  x: number;
  y: number;
  attributes?: Record<string, string>;
  tagName?: string;
};
type FrameRect = Pick<DOMRect, 'x' | 'y'> | null;
export const simulateClickElement = (element: HTMLElement) => {
  const eventOpts = { bubbles: true, view: window };
  element.dispatchEvent(new MouseEvent('mousedown', eventOpts));
  element.dispatchEvent(new MouseEvent('mouseup', eventOpts));
  if (element.click) {
    element.click();
  } else {
    element.dispatchEvent(new PointerEvent('click', { bubbles: true }));
  }
  element.focus?.();
};
export const generateLoopSelectors = (
  elements: Iterable<Element>,
  { max, attrId, frameSelector, reverseLoop, startIndex = 0 }: LoopSelectorOptions
) => {
  const selectors: string[] = [];
  let elementsList = Array.from(elements);
  if (reverseLoop) {
    elementsList = elementsList.reverse();
  }
  elementsList.forEach((el, index) => {
    if (max > 0 && selectors.length - 1 > max) return;
    const attrName = 'browsless-loop';
    const attrValue = `${attrId}--${(startIndex || 0) + index}`;
    el.setAttribute(attrName, attrValue);
    selectors.push(`${frameSelector}[${attrName}="${attrValue}"]`);
  });
  return selectors;
};
export const elementSelectorInstance = () => {
  const rootElementExist = document.querySelector<HTMLElement>(
    '#app-container.browsless-element-selector'
  );
  if (rootElementExist) {
    rootElementExist.style.display = 'block';
    return true;
  }
  return false;
};
export const getElementRect = (target: Element | null, withAttributes = false) => {
  if (!target) return {} as Partial<ElementRect>;
  const { x, y, height, width } = target.getBoundingClientRect();
  const result: ElementRect = {
    width: width + 4,
    height: height + 4,
    x: x - 2,
    y: y - 2,
  };
  if (withAttributes) {
    const attributes: Record<string, string> = {};
    Array.from(target.attributes).forEach(({ name, value }) => {
      if (name === 'browsless-el-list') return;
      attributes[name] = value;
    });
    result.attributes = attributes;
    result.tagName = target.tagName;
  }
  return result;
};
export const getElementPath = (el: Node, root: Node = document.documentElement) => {
  const path: Node[] = [el];
  let currentEl: Node | null = el;
  while ((currentEl = currentEl.parentNode) && !currentEl.isEqualNode(root)) {
    path.push(currentEl);
  }
  return path;
};
export const generateXPath = (
  element: Element | null,
  root: Element = document.body
): string | null => {
  if (!element) return null;
  if (element.id !== '') return `id("${element.id}")`;
  if (element === root) return `//${element.tagName}`;
  let ix = 0;
  const siblings = element.parentNode?.childNodes;
  if (!siblings) return null;
  for (let index = 0; index < siblings.length; index += 1) {
    const sibling = siblings[index];
    if (sibling === element) {
      return `${generateXPath(element.parentElement)}/${element.tagName}[${ix + 1}]`;
    }
    if (sibling.nodeType === 1 && (sibling as Element).tagName === element.tagName) {
      ix += 1;
    }
  }
  return null;
};
export const browslessRefDataStr = (varName) => {
  return `
function findData(obj, path) {
  const paths = path.split('.');
  const isWhitespace = paths.length === 1 && !/\\\\S/.test(paths[0]);

  if (path.startsWith('$last') && Array.isArray(obj)) {
    paths[0] = obj.length - 1;
  }

  if (paths.length === 0 || isWhitespace) return obj;
  else if (paths.length === 1) return obj[paths[0]];

  let result = obj;

  for (let i = 0; i < paths.length; i++) {
    if (result[paths[i]] == undefined) {
      return undefined;
    } else {
      result = result[paths[i]];
    }
  }

  return result;
}
function browslessRefData(keyword, path = '') {
  const data = ${varName}[keyword];

  if (!data) return;

  return findData(data, path);
}
  `;
};
const messageTopFrame = (windowCtx: Window): Promise<FrameRect> => {
  return new Promise((resolve) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const messageListener = ({
      data,
    }: MessageEvent<{
      type?: string;
      frameRect?: FrameRect;
    }>) => {
      if (data.type !== 'browsless:the-frame-rect') return;
      if (timeout) clearTimeout(timeout);
      windowCtx.removeEventListener('message', messageListener);
      resolve(data.frameRect ?? null);
    };
    timeout = setTimeout(() => {
      windowCtx.removeEventListener('message', messageListener);
      resolve(null);
    }, 5000);
    windowCtx.addEventListener('message', messageListener);
    windowCtx.top.postMessage({ type: 'browsless:get-frame' }, '*');
  });
};
export const getElementPosition = async (element: Element) => {
  const elWindow = element.ownerDocument.defaultView;
  const isInFrame = elWindow !== window.top;
  const { width, height, x, y } = element.getBoundingClientRect();
  const position = {
    x: x + width / 2,
    y: y + height / 2,
  };
  if (!isInFrame) return position;
  try {
    if (!elWindow) throw new Error('Window not found');
    const frameEl = elWindow.frameElement;
    let frameRect: FrameRect = null;
    if (frameEl) {
      frameRect = frameEl.getBoundingClientRect();
    } else {
      frameRect = await messageTopFrame(elWindow);
      if (!frameRect) throw new Error('Iframe not found');
    }
    position.x += frameRect.x;
    position.y += frameRect.y;
    return position;
  } catch (error) {
    console.error(error);
    return position;
  }
};
