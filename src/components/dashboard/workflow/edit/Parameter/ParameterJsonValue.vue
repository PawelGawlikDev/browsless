<template>
  <label>
    <span v-if="!editor" class="ml-1 text-sm text-gray-600 dark:text-gray-200">
      {{ paramData.name }}
    </span>
    <ui-textarea
      :model-value="modelValue"
      type="text"
      class="w-full"
      :placeholder="paramData.placeholder"
      @change="$emit('update:modelValue', $event)"
    />
  </label>
</template>
<script setup lang="ts">
import type { WorkflowParameter } from '@/types/block-editor';
defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  paramData: {
    type: Object as () => Partial<WorkflowParameter>,
    default: () => ({}),
  },
  editor: Boolean,
});
defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>
