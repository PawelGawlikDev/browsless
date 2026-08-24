import handleSelector from '../handleSelector';
import type { SelectorBlock } from '@/types/migration-helpers';
type ScrollDirection = 'up' | 'down';
type ElementScrollBlock = SelectorBlock & {
  data: SelectorBlock['data'] & {
    smooth?: boolean;
    scrollIntoView?: boolean;
    incY?: boolean;
    incX?: boolean;
    scrollY?: number;
    scrollX?: number;
  };
};
const isElScrollable = (element: HTMLElement) => {
  const excludedTags = ['SCRIPT', 'STYLE', 'SVG', 'HEAD'];
  const isScrollable =
    element.scrollHeight > element.clientHeight ||
    element.scrollWidth > element.clientWidth;
  const isExcluded =
    element.tagName.includes('-') || excludedTags.includes(element.tagName);
  return isScrollable && !isExcluded;
};
const findScrollableElement = (
  element: HTMLElement = document.documentElement,
  dir: ScrollDirection = 'down',
  maxDepth = 5
): HTMLElement | null => {
  if (maxDepth === 0) return null;
  const isScrollable = isElScrollable(element);
  if (isScrollable) return element;
  if (dir === 'up') {
    const parentEl = element.parentElement;
    if (!parentEl) return null;
    const scrollableElement = findScrollableElement(parentEl, dir, maxDepth - 1);
    if (scrollableElement) return scrollableElement;
  } else {
    for (let index = 0; index < element.childElementCount; index += 1) {
      const currentChild = element.children.item(index);
      const scrollableElement = findScrollableElement(
        currentChild as HTMLElement,
        dir,
        maxDepth - 1
      );
      if (scrollableElement) return scrollableElement;
    }
  }
  return null;
};
const elementScroll = (block: ElementScrollBlock) => {
  const incScrollPos = (
    element: HTMLElement,
    data: ElementScrollBlock['data'],
    vertical = true
  ) => {
    let currentPos = vertical ? element.scrollTop : element.scrollLeft;
    if (data.incY) {
      currentPos += data.scrollY ?? 0;
    } else if (data.incX) {
      currentPos += data.scrollX ?? 0;
    }
    return currentPos;
  };
  return new Promise<string>((resolve, reject) => {
    const { data } = block;
    const behavior: ScrollBehavior = data.smooth ? 'smooth' : 'auto';
    handleSelector(block, {
      onSelected(rawElement) {
        const element = rawElement as HTMLElement;
        if (data.scrollIntoView) {
          element.scrollIntoView({ behavior, block: 'center' });
        } else {
          const scrollableEl =
            findScrollableElement(element, 'up', 3) ||
            findScrollableElement(element, 'down', 3) ||
            element;
          scrollableEl.scroll({
            behavior,
            top: data.incY ? incScrollPos(element, data) : data.scrollY,
            left: data.incX ? incScrollPos(element, data, false) : data.scrollX,
          });
        }
      },
      onError(error) {
        reject(error);
      },
      onSuccess() {
        window.dispatchEvent(new Event('scroll'));
        resolve('');
      },
    });
  });
};
export default elementScroll;
