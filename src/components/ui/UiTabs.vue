<template>
  <div
    :class="[tabTypes[type] || tabTypes['default'], { [color]: type === 'fill' }]"
    aria-role="tablist"
    class="ui-tabs relative flex items-center space-x-1 text-gray-600 dark:text-gray-200"
    @mouseleave="showHoverIndicator = false"
  >
    <div
      v-show="showHoverIndicator"
      ref="hoverIndicator"
      class="ui-tabs__indicator bg-box-transparent absolute left-0 z-0 rounded-lg"
      style="top: 50%; transform: translate(0, -50%)"
    ></div>
    <slot></slot>
  </div>
</template>
<script setup lang="ts">
import { provide, toRefs, ref, type Ref } from 'vue';

export interface UiTabsContext {
  modelValue: Ref<string | number>;
  type: Ref<'default' | 'fill'>;
  color: Ref<string>;
  small: Ref<boolean>;
  fill: Ref<boolean>;
  updateActive: (id: string | number) => void;
  hoverHandler: (event: MouseEvent) => void;
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    type?: 'default' | 'fill';
    color?: string;
    small?: boolean;
    fill?: boolean;
  }>(),
  {
    modelValue: '',
    type: 'default',
    color: 'bg-box-transparent',
  }
);
const emit = defineEmits<{
  'update:modelValue': [id: string | number];
  change: [id: string | number];
}>();
const tabTypes = {
  default: 'border-b',
  fill: 'p-2 rounded-lg',
};
const hoverIndicator = ref<HTMLElement | null>(null);
const showHoverIndicator = ref(false);
const updateActive = (id: string | number) => {
  emit('change', id);
  emit('update:modelValue', id);
};
const hoverHandler = ({ target }: MouseEvent) => {
  const el = target as HTMLElement;
  const isFill = props.type === 'fill';
  if (!hoverIndicator.value) return;
  if (el.classList.contains('is-active') && isFill) {
    hoverIndicator.value.style.display = 'none';
    return;
  }
  const { height, width } = el.getBoundingClientRect();
  const elHeight = isFill ? height + 3 : height - 11;
  showHoverIndicator.value = true;
  hoverIndicator.value.style.width = `${width}px`;
  hoverIndicator.value.style.height = `${elHeight}px`;
  hoverIndicator.value.style.display = 'inline-block';
  hoverIndicator.value.style.transform = `translate(${el.offsetLeft}px, -50%)`;
};
provide<UiTabsContext>('ui-tabs', {
  updateActive,
  hoverHandler,
  ...toRefs(props),
});
</script>
<style>
.ui-tabs__indicator {
  min-height: 24px;
  min-width: 50px;
  transition-duration: 200ms;
  transition-property: transform, width;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
