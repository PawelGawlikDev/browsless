<template>
  <edit-interaction-base v-bind="{ data }" @change="updateData">
    <ui-checkbox
      :model-value="data.openInNewTab"
      class="mt-4"
      @change="updateData({ openInNewTab: $event })"
    >
      {{ t('workflow.blocks.link.openInNewTab') }}
    </ui-checkbox>
  </edit-interaction-base>
</template>
<script setup lang="ts">
import type { LinkData } from '@/types/block-editor';
import { useI18n } from 'vue-i18n';
import EditInteractionBase from './EditInteractionBase.vue';
const props = defineProps({
  data: {
    type: Object as () => LinkData,
    default: () => ({}),
  },
});
const emit = defineEmits<{ 'update:data': [value: LinkData] }>();
const { t } = useI18n();
const updateData = (value: Partial<LinkData>) => {
  emit('update:data', { ...props.data, ...value });
};
</script>
