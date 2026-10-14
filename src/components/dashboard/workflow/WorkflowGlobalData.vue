<template>
  <div class="global-data">
    <p class="text-right" title="Characters limit">
      {{ globalData.length }}/{{ maxLength.toLocaleString() }}
    </p>
    <shared-codemirror
      v-model="globalData"
      style="height: calc(100vh - 10rem)"
      lang="json"
    />
  </div>
</template>
<script setup lang="ts">
import type { Workflow } from '@/types/models';
import { ref, watch, defineAsyncComponent } from 'vue';
import { debounce } from '@/utils/helper';

const SharedCodemirror = defineAsyncComponent(
  () => import('@/components/dashboard/shared/SharedCodemirror.vue')
);

const props = defineProps({
  workflow: {
    type: Object as () => Workflow,
    default: () => ({}),
  },
});
const emit = defineEmits<{
  update: [data: { globalData: string }];
}>();

const maxLength = 1e4;
const globalData = ref(`${props.workflow.globalData}`);

watch(
  globalData,
  debounce((value: string) => {
    let newValue = value;

    if (value.length > maxLength) {
      newValue = value.slice(0, maxLength);
      globalData.value = newValue;
    }

    emit('update', { globalData: newValue });
  }, 250)
);
</script>
