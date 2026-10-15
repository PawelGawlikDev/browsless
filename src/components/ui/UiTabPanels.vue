<template>
  <div class="ui-tab-panels">
    <slot></slot>
  </div>
</template>
<script setup lang="ts">
import { toRefs, provide } from 'vue';
import { uiTabPanelsKey } from './tabs-context';

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    cache?: boolean;
  }>(),
  {
    modelValue: '',
    cache: false,
  }
);

provide(uiTabPanelsKey, toRefs(props));
</script>
