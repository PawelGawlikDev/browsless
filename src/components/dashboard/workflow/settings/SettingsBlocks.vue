<template>
  <div class="flex items-center">
    <div class="mr-4 flex-1">
      <p>
        {{ t('workflow.settings.blockDelay.title') }}
      </p>
      <p class="text-sm leading-tight text-gray-600 dark:text-gray-200">
        {{ t('workflow.settings.blockDelay.description') }}
      </p>
    </div>
    <ui-input
      :model-value="settings.blockDelay"
      type="number"
      @change="updateSetting('blockDelay', +$event)"
    />
  </div>
  <div class="flex items-center pt-4">
    <div class="mr-4 flex-1">
      <p>
        {{ t('workflow.settings.tabLoadTimeout.title') }}
      </p>
      <p class="text-sm leading-tight text-gray-600 dark:text-gray-200">
        {{ t('workflow.settings.tabLoadTimeout.description') }}
      </p>
    </div>
    <ui-input
      :model-value="settings.tabLoadTimeout"
      type="number"
      min="0"
      max="60000"
      @change="updateSetting('tabLoadTimeout', +$event)"
    />
  </div>
</template>
<script setup lang="ts">
import type { WorkflowSettings } from '@/types/models';
import { useI18n } from 'vue-i18n';
defineProps({
  settings: {
    type: Object as () => Partial<WorkflowSettings>,
    default: () => ({}),
  },
});
const emit = defineEmits<{
  update: [data: { key: string; value: unknown }];
}>();
const { t } = useI18n();
const updateSetting = (key: string, value: string | number | boolean) => {
  emit('update', { key, value });
};
</script>
