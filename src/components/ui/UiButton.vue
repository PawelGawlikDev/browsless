<template>
  <component
    :is="tag"
    role="button"
    class="ui-button relative h-10 transition"
    :class="[
      color ? color : variants[btnType][variant] || variants[btnType].default,
      icon ? 'p-2' : 'py-2 px-4',
      circle ? 'rounded-full' : 'rounded-lg',
      {
        'opacity-70': disabled,
        'pointer-events-none': loading || disabled,
      },
    ]"
    v-bind="{ disabled: loading || disabled, ...$attrs }"
  >
    <span
      class="flex h-full items-center justify-center"
      :class="{ 'opacity-25': loading }"
    >
      <slot></slot>
    </span>
    <div v-if="loading" class="button-loading">
      <ui-spinner
        :color="
          variant === 'primary' || variant === 'accent'
            ? 'text-primary-foreground'
            : variant === 'danger'
              ? 'text-white'
              : 'text-primary'
        "
      ></ui-spinner>
    </div>
  </component>
</template>
<script setup lang="ts">
import UiSpinner from './UiSpinner.vue';

withDefaults(
  defineProps<{
    icon?: boolean;
    disabled?: boolean;
    loading?: boolean;
    circle?: boolean;
    color?: string;
    tag?: string;
    btnType?: 'transparent' | 'fill';
    variant?: 'default' | 'accent' | 'primary' | 'danger';
  }>(),
  {
    color: '',
    tag: 'button',
    btnType: 'fill',
    variant: 'default',
  }
);

const variants: Record<
  'transparent' | 'fill',
  Partial<Record<'default' | 'accent' | 'primary' | 'danger', string>>
> = {
  transparent: {
    default: 'hoverable',
  },
  fill: {
    default: 'bg-input',
    accent: 'ui-action',
    primary: 'ui-action',
    danger:
      'bg-red-400 text-white dark:bg-red-500 dark:hover:bg-red-500 hover:bg-red-400',
  },
};
</script>
<style>
.button-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
