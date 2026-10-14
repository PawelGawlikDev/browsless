<template>
  <div class="modal-ui">
    <div v-if="$slots.activator" class="modal-ui__activator">
      <slot name="activator" v-bind="{ open: () => (show = true) }"></slot>
    </div>
    <teleport :to="teleportTo" :disabled="disabledTeleport">
      <transition name="modal" mode="out-in">
        <div
          v-if="show"
          :class="[positions[contentPosition]]"
          class="modal-ui__content-container z-50 flex justify-center overflow-y-auto"
          :style="{ 'backdrop-filter': blur && 'blur(2px)' }"
        >
          <div
            class="absolute h-full w-full bg-black bg-opacity-20 dark:bg-opacity-60"
            style="z-index: -2"
            @click="closeModal"
          />
          <slot v-if="customContent"></slot>
          <ui-card
            v-else
            class="modal-ui__content w-full shadow-lg"
            :padding="padding"
            :class="[contentClass]"
          >
            <div class="modal-ui__content-header mb-4">
              <div class="flex items-center justify-between">
                <span class="content-header">
                  <slot name="header">{{ title }}</slot>
                </span>
                <slot name="header-append" />
                <v-remixicon
                  v-show="!persist"
                  class="cursor-pointer text-gray-600 dark:text-gray-300"
                  name="riCloseLine"
                  size="20"
                  @click="closeModal"
                ></v-remixicon>
              </div>
            </div>
            <slot :close="closeModal"></slot>
          </ui-card>
        </div>
      </transition>
    </teleport>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    teleportTo?: string;
    contentClass?: string;
    title?: string;
    padding?: string;
    contentPosition?: 'center' | 'start';
    customContent?: boolean;
    persist?: boolean;
    blur?: boolean;
    disabledTeleport?: boolean;
  }>(),
  {
    modelValue: false,
    teleportTo: 'body',
    contentClass: 'max-w-lg',
    title: '',
    padding: 'p-4',
    contentPosition: 'center',
  }
);
const emit = defineEmits<{
  close: [value: boolean];
  'update:modelValue': [value: boolean];
}>();

const positions = {
  center: 'items-center',
  start: 'items-start',
};
const show = ref(false);
const toggleBodyOverflow = (value: boolean) => {
  document.body.classList.toggle('overflow-hidden', value);
};
const closeModal = () => {
  if (props.persist) return;
  show.value = false;
  emit('close', false);
  emit('update:modelValue', false);
  toggleBodyOverflow(false);
};
const keyupHandler = ({ code }: KeyboardEvent) => {
  if (code === 'Escape') closeModal();
};
watch(
  () => props.modelValue,
  (value) => {
    show.value = value;
  },
  { immediate: true }
);
watch(show, (value) => {
  if (value) window.addEventListener('keyup', keyupHandler);
  else window.removeEventListener('keyup', keyupHandler);
  toggleBodyOverflow(value);
});
</script>
<style>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-ui__content,
.modal-leave-active .modal-ui__content {
  transition: transform 0.3s ease;
  transform: translateY(0px);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-ui__content,
.modal-leave-to .modal-ui__content {
  transform: translateY(30px);
}

.modal-ui__content-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
