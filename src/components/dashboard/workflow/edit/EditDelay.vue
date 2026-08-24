<template>
  <div class="space-y-2">
    <ui-input
      :model-value="data.time"
      label="Delay time (millisecond)"
      class="w-full"
      type="text"
      @change="updateData({ time: $event })"
    />
  </div>
</template>
<script setup lang="ts">
type DelayData = {
  time?: string | number;
  [key: string]: unknown;
};
const props = defineProps({
  data: {
    type: Object as () => DelayData,
    default: () => ({}),
  },
});
const emit = defineEmits<{
  'update:data': [value: DelayData];
}>();
const updateData = (value: Partial<DelayData>) => {
  emit('update:data', { ...props.data, ...value });
};
</script>
