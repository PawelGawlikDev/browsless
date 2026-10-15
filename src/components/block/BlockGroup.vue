<template>
  <block-base
    :id="componentId"
    :data="data"
    :block-id="id"
    :block-data="block"
    class="w-64"
    content-class="!p-0"
    @edit="$emit('edit')"
    @delete="$emit('delete', id)"
    @update="$emit('update', $event)"
    @settings="$emit('settings', $event)"
  >
    <Handle :id="`${id}-input-1`" type="target" :position="Position.Left" />
    <div class="p-4">
      <div class="mb-2 flex items-center">
        <div
          :class="data.disableBlock ? 'bg-box-transparent' : block.category.color"
          class="mr-4 inline-flex items-center rounded-lg p-2 text-sm dark:text-black"
        >
          <v-remixicon
            :name="block.details.icon || 'riFolderZipLine'"
            size="20"
            class="mr-2 inline-block"
          />
          <span>{{ t('workflow.blocks.blocks-group.name') }}</span>
        </div>
      </div>
      <input
        :value="data.name"
        :placeholder="t('workflow.blocks.blocks-group.groupName')"
        type="text"
        class="w-full bg-transparent"
        @keydown.stop
        @input="handleNameInput"
      />
    </div>
    <draggable
      :model-value="blocks"
      item-key="itemId"
      class="nowheel scroll max-h-60 space-y-1 overflow-auto px-4 pb-4 text-sm"
      @mousedown.stop
      @dragover.prevent
      @drop="handleDrop"
      @update:modelValue="$emit('update', { blocks: $event })"
    >
      <template #item="{ element, index }">
        <div
          class="bg-input group flex items-center space-x-2 rounded-lg p-2"
          style="cursor: grab"
          :data-block-id="element.id"
          @dragstart="onDragStart(element, $event)"
          @dragend="onDragEnd(element.itemId)"
        >
          <v-remixicon
            :name="tasks[element.id as keyof typeof tasks].icon"
            size="20"
            class="shrink-0"
          />
          <div class="flex-1 overflow-hidden leading-tight">
            <p class="text-overflow">
              {{
                getTranslation(
                  `workflow.blocks.${element.id}.name`,
                  tasks[element.id as keyof typeof tasks].name
                )
              }}
            </p>
            <p
              :title="element.data.description"
              class="text-overflow text-gray-600 dark:text-gray-200"
            >
              {{ element.data.description }}
            </p>
          </div>
          <div class="invisible group-hover:visible">
            <v-remixicon
              v-if="workflow?.data?.value.testingMode"
              :class="{
                'text-red-500 dark:text-red-400': element.data.$breakpoint,
              }"
              title="Set as breakpoint"
              name="riRecordCircleLine"
              size="18"
              class="mr-2 inline-block cursor-pointer"
              @click="toggleBreakpoint(element, index)"
            />
            <v-remixicon
              name="riPencilLine"
              size="18"
              class="mr-2 inline-block cursor-pointer"
              @click="editBlock(element)"
            />
            <v-remixicon
              name="riSettings3Line"
              size="18"
              class="mr-2 inline-block cursor-pointer"
              @click="editItemSettings(element)"
            />
            <v-remixicon
              name="riDeleteBin7Line"
              size="18"
              class="inline-block cursor-pointer"
              @click="deleteItem(index, element.itemId)"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div
          class="rounded-lg border border-dashed p-2 text-center text-gray-600 dark:text-gray-200"
        >
          {{ t('workflow.blocks.blocks-group.dropText') }}
        </div>
      </template>
    </draggable>
    <Handle :id="`${id}-output-1`" type="source" :position="Position.Right" />
  </block-base>
