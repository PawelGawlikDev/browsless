<template>
  <div>
    <ui-textarea
      :model-value="data.description"
      :placeholder="t('common.description')"
      class="w-full"
      @change="updateData({ description: $event })"
    />
    <ui-select
      :model-value="data.type"
      :label="t('workflow.blocks.tab-url.select')"
      class="mt-4 w-full"
      @change="updateData({ type: $event })"
    >
      <option v-for="type in types" :key="type" :value="type">
        {{ t(`workflow.blocks.tab-url.types.${type}`) }}
      </option>
    </ui-select>
    <div v-if="data.type === 'all'" class="mt-4 rounded-lg border p-2">
      <p class="text-sm text-gray-600">
        {{ t('workflow.blocks.tab-url.query.title') }}
      </p>
      <ui-input
        :model-value="data.qMatchPatterns"
        class="mt-2 w-full"
        placeholder="https://example.com/*"
        @change="updateData({ qMatchPatterns: $event })"
      >
        <template #label>
          {{ t('workflow.blocks.tab-url.query.matchPatterns') }}
        </template>
      </ui-input>
      <ui-input
        :model-value="data.qTitle"
        :label="t('workflow.blocks.tab-url.query.tabTitle')"
        class="mt-2 w-full"
        @change="updateData({ qTitle: $event })"
      />
    </div>
    <insert-workflow-data :data="data" variables @update="updateData" />
  </div>
</template>
<script setup lang="ts">
import type { TabURLData } from '@/types/block-editor';
import { useI18n } from 'vue-i18n';
import InsertWorkflowData from './InsertWorkflowData.vue';
const props = defineProps({
  data: {
    type: Object as () => TabURLData,
    default: () => ({}),
  },
});
const emit = defineEmits<{ 'update:data': [value: TabURLData] }>();
const types = ['active-tab', 'all'];
const { t } = useI18n();
const updateData = (value: Partial<TabURLData>) => {
  emit('update:data', { ...props.data, ...value });
};
</script>
<style>
.log-data .block-variable {
  margin-top: 4px;
}
</style>
