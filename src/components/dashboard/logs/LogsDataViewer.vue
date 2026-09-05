<template>
  <shared-codemirror
    :model-value="formattedData"
    :class="editorClass"
    :line-numbers="false"
    hide-lang
    readonly
    lang="json"
  />
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue';

const SharedCodemirror = defineAsyncComponent(
  () => import('@/components/dashboard/shared/SharedCodemirror.vue')
);

const props = defineProps({
  log: {
    type: [Object, Array, String, Number, Boolean],
    default: () => ({}),
  },
  editorClass: {
    type: String,
    default: '',
  },
});

const formattedData = computed(() => {
  try {
    return JSON.stringify(props.log ?? {}, null, 2);
  } catch {
    return String(props.log ?? '');
  }
});
</script>
