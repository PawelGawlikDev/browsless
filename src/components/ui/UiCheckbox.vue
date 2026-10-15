<template>
  <label class="checkbox-ui items-center" :class="[block ? 'flex' : 'inline-flex']">
    <div
      :class="{
        'pointer-events-none opacity-75': disabled,
      }"
      class="relative inline-block h-5 w-5 rounded"
    >
      <input
        :class="{ indeterminate }"
        type="checkbox"
        class="checkbox-ui__input opacity-0"
        :value="modelValue"
        v-bind="{ checked: modelValue, disabled }"
        @change="changeHandler"
      />
      <div
        class="bg-input checkbox-ui__mark absolute top-0 left-0 cursor-pointer rounded border dark:border-gray-700"
      >
        <v-remixicon
          :name="indeterminate ? 'riSubtractLine' : 'riCheckLine'"
          size="20"
          class="text-primary-foreground"
        ></v-remixicon>
      </div>
    </div>
    <span v-if="$slots.default" class="ml-2 inline-block">
      <slot></slot>
    </span>
  </label>
</template>
<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    block?: boolean;
  }>(),
  {
    modelValue: false,
    indeterminate: false,
    disabled: undefined,
    block: undefined,
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  change: [value: boolean];
}>();

const changeHandler = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const { checked } = target;
  emit('update:modelValue', checked);
  emit('change', checked);
};
</script>
<style scoped>
.checkbox-ui__input:focus-visible ~ .checkbox-ui__mark {
  outline: 2px solid var(--color-focus);
  outline-offset: 3px;
}

.checkbox-ui__input:checked ~ .checkbox-ui__mark .v-remixicon,
.checkbox-ui__input.indeterminate ~ .checkbox-ui__mark .v-remixicon {
  transform: scale(1) !important;
}
.checkbox-ui .v-remixicon {
  transform: scale(0);
}
.checkbox-ui__input:checked ~ .checkbox-ui__mark,
.checkbox-ui__input.indeterminate ~ .checkbox-ui__mark {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}
.checkbox-ui__mark {
  width: 100%;
  height: 100%;
  transition-property: background-color, border-color;
  transition-timing-function: ease;
  transition-duration: 200ms;
  display: flex;
  align-items: center;
  justify-content: center;
}
.checkbox-ui__mark .v-remixicon {
  transform: scale(0) !important;
  transition: transform 200ms ease;
}
</style>
