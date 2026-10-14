<template>
  <shared-codemirror
    :model-value="data.code"
    class="h-full w-full"
    @change="$emit('update:data', { code: $event })"
  />
</template>
<script setup lang="ts">
import type { WorkflowEventAction } from '@/types/block-editor';
import { defineAsyncComponent } from 'vue';

const SharedCodemirror = defineAsyncComponent(
  () => import('@/components/dashboard/shared/SharedCodemirror.vue')
);

defineProps({
  data: {
    type: Object as () => WorkflowEventAction,
    default: () => ({}),
  },
});
defineEmits<{ 'update:data': [data: Partial<WorkflowEventAction>] }>();
</script>
