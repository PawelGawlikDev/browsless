<template>
  <div role="listbox" class="ui-list" :class="{ 'pointer-events-none': disabled }">
    <slot></slot>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  disabled?: boolean;
}>();
</script>
