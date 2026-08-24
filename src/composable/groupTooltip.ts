import { getCurrentInstance, shallowRef, nextTick, onUnmounted } from 'vue';
import {
  createSingleton,
  type CreateSingletonInstance,
  type Instance,
  type Props,
} from 'tippy.js';
import createTippy, { defaultOptions } from '@/lib/tippy';
type TooltipElement = Element & {
  _tippy?: Instance;
};
type TooltipContext = {
  _tooltipGroup?: Instance[];
  __tpSingleton?: CreateSingletonInstance<Props> | null;
};
export const useGroupTooltip = (
  elements?: TooltipElement[] | null,
  options: Partial<Props> = {}
) => {
  const singleton = shallowRef<CreateSingletonInstance<Props> | null>(null);
  const instance = getCurrentInstance();
  const context = ((
    instance as {
      ctx?: TooltipContext;
    } | null
  )?.ctx || null) as TooltipContext | null;
  nextTick(() => {
    let tippyInstances: Instance[] = [];
    if (Array.isArray(elements)) {
      tippyInstances = elements.map((el) => el._tippy || createTippy(el));
    } else {
      tippyInstances = context?._tooltipGroup || [];
    }
    singleton.value = createSingleton(tippyInstances, {
      ...defaultOptions,
      ...options,
      theme: 'tooltip-theme',
      placement: 'right',
      moveTransition: 'transform 0.2s ease-out',
      overrides: ['placement', 'theme'],
    });
    if (!elements && context) {
      context.__tpSingleton = singleton.value;
    }
  });
  onUnmounted(() => {
    singleton.value?.destroy();
  });
  return singleton;
};
