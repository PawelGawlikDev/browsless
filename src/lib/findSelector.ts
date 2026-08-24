import { finder as finderLib } from '@medv/finder';
type FinderOptions = Parameters<typeof finderLib>[1];
const ariaAttrs = ['data-testid'];
export const finder = finderLib;
const findSelector = (element: Element, options: FinderOptions = {}) => {
  let selector = finder(element, {
    tagName: () => true,
    attr: (name, value) => name === 'id' || (ariaAttrs.includes(name) && Boolean(value)),
    ...options,
  });
  const tag = element.tagName.toLowerCase();
  if (!selector.startsWith(tag) && !selector.includes(' ')) {
    selector = `${tag}${selector}`;
  }
  return selector;
};
export default findSelector;
