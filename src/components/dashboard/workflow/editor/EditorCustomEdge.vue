<template>
  <base-edge
    :id="id"
    :style="style"
    :path="path[0]"
    :marker-end="markerEnd"
    :label="label"
    :label-x="path[1]"
    :label-y="path[2]"
    :label-style="{ fill: 'white' }"
    :label-show-bg="true"
    :label-bg-style="{ fill: '#3b82f6' }"
    :label-bg-padding="[2, 4]"
    :label-bg-border-radius="2"
  />
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { BaseEdge, getBezierPath, getSmoothStepPath } from '@vue-flow/core';

const props = withDefaults(
  defineProps<{
    id: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: import('@vue-flow/core').Position;
    targetPosition: import('@vue-flow/core').Position;
    data?: Record<string, unknown>;
    markerEnd?: string;
    label?: import('@vue-flow/core').EdgeProps['label'];
    style?: import('vue').CSSProperties;
  }>(),
  { data: () => ({}), markerEnd: '' }
);

const path = computed(() => {
  const options = {
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  };

  if (props.sourceX > props.targetX) {
    return getSmoothStepPath(options);
  }

  return getBezierPath(options);
});
</script>
<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>
