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

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';

const SharedCodemirror = defineAsyncComponent(
  () => import('@/components/dashboard/shared/SharedCodemirror.vue')
);

const props = withDefaults(
  defineProps<{
    currentLog?: { data?: { variables?: Record<string, unknown> } };
  }>(),
  {
    currentLog: () => ({}),
  }
);

const variables = computed(() => {
  try {
    return JSON.stringify(props.currentLog?.data?.variables ?? {}, null, 2);
  } catch {
    return '{}';
  }
});
</script>
