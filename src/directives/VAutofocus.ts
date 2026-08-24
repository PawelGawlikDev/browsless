import type { Directive } from 'vue';

export default {
  mounted(el, { value = true }) {
    if (!value) return;

    requestAnimationFrame(() => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl !== document.body) return;

      (el as HTMLElement).focus();
    });
  },
} as Directive<HTMLElement, boolean>;
