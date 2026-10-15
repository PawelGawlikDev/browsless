<template>
  <button
    :aria-selected="uiTabs.modelValue.value === value"
    :class="[
      uiTabs.type.value,
      {
        'pointer-events-none opacity-75': disabled,
        small: uiTabs.small.value,
        'flex-1': uiTabs.fill.value,
        'is-active': uiTabs.modelValue.value === value,
      },
    ]"
    :tabIndex="uiTabs.modelValue.value === value ? 0 : -1"
    aria-role="tab"
    class="ui-tab z-[1] transition-colors"
    @mouseenter="uiTabs.hoverHandler"
    @click="uiTabs.updateActive(value)"
  >
    <slot></slot>
  </button>
</template>
<script setup lang="ts">
import { inject } from 'vue';
import { uiTabsKey } from './tabs-context';

/* eslint-disable-next-line */
const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    value?: string | number;
  }>(),
  {
    disabled: false,
    value: '',
  }
);

const uiTabs = inject(uiTabsKey);
if (!uiTabs) throw new Error('UiTab must be used inside UiTabs');
</script>
<style scoped>
@reference "../../assets/css/tailwind.css";

.ui-tab {
  z-index: 1;
  @apply py-3 px-2 border-b-2 border-transparent;
}
.ui-tab.small {
  @apply p-2;
}
.ui-tab.fill {
  @apply rounded-lg border-b-0 px-4 py-2;
}
.ui-tab.fill.small {
  @apply p-2;
}
.ui-tab.is-active {
  @apply border-accent text-primary;
}
.ui-tab.is-active.fill {
  background-color: var(--color-selection);
}
</style>