</template>
<script setup lang="ts">
import { inject, computed, shallowReactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { nanoid } from 'nanoid';
import { useToast } from 'vue-toastification';
import { Handle, Position } from '@vue-flow/core';
import draggable from 'vuedraggable';
import { tasks, excludeGroupBlocks } from '@/utils/shared';
import { useComponentId } from '@/composable/componentId';
import { useEditorBlock } from '@/composable/editorBlock';
import BlockBase from './BlockBase.vue';
import type { BlockNodeData, WorkflowInjectionContext } from '@/types/editor';

interface GroupBlockItem {
  id: string;
  itemId: string;
  data: BlockNodeData;
}

const props = withDefaults(
  defineProps<{
    id?: string;
    label?: string;
    data?: BlockNodeData & { blocks?: GroupBlockItem[] | Record<string, GroupBlockItem> };
    editor?: Record<string, unknown>;
    events?: Record<string, unknown>;
  }>(),
  {
    id: '',
    label: '',
    data: () => ({}),
    editor: () => ({}),
    events: () => ({}),
  }
);
const emit = defineEmits<{
  update: [payload: Record<string, unknown>];
  delete: [id: string];
  edit: [payload?: GroupBlockItem];
  settings: [payload: unknown];
}>();
const { t, te } = useI18n();
const toast = useToast();
const componentId = useComponentId('blocks-group');
const block = useEditorBlock(props.label);
const workflow = inject('workflow', {}) as WorkflowInjectionContext;
const blocks = computed<GroupBlockItem[]>(() =>
  Array.isArray(props.data.blocks)
    ? props.data.blocks
    : Object.values(props.data.blocks ?? {})
);
const handleNameInput = (event: Event) => {
  emit('update', { name: (event.target as HTMLInputElement).value });
};
const editItemSettings = (element: GroupBlockItem) => {
  emit('settings', {
    blockId: props.id,
    data: element.data,
    itemId: element.itemId,
    details: { id: element.id },
  });
};
const onDragStart = (item: GroupBlockItem, event: DragEvent) => {
  event.dataTransfer?.setData(
    'block',
    JSON.stringify({
      ...((tasks as Record<string, unknown>)[item.id] as Record<string, unknown>),
      ...item,
      fromGroup: true,
    })
  );
};
const onDragEnd = (itemId: string) => {
  setTimeout(() => {
    const blockEl = document.querySelector(`[group-item-id="${itemId}"]`);
    if (blockEl) {
      const blockIndex = blocks.value.findIndex((item) => item.itemId === itemId);
      if (blockIndex !== -1) {
        const copyBlocks = [...(props.data.blocks as GroupBlockItem[])];
        copyBlocks.splice(blockIndex, 1);
        emit('update', { blocks: copyBlocks });
      }
    }
  }, 200);
};
const editBlock = (payload: GroupBlockItem) => {
  emit('edit', payload);
};
const deleteItem = (index: number, itemId: string) => {
  const copyBlocks = [...(props.data.blocks as GroupBlockItem[])];
  if (workflow.editState?.blockData && workflow.editState.blockData.itemId === itemId) {
    workflow.editState.editing = false;
    workflow.editState.blockData = false;
  }
  copyBlocks.splice(index, 1);
  emit('update', { blocks: copyBlocks });
};
const getTranslation = (key: string, defText = '') => {
  return te(key) ? t(key) : defText;
};
const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  const droppedBlock = JSON.parse(event.dataTransfer?.getData('block') || 'null');
  if (!droppedBlock || droppedBlock.fromGroup) return;
  const { id, data, blockId } = droppedBlock;
  if (excludeGroupBlocks.includes(id)) {
    toast.error(
      t('workflow.blocks.blocks-group.cantAdd', {
        blockName: t(`workflow.blocks.${id}.name`),
      })
    );
    return;
  }
  if (blockId) {
    emit('delete', blockId);
  }
  const copyBlocks = [
    ...(props.data.blocks as GroupBlockItem[]),
    shallowReactive({ id, data, itemId: nanoid(5) }),
  ];
  emit('update', { blocks: copyBlocks });
};
const toggleBreakpoint = (item: GroupBlockItem, index: number) => {
  const copyBlocks = [...(props.data.blocks as GroupBlockItem[])];
  copyBlocks[index].data = {
    ...copyBlocks[index].data,
    $breakpoint: !item.data.$breakpoint,
  };
  emit('update', { blocks: copyBlocks });
};
</script>
