<template>
  <div>
    <shared-codemirror
      :model-value="variables"
      class="h-105"
      :line-numbers="false"
      hide-lang
      readonly
      lang="json"
    />
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue';

const SharedCodemirror = defineAsyncComponent(
  () => import('@/components/dashboard/shared/SharedCodemirror.vue')
);

const props = defineProps({
  currentLog: {
    type: Object,
    default: () => ({}),
  },
});

const variables = computed(() => {
  try {
    return JSON.stringify(props.currentLog?.data?.variables ?? {}, null, 2);
  } catch {
    return '{}';
  }
});
</script>
