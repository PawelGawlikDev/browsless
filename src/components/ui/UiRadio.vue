<template>
  <label class="radio-ui inline-flex items-center">
    <div
      class="relative inline-block h-5 w-5 rounded-full focus-within:ring-2 focus-within:ring-accent"
    >
      <input
        type="radio"
        class="radio-ui__input opacity-0"
        :value="value"
        v-bind="{ checked: isChecked }"
        @change="changeHandler"
      />
      <div
        class="bg-input radio-ui__mark absolute top-0 left-0 cursor-pointer rounded-full border"
      ></div>
    </div>
    <span v-if="$slots.default" class="ml-2 inline-block">
      <slot></slot>
    </span>
  </label>
</template>
<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    value?: string;
  }>(),
  {
    modelValue: '',
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string];
}>();
const isChecked = computed(() => props.value === props.modelValue);
const changeHandler = (event: Event) => {
  const { value } = event.target as HTMLInputElement;
  emit('update:modelValue', value);
  emit('change', value);
};
</script>
<style scoped>
.radio-ui__input:checked ~ .radio-ui__mark {
  border-width: 6px;
  border-color: rgb(var(--color-accent));
}
.radio-ui__mark {
  width: 100%;
  height: 100%;
  transition-property: background-color, border-color;
  transition-timing-function: ease;
  transition-duration: 200ms;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
