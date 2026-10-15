<template>
  <textarea
    v-bind="{ placeholder, maxlength: max }"
    :id="textareaId"
    ref="textarea"
    :value="modelValue"
    class="ui-textarea ui-input bg-input w-full rounded-lg px-4 py-2 transition"
    @input="emitValue"
    @keyup="$emit('keyup', $event)"
    @keydown="$emit('keydown', $event)"
    @focus="$emit('focus', $event)"
    @blur="$emit('blur', $event)"
  ></textarea>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useComponentId } from '@/composable/componentId';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    label?: string;
    placeholder?: string;
    autoresize?: boolean;
    max?: number | string | null;
    block?: boolean;
  }>(),
  {
    modelValue: '',
    label: '',
    placeholder: '',
    autoresize: false,
    max: null,
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  keyup: [event: KeyboardEvent];
  keydown: [event: KeyboardEvent];
}>();
const textareaId = useComponentId('textarea');
const textarea = ref<HTMLTextAreaElement | null>(null);
const calcHeight = () => {
  if (!props.autoresize || !textarea.value) return;
  textarea.value.style.height = 'auto';
  textarea.value.style.height = `${textarea.value.scrollHeight}px`;
};
const emitValue = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) return;
  let { value } = target;
  const maxLength = Math.abs(Number(props.max)) || Infinity;
  if (value.length > maxLength) {
    value = value.slice(0, maxLength);
  }
  emit('update:modelValue', value);
  emit('change', value);
  // calcHeight();
};
onMounted(calcHeight);
</script>
