<template>
  <div class="ui-tab-panels">
    <slot></slot>
  </div>
</template>
<script setup lang="ts">
import { toRefs, provide, type Ref } from 'vue';

export interface UiTabPanelsContext {
  modelValue: Ref<string | number>;
  cache: Ref<boolean>;
}

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

provide<UiTabPanelsContext>('ui-tab-panels', toRefs(props));
</script>
