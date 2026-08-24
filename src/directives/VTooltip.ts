import type { Directive, DirectiveBinding, ComponentPublicInstance } from 'vue';
import createTippy from '@/lib/tippy';
type TooltipOptions = Record<string, unknown>;
type TooltipBinding = DirectiveBinding<string | TooltipOptions>;
type TippyElement = HTMLElement & {
  _tippy?: {
    setProps: (options: Record<string, unknown>) => void;
  };
};
type TooltipInstance = ComponentPublicInstance & {
  _tooltipGroup?: unknown[];
};
const getContent = (content: string | TooltipOptions | null | undefined) => {
  if (typeof content === 'string') {
    return { content };
  }
  if (typeof content === 'object' && content !== null) {
    return content;
  }
  return {};
};
export default {
  mounted(el, { value, arg = 'top', instance, modifiers }: TooltipBinding) {
    const content = getContent(value);
    const tooltip = createTippy(el, {
      ...content,
      theme: 'tooltip-theme',
      placement: arg,
    });
    if (modifiers.group) {
      const tooltipInstance = instance as TooltipInstance | null;
      if (!tooltipInstance) return;
      if (!Array.isArray(tooltipInstance._tooltipGroup)) {
        tooltipInstance._tooltipGroup = [];
      }
      tooltipInstance._tooltipGroup.push(tooltip);
    }
  },
  updated(el, { value, arg = 'top' }: TooltipBinding) {
    const content = getContent(value);
    (el as TippyElement)._tippy?.setProps({
      placement: arg,
      ...content,
    });
  },
} as Directive<HTMLElement, string | TooltipOptions>;
