<template>
  <div class="ui-popover inline-block" :class="{ hidden: to }">
    <div
      ref="targetEl"
      :class="triggerClass"
      class="ui-popover__trigger inline-block h-full"
    >
      <slot name="trigger" v-bind="{ isShow }"></slot>
    </div>
    <div
      ref="content"
      class="ui-popover__content rounded-lg border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
      :class="[padding]"
    >
      <slot v-bind="{ isShow }"></slot>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, watch, shallowRef, onUnmounted } from 'vue';
import type { Instance, Props as TippyProps } from 'tippy.js';
import createTippy from '@/lib/tippy';

const props = withDefaults(
  defineProps<{
    placement?: string;
    trigger?: string;
    padding?: string;
    to?: string | Element | HTMLElement;
    options?: Partial<TippyProps>;
    disabled?: boolean;
    triggerWidth?: boolean;
    modelValue?: boolean;
    triggerClass?: string | null;
  }>(),
  {
    placement: 'bottom',
    trigger: 'click',
    padding: 'p-4',
    to: '',
    options: () => ({}),
    disabled: false,
    triggerWidth: false,
    modelValue: false,
    triggerClass: null,
  }
);
const emit = defineEmits<{
  show: [event: unknown];
  trigger: [];
  close: [];
  'update:modelValue': [value: boolean];
}>();

const targetEl = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);
const isShow = ref(false);
const instance = shallowRef<Instance | null>(null);

watch(
  () => props.options,
  (value) => {
    instance.value?.setProps(value ?? {});
  },
  { deep: true }
);
watch(
  () => props.disabled,
  (value) => {
    if (value) {
      instance.value?.hide();
      instance.value?.disable();
    } else {
      instance.value?.enable();
    }
  }
);
watch(
  () => props.modelValue,
  (value) => {
    if (value === isShow.value) return;

    isShow.value = value;

    value ? instance.value?.show() : instance.value?.hide();
  }
);

onMounted(() => {
  const target =
    (props.to
      ? typeof props.to === 'string'
        ? document.querySelector(props.to)
        : props.to
      : targetEl.value) ?? undefined;

  instance.value = createTippy(target, {
    role: 'popover',
    theme: null,
    content: content.value ?? undefined,
    placement: props.placement as TippyProps['placement'],
    trigger: props.trigger,
    interactive: true,
    appendTo: () => document.body,
    onShow: (tippyInstance) => {
      if (props.triggerWidth) {
        tippyInstance.popper.style.width = `${
          tippyInstance.reference.getBoundingClientRect().width
        }px`;
      }

      emit('show', tippyInstance);
      isShow.value = true;
    },
    onHide: () => {
      emit('close');
      emit('update:modelValue', false);
      isShow.value = false;
    },
    onTrigger: () => emit('trigger'),
    ...props.options,
  });

  if (props.disabled) {
    instance.value.hide();
    instance.value.disable();
  }
});
onUnmounted(() => {
  instance.value?.destroy();
});
</script>
<style>
.ui-popover.content-full .ui-popover__trigger {
  width: 100%;
}
</style>
