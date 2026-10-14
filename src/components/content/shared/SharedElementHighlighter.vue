<template>
  <rect
    v-for="(item, index) in items"
    v-bind="{
      x: getNumber(item?.x),
      y: getNumber(item?.y),
      fill: getFillColor(item),
      stroke: getStrokeColor(item),
      width: getNumber(item?.width),
      height: getNumber(item?.height),
      'stroke-dasharray': item?.outline ? '5,5' : null,
    }"
    :key="index"
    stroke-width="2"
  ></rect>
</template>
<script setup lang="ts">
export interface HighlightItem {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  highlight?: boolean;
  outline?: boolean;
}

const props = withDefaults(
  defineProps<{
    items?: HighlightItem[];
    stroke?: string | null;
    activeStroke?: string | null;
    fill?: string | null;
    activeFill?: string | null;
  }>(),
  {
    items: () => [],
    stroke: null,
    activeStroke: null,
    fill: null,
    activeFill: null,
  }
);
const getNumber = (num?: number) => {
  if (num === undefined || Number.isNaN(num) || !num) return 0;
  return num;
};
const getFillColor = (item?: HighlightItem) => {
  if (!item) return null;
  if (item.outline) return null;
  return item.highlight ? props.activeFill || props.fill : props.fill;
};
const getStrokeColor = (item?: HighlightItem) => {
  if (!item) return null;
  return item.highlight ? props.activeStroke || props.stroke : props.stroke;
};
</script>
