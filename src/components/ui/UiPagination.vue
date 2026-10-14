<template>
  <div class="flex items-center">
    <ui-button
      v-tooltip="t('components.pagination.prevPage')"
      :disabled="modelValue <= 1"
      icon
      @click="updatePage(modelValue - 1)"
    >
      <v-remixicon name="riArrowLeftSLine" />
    </ui-button>
    <div class="mx-4">
      <input
        ref="inputEl"
        v-tooltip="t('components.pagination.currentPage')"
        :value="modelValue"
        :max="maxPage"
        min="0"
        class="bg-input w-10 appearance-none rounded-lg p-2 text-center transition"
        type="number"
        @click="selectInput"
        @input="inputHandler"
      />
      {{ t('components.pagination.of', { page: maxPage }) }}
    </div>
    <ui-button
      v-tooltip="t('components.pagination.nextPage')"
      :disabled="modelValue >= maxPage"
      icon
      @click="updatePage(modelValue + 1)"
    >
      <v-remixicon rotate="180" name="riArrowLeftSLine" />
    </ui-button>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
const props = withDefaults(
  defineProps<{
    modelValue?: number;
    records?: number;
    perPage?: number;
  }>(),
  {
    modelValue: 1,
    records: 10,
    perPage: 10,
  }
);
const emit = defineEmits<{
  'update:modelValue': [page: number];
  paginate: [page: number];
}>();
const { t } = useI18n();
const inputEl = ref<HTMLInputElement | null>(null);
const maxPage = computed(() => Math.ceil(props.records / props.perPage));
const emitEvent = (page: number) => {
  emit('update:modelValue', page);
  emit('paginate', page);
};
const updatePage = (page: number, element?: HTMLElement) => {
  let currentPage = page;
  if (currentPage > maxPage.value || currentPage < 1) {
    if (!element) return;
    currentPage = currentPage > maxPage.value ? maxPage.value : 1;
  }
  emitEvent(currentPage);
};
const selectInput = (event: Event) => {
  (event.target as HTMLInputElement).select();
};
const inputHandler = (event: Event) => {
  const target = event.target as HTMLInputElement;
  updatePage(+target.value, target);
};
watch(
  () => [props.perPage, props.records],
  () => {
    emitEvent(1);
  }
);
</script>
<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type='number'] {
  -moz-appearance: textfield;
}
</style>
