<template>
  <block-base
    :id="componentId"
    :data="data"
    :block-id="id"
    :block-data="block"
    class="w-48"
    @delete="$emit('delete', id)"
    @update="$emit('update', $event)"
    @settings="$emit('settings', $event)"
  >
    <Handle :id="`${id}-input-1`" type="target" :position="Position.Left" />
    <div class="mb-2 flex items-center">
      <div
        :class="data.disableBlock ? 'bg-box-transparent' : block.category.color"
        class="text-overflow mr-4 inline-block rounded-lg p-2 text-sm dark:text-black"
      >
        <v-remixicon name="riStopLine" size="20" class="mr-1 inline-block" />
        <span>{{ t('workflow.blocks.loop-breakpoint.name') }}</span>
      </div>
      <div class="grow"></div>
      <v-remixicon
        name="riDeleteBin7Line"
        class="cursor-pointer"
        @click.stop="$emit('delete', id)"
      />
    </div>
    <input
      :value="data.loopId"
      class="bg-input w-full rounded-lg px-4 py-2"
      placeholder="Loop ID"
      type="text"
      required
      @keydown.stop
      @input="handleInput"
    />
    <ui-checkbox
      :model-value="data.clearLoop"
      class="mt-2"
      @change="$emit('update', { clearLoop: $event })"
    >
      Stop loop
    </ui-checkbox>
    <Handle :id="`${id}-output-1`" type="source" :position="Position.Right" />
  </block-base>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Handle, Position } from '@vue-flow/core';
import { useComponentId } from '@/composable/componentId';
import { useEditorBlock } from '@/composable/editorBlock';
import BlockBase from './BlockBase.vue';
import type { BlockNodeData } from '@/types/editor';

const props = withDefaults(
  defineProps<{
    id?: string;
    label?: string;
    data?: BlockNodeData & { loopId?: string; clearLoop?: boolean };
  }>(),
  {
    id: '',
    label: '',
    data: () => ({}),
  }
);
const emit = defineEmits<{
  delete: [id: string];
  update: [payload: Record<string, unknown>];
  settings: [payload: unknown];
}>();
const { t } = useI18n();
const block = useEditorBlock(props.label);
const componentId = useComponentId('block-delay');
const handleInput = (event: Event) => {
  const loopId = (event.target as HTMLInputElement).value.replace(/\s/g, '');
  emit('update', { loopId });
};
</script>
