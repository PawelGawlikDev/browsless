<template>
  <div class="input-ui inline-block">
    <label
      v-if="label || $slots.label"
      :for="componentId"
      class="ml-1 inline-block text-sm leading-none text-gray-600 dark:text-gray-200"
    >
      <slot name="label">{{ label }}</slot>
    </label>
    <div class="relative flex w-full items-center">
      <slot name="prepend">
        <v-remixicon
          v-if="prependIcon"
          class="absolute left-0 ml-2 text-gray-600 dark:text-gray-200"
          :name="prependIcon"
        ></v-remixicon>
      </slot>
      <input
        v-bind="{
          readonly: disabled || readonly || null,
          placeholder,
          type,
          autocomplete,
          autofocus,
          min,
          max,
          list,
          step,
        }"
        :id="componentId"
        v-autofocus="autofocus"
        v-imask="mask"
        :class="[
          statusColors[status],
          inputClass,
          {
            'opacity-75 pointer-events-none': disabled,
            'pl-10': prependIcon || $slots.prepend,
            'appearance-none': list,
          },
        ]"
        :value="modelValue"
        class="bg-input w-full rounded-lg py-2 px-4 transition"
        @keydown="$emit('keydown', $event)"
        @keyup="$emit('keyup', $event)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        @input="emitValue"
      />
      <slot name="append" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { IMaskDirective as vImask } from 'vue-imask';
import { useComponentId } from '@/composable/componentId';

interface ModelModifiers {
  lowercase?: boolean;
  number?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelModifiers?: ModelModifiers;
    disabled?: boolean;
    readonly?: boolean;
    autofocus?: boolean;
    modelValue?: string | number | Record<string, unknown>;
    inputClass?: string;
    prependIcon?: string;
    label?: string;
    list?: string | null;
    type?: string;
    placeholder?: string;
    max?: string | number | null;
    min?: string | number | null;
    autocomplete?: string | null;
    step?: string | null;
    mask?: unknown[] | Record<string, unknown> | null;
    status?: string;
    unmaskValue?: boolean;
  }>(),
  {
    modelModifiers: () => ({}),
    disabled: false,
    readonly: false,
    autofocus: false,
    modelValue: '',
    inputClass: '',
    prependIcon: '',
    label: '',
    list: null,
    type: 'text',
    placeholder: '',
    max: null,
    min: null,
    autocomplete: null,
    step: null,
    mask: null,
    status: '',
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  change: [value: string | number];
  keydown: [event: KeyboardEvent];
  blur: [event: FocusEvent];
  keyup: [event: KeyboardEvent];
  focus: [event: FocusEvent];
}>();
const componentId = useComponentId('ui-input');
const statusColors: Record<string, string> = {
  error: 'ring-red-400 ring-2',
};
const emitValue = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  let value: string | number = target.value;
  if (props.mask && props.unmaskValue) {
    const maskRef = 'maskRef' in target ? target.maskRef : undefined;
    if (
      maskRef &&
      typeof maskRef === 'object' &&
      'unmaskedValue' in maskRef &&
      typeof maskRef.unmaskedValue === 'string' &&
      maskRef.unmaskedValue
    ) {
      value = maskRef.unmaskedValue;
    }
  }
  if (props.modelModifiers.lowercase) {
    value = value.toString().toLocaleLowerCase();
  } else if (props.modelModifiers.number) {
    value = +value;
  }
  emit('update:modelValue', value);
  emit('change', value);
};
</script>
<style>
.input-ui input[type='color'] {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
</style>
