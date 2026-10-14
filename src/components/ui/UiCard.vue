<template>
  <component
    :is="tag"
    v-bind="$attrs"
    class="ui-card rounded-lg bg-white dark:bg-gray-800"
    :class="[padding, { 'hover:shadow-xl hover:-translate-y-1': hover }]"
  >
    <slot></slot>
  </component>
</template>
<script setup lang="ts">
withDefaults(
  defineProps<{
    hover?: boolean;
    padding?: string;
    tag?: string;
  }>(),
  {
    hover: false,
    padding: 'p-4',
    tag: 'div',
  }
);
</script>
