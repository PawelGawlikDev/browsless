<template>
  <div class="grid grid-cols-2 gap-2">
    <ui-input v-model.number="defaultParams.deltaX" type="number" label="deltaX" />
    <ui-input v-model.number="defaultParams.deltaY" type="number" label="deltaY" />
    <ui-input
      v-model.number="defaultParams.deltaZ"
      type="number"
      class="col-span-2"
      label="deltaZ"
    />
  </div>
</template>
<script setup lang="ts">
import type { TriggerEventParams } from '@/types/block-editor';
import { shallowReactive, watch, onMounted } from 'vue';

const props = defineProps({
  params: {
    type: Object as () => TriggerEventParams,
    default: () => ({}),
  },
});
const emit = defineEmits<{ update: [params: TriggerEventParams] }>();

const defaultParams = shallowReactive({
  deltaX: 0,
  deltaY: 0,
  deltaZ: 0,
});

watch(
  defaultParams,
  (value) => {
    emit('update', value);
  },
  { deep: true }
);

onMounted(() => {
  (Object.keys(defaultParams) as (keyof typeof defaultParams)[]).forEach((key) => {
    const value: unknown = props.params[key];
    if (typeof value === typeof defaultParams[key])
      Object.assign(defaultParams, { [key]: value });
  });
});
</script>
