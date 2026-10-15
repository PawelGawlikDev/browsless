<template>
  <div :class="{ 'inline-block': !block }" class="ui-select cursor-pointer">
    <label
      v-if="label || $slots.label"
      :for="selectId"
      class="ml-1 text-sm text-gray-600 dark:text-gray-200"
    >
      <slot name="label">
        {{ label }}
      </slot>
    </label>
    <div class="ui-select__content relative flex w-full items-center">
      <v-remixicon
        v-if="prependIcon"
        size="20"
        :name="prependIcon"
        class="absolute left-0 ml-2 text-gray-600 dark:text-gray-200"
      />
      <select
        :id="selectId"
        :disabled="disabled"
        :class="{
          'pl-8': prependIcon,
          'opacity-75 pointer-events-none': disabled,
        }"
        :value="modelValue"
        class="bg-input z-10 h-full w-full appearance-none rounded-lg bg-transparent px-4 py-2 pr-10 transition"
        @change="emitValue"
      >
        <option v-if="placeholder" value="" disabled selected>
          {{ placeholder }}
        </option>
        <slot></slot>
      </select>
      <v-remixicon
        size="28"
        name="riArrowDropDownLine"
        class="absolute right-0 mr-2 text-gray-600 dark:text-gray-200"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { useComponentId } from '@/composable/componentId';

interface ModelModifiers {
  number?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    label?: string;
    prependIcon?: string;
    placeholder?: string;
    modelModifiers?: ModelModifiers;
    block?: boolean;
    disabled?: boolean;
    showDetail?: boolean;
  }>(),
  {
    modelValue: '',
    label: '',
    prependIcon: '',
    placeholder: '',
    modelModifiers: () => ({}),
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  change: [value: string | number];
}>();
const selectId = useComponentId('select');
const emitValue = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  let value: string | number = target.value;
  if (props.modelModifiers.number) {
    value = +value;
  }
  emit('update:modelValue', value);
  emit('change', value);
};
</script>
<style>
.ui-select__arrow {
  top: 50%;
  transform: translateY(-50%) rotate(90deg);
}
.ui-select option,
.ui-select optgroup {
  background: rgb(243 244 246);
}

.dark .ui-select option,
.dark .ui-select optgroup {
  background: rgb(55 65 81);
}
</style>
