<template>
  <div>
    <ui-textarea
      :model-value="data.description"
      :placeholder="t('common.description')"
      class="w-full"
      @change="updateData({ description: $event })"
    />
    <ui-input
      :model-value="data.variableName"
      :label="t('workflow.variables.name')"
      :title="t('workflow.variables.name')"
      class="mt-2 w-full"
      @change="updateData({ variableName: $event })"
    />
    <ui-input
      :model-value="data.increaseBy"
      :label="t('workflow.blocks.increase-variable.increase')"
      placeholder="0"
      type="number"
      class="mt-2 w-full"
      @change="updateData({ increaseBy: +$event })"
    />
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
type IncreaseVariableData = {
  description?: string;
  variableName?: string;
  increaseBy?: number;
  [key: string]: unknown;
};
const props = defineProps({
  data: {
    type: Object as () => IncreaseVariableData,
    default: () => ({}),
  },
});
const emit = defineEmits<{
  'update:data': [value: IncreaseVariableData];
}>();
const { t } = useI18n();
const updateData = (value: Partial<IncreaseVariableData>) => {
  emit('update:data', { ...props.data, ...value });
};
</script>
<style>
.log-data .block-variable {
  margin-top: 4px;
}
</style>
