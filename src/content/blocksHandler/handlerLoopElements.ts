import { sleep, isXPath } from '@/utils/helper';
import handleSelector from '../handleSelector';
import { generateLoopSelectors, simulateClickElement } from '../utils';
import type { SelectorBlock } from '@/types/migration-helpers';
type LoopElementsContentBlock = {
  id?: string;
  data: SelectorBlock['data'] & {
    $frameSelector?: string;
    loopAttrId?: string;
    index?: number;
    findBy?: string;
    selector?: string;
    actionElMaxWaitTime?: number;
    type?: string;
    scrollToBottom?: boolean;
    actionElSelector?: string;
    onlyClickLink?: boolean;
  };
};
const getScrollParent = (node: Node | null): HTMLElement | null => {
  if (!node) return null;
  const isElement = node instanceof HTMLElement;
  const overflowY = isElement && window.getComputedStyle(node as HTMLElement).overflowY;
  const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';
  if (
    isScrollable &&
    (node as HTMLElement).scrollHeight >= (node as HTMLElement).clientHeight
  ) {
    return node as HTMLElement;
  }
  return (
    getScrollParent(node.parentNode) ||
    (document.scrollingElement as HTMLElement | null) ||
    document.body
  );
};
const excludeSelector = ({
  type,
  selector,
  loopAttr,
}: {
  type?: string;
  selector?: string;
  loopAttr?: string;
}) => {
  if (type === 'cssSelector') {
    return `${selector}:not([browsless-loop*="${loopAttr}"])`;
  }
  return `${selector}[not(contains(@browsless-loop, 'gku9rbk-qje-F'))]`;
};
export default async function ({ data, id }: LoopElementsContentBlock) {
  try {
    let frameSelector = '';
    if (data.$frameSelector) {
      frameSelector = `${data.$frameSelector} |> `;
    }
    const generateItemsSelector = (elements: Iterable<Element>) =>
      generateLoopSelectors(elements, {
        frameSelector,
        attrId: data.loopAttrId ?? '',
        startIndex: (data.index ?? 0) + 1,
      } as Parameters<typeof generateLoopSelectors>[1]);
    const getNewElementsOptions = {
      id,
      data: {
        multiple: true,
        findBy: data.findBy,
        waitForSelector: true,
        waitSelectorTimeout: (data.actionElMaxWaitTime ?? 0) * 1000,
        selector: excludeSelector({
          type: data.findBy,
          selector: data.selector,
          loopAttr: data.loopAttrId,
        }),
      },
    };
    let elements = null;
    if ((data.type ?? '').includes('scroll')) {
      const loopItems = document.querySelectorAll(
        `[browsless-loop*="${data.loopAttrId}"]`
      );
      if (loopItems.length === 0) return { continue: true };
      const scrollableParent = getScrollParent(loopItems[0]);
      if (!scrollableParent) return { continue: true };
      if (data.scrollToBottom) {
        const { scrollHeight } = scrollableParent;
        scrollableParent.scrollTo(0, data.type === 'scroll-up' ? 0 : scrollHeight + 30);
      } else if (data.type === 'scroll-up') {
        const [firstElement] = loopItems;
        firstElement.scrollIntoView();
      } else {
        const lastElement = loopItems[loopItems.length - 1];
        lastElement.scrollIntoView();
      }
      await sleep(500);
      elements = await handleSelector(getNewElementsOptions);
    } else if (['click-element', 'click-link'].includes(data.type ?? '')) {
      const elementForLoad = await handleSelector({
        id,
        data: {
          waitForSelector: true,
          waitSelectorTimeout: 2000,
          selector: data.actionElSelector ?? '',
          findBy: isXPath(data.actionElSelector ?? '') ? 'xpath' : 'cssSelector',
        },
      });
      if (!elementForLoad) return { continue: true };
      const anchorEl = elementForLoad as HTMLAnchorElement;
      if (data.type === 'click-element') {
        simulateClickElement(anchorEl);
        await sleep(500);
        elements = await handleSelector(getNewElementsOptions);
      } else {
        if (data.onlyClickLink) {
          if (anchorEl.tagName !== 'A' || !anchorEl.href) return { continue: true };
          window.location.href = anchorEl.href;
          return {};
        }
        elements = await handleSelector(getNewElementsOptions);
      }
    }
    if (!elements) return { continue: true };
    return generateItemsSelector(elements as Iterable<Element>);
  } catch (error) {
    console.error(error);
    return { continue: true };
  }
}
