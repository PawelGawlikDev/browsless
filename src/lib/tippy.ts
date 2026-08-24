import tippy, { type Props as TippyProps } from 'tippy.js';
import 'tippy.js/animations/shift-toward-subtle.css';
export const defaultOptions: Partial<TippyProps> = {
  animation: 'shift-toward-subtle',
  theme: 'my-theme',
};
const createTippy = (
  el: Element | null | undefined,
  options: Partial<TippyProps> = {}
) => {
  el?.setAttribute('vtooltip', '');
  const instance = tippy(el as Element, {
    ...defaultOptions,
    ...options,
  });
  return instance;
};
export default createTippy;
