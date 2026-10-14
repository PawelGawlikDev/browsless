<template>
  <div class="grid grid-cols-2 gap-2">
    <ui-checkbox
      v-for="item in ['altKey', 'ctrlKey', 'metaKey', 'shiftKey']"
      :key="item"
      v-model="defaultParams[item]"
    >
      {{ item }}
    </ui-checkbox>
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
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
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
