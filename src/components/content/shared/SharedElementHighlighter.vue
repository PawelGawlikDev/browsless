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
<script setup>
const props = defineProps({
  items: {
    type: Object,
    default: () => ({}),
  },
  stroke: {
    type: String,
    default: null,
  },
  activeStroke: {
    type: String,
    default: null,
  },
  fill: {
    type: String,
    default: null,
  },
  activeFill: {
    type: String,
    default: null,
  },
});
const getNumber = (num) => {
  if (Number.isNaN(num) || !num) return 0;
  return num;
};
const getFillColor = (item) => {
  if (!item) return null;
  if (item.outline) return null;
  return item.highlight ? props.activeFill || props.fill : props.fill;
};
const getStrokeColor = (item) => {
  if (!item) return null;
  return item.highlight ? props.activeStroke || props.stroke : props.stroke;
};
</script>
