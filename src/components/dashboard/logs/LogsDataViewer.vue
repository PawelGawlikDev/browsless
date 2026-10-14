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

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';

const SharedCodemirror = defineAsyncComponent(
  () => import('@/components/dashboard/shared/SharedCodemirror.vue')
);

const props = withDefaults(
  defineProps<{
    log?: Record<string, unknown> | unknown[] | string | number | boolean;
    editorClass?: string;
  }>(),
  {
    log: () => ({}),
    editorClass: '',
  }
);

const formattedData = computed(() => {
  try {
    return JSON.stringify(props.log ?? {}, null, 2);
  } catch {
    return String(props.log ?? '');
  }
});
</script>
