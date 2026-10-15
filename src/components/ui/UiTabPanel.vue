<template>
  <render />
</template>
<script setup lang="ts">
import { inject, h, useSlots } from 'vue';
import { uiTabPanelsKey } from './tabs-context';

const props = withDefaults(
  defineProps<{
    value?: string | number;
    activeClass?: string;
    cache?: boolean;
  }>(),
  {
    value: '',
    activeClass: 'ui-tab-panel--active',
  }
);

const slots = useSlots();
const uiTabPanels = inject(uiTabPanelsKey);
if (!uiTabPanels) throw new Error('UiTabPanel must be used inside UiTabPanels');

const render = () => {
  const isActive = props.value === uiTabPanels.modelValue.value;
  const cache = props.cache || uiTabPanels.cache.value;
  const component = h(
    'div',
    {
      class: [props.activeClass, 'ui-tab-panel'],
      style: {
        display: cache && !isActive ? 'none' : null,
      },
    },
    slots
  );

  if (props.cache || isActive) return component;

  return null;
};
</script>
