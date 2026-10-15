<template>
  <component
    :is="tag"
    class="ui-list-item flex w-full items-center rounded-lg transition"
    role="listitem"
    :class="[
      active ? color : 'hoverable',
      small ? 'p-2' : 'py-2 px-4',
      { 'pointer-events-none opacity-75': disabled },
    ]"
  >
    <slot></slot>
  </component>
</template>
<script setup lang="ts">
withDefaults(
  defineProps<{
    active?: boolean;
    disabled?: boolean;
    small?: boolean;
    tag?: string;
    color?: string;
  }>(),
  {
    tag: 'div',
    color: 'ui-selected',
  }
);
</script>
