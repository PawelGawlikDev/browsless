<template>
  <div :aria-expanded="show" :class="{ [activeClass]: show }" class="ui-expand">
    <button :class="[headerClass, { [headerActiveClass]: show }]" @click="toggleExpand">
      <v-remixicon
        v-if="!hideHeaderIcon && !appendIcon"
        :rotate="show ? 90 : -90"
        name="riArrowLeftSLine"
        class="mr-2 -ml-1 transition-transform"
      />
      <slot v-bind="{ show }" name="header" />
      <v-remixicon
        v-if="appendIcon"
        :rotate="show ? 90 : -90"
        name="riArrowLeftSLine"
        class="-mr-1 ml-2 transition-transform"
      />
    </button>
    <transition-expand>
      <div v-if="show" :class="panelClass" class="ui-expand__panel">
        <slot></slot>
      </div>
    </transition-expand>
  </div>
</template>
<script setup lang="ts">
import { watch, ref } from 'vue';
const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    panelClass?: string;
    headerClass?: string;
    headerActiveClass?: string;
    activeClass?: string;
    hideHeaderIcon?: boolean;
    disabled?: boolean;
    appendIcon?: boolean;
  }>(),
  {
    modelValue: true,
    panelClass: '',
    headerClass: 'px-4 py-2 w-full flex items-center h-full',
    headerActiveClass: '',
    activeClass: '',
    hideHeaderIcon: false,
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();
const show = ref(false);
const toggleExpand = () => {
  if (props.disabled) return;
  show.value = !show.value;
  emit('update:modelValue', show.value);
};
watch(
  () => props.modelValue,
  (value) => {
    if (value === show.value) return;
    show.value = value;
  },
  { immediate: true }
);
watch(
  () => props.disabled,
  () => {
    show.value = false;
  }
);
</script>
