<template>
  <vue-flow
    :id="props.id"
    :class="{ disabled: isDisabled }"
    :default-edge-options="{
      type: 'custom',
      updatable: true,
      selectable: true,
      markerEnd: settings.arrow ? MarkerType.ArrowClosed : '',
    }"
  >
    <Background />
    <MiniMap
      v-if="minimap"
      :node-class-name="minimapNodeClassName"
      class="hidden md:block"
    />
    <div
      v-if="editorControls"
      class="absolute left-0 bottom-0 z-10 flex w-full items-center p-4 md:pr-60"
    >
      <slot name="controls-prepend" />
      <editor-search-blocks :editor="editor" />
      <div class="pointer-events-none grow" />
      <slot name="controls-append" />
      <button
        v-tooltip.group="t('workflow.editor.resetZoom')"
        class="control-button mr-2"
        @click="editor.fitView()"
      >
        <v-remixicon name="riFullscreenLine" />
      </button>
      <div class="inline-block rounded-lg bg-white dark:bg-gray-800">
        <button
          v-tooltip.group="t('workflow.editor.zoomOut')"
          class="relative z-10 rounded-lg p-2"
          @click="editor.zoomOut()"
        >
          <v-remixicon name="riSubtractLine" />
        </button>
        <hr class="inline-block h-6 border-r" />
        <button
          v-tooltip.group="t('workflow.editor.zoomIn')"
          class="rounded-lg p-2"
          @click="editor.zoomIn()"
        >
          <v-remixicon name="riAddLine" />
        </button>
      </div>
    </div>
    <template v-for="(node, name) in nodeTypes" :key="name" #[name]="nodeProps">
      <component
        :is="node"
        v-bind="{
          ...nodeProps,
          editor: name === 'node-BlockPackage' ? editor : null,
        }"
        @delete="deleteBlock"
        @settings="initEditBlockSettings"
        @edit="editBlock(nodeProps, $event)"
        @update="updateBlockData(nodeProps.id, $event)"
      />
    </template>
    <template #edge-custom="edgeProps">
      <editor-custom-edge v-bind="edgeProps" />
    </template>
    <ui-modal
      v-model="blockSettingsState.show"
      :title="t('workflow.blocks.base.settings.title')"
      content-class="max-w-xl modal-block-settings"
      @close="clearBlockSettings"
    >
      <edit-block-settings
        :data="blockSettingsState.data"
        @change="updateBlockSettingsData"
      />
    </ui-modal>
  </vue-flow>
</template>
<script setup lang="ts">
import type { DrawflowData } from '@/types/models';
import { onMounted, onBeforeUnmount, watch, computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { VueFlow, useVueFlow, MarkerType, getConnectedEdges } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { MiniMap } from '@vue-flow/minimap';
import cloneDeep from 'lodash.clonedeep';
import { useStore } from '@/stores/main';
import { getBlocks } from '@/utils/getSharedData';
import { categories } from '@/utils/shared';
import EditBlockSettings from './edit/EditBlockSettings.vue';
import EditorCustomEdge from './editor/EditorCustomEdge.vue';
import EditorSearchBlocks from './editor/EditorSearchBlocks.vue';
import '@vue-flow/minimap/dist/style.css';
const props = defineProps({
  id: {
    type: String,
    default: 'editor',
  },
  data: {
    type: Object as () => DrawflowData & { x?: number; y?: number },
    default: (): DrawflowData & { x?: number; y?: number } => ({
      x: 0,
      y: 0,
      zoom: 0,
      nodes: [],
      edges: [],
    }),
  },
  options: {
    type: Object as () => import('@vue-flow/core').FlowProps & { disabled?: boolean },
    default: () => ({}),
  },
  editorControls: {
    type: Boolean,
    default: true,
  },
  minimap: {
    type: Boolean,
    default: true,
  },
  disabled: Boolean,
});
const emit = defineEmits<{
  edit: [data: import('@/types/editor').EditedBlock];
  init: [editor: import('@vue-flow/core').VueFlowStore];
  'update:node': [node: import('@vue-flow/core').GraphNode];
  'delete:node': [nodeId: string];
  'update:settings': [
    data: { settings: Record<string, unknown>; itemId?: string; blockId?: string },
  ];
}>();
const fallbackBlocks: Record<string, string[]> = {
  BlockBasic: ['BlockExportData'],
  BlockBasicWithFallback: ['BlockWebhook'],
};
const isMac = navigator.appVersion.indexOf('Mac') !== -1;
const blockComponents = import.meta.glob<{ default: import('vue').Component }>(
  '../../block/*.vue',
  { eager: true }
);
const nodeTypes = Object.entries(blockComponents).reduce<
  Record<string, import('vue').Component>
>((acc, [key, module]) => {
  const name = key
    .split('/')
    .at(-1)
    ?.replace(/\.vue$/g, '');
  if (!name) return acc;
  const component = module.default;
  if (fallbackBlocks[name]) {
    fallbackBlocks[name].forEach((fallbackBlock) => {
      acc[`node-${fallbackBlock}`] = component;
    });
  }
  acc[`node-${name}`] = component;
  return acc;
}, {});
const setMinValue = (num: number, min: number) => (num < min ? min : num);
const { t } = useI18n();
const store = useStore();
const editor = useVueFlow({
  id: props.id,
  edgeUpdaterRadius: 20,
  deleteKeyCode: 'Delete',
  elevateEdgesOnSelect: true,
  defaultViewport: { x: 0, y: 0, zoom: props.data?.zoom ?? 1 },
  minZoom: setMinValue(+store.settings.editor.minZoom || 0.5, 0.1),
  maxZoom: setMinValue(
    +store.settings.editor.maxZoom || 1.2,
    +store.settings.editor.minZoom + 0.1
  ),
  multiSelectionKeyCode: isMac ? 'Meta' : 'Control',

  ...props.options,
});
editor.onConnect((params) => {
  editor.addEdges([
    {
      ...params,
      class: `source-${params.sourceHandle} target-${params.targetHandle}`,
      updatable: true,
    },
  ]);
});
editor.onEdgeUpdate(({ edge, connection }) => {
  const isBothOutput =
    connection.sourceHandle.includes('output') &&
    connection.targetHandle.includes('output');
  if (isBothOutput) return;
  Object.assign(edge, connection);
});
const blocks = getBlocks();
const settings = store.settings.editor;
const isDisabled = computed(() => props.options.disabled ?? props.disabled);
const blockSettingsState = reactive({
  show: false,
  data: {} as import('@/types/block-editor').BlockSettingsPayload,
});
const initEditBlockSettings = ({
  blockId,
  details,
  data,
  itemId,
}: {
  blockId: string;
  details: { id: string };
  data: import('@/types/block-editor').BlockSettingsPayload['data'];
  itemId?: string;
}) => {
  blockSettingsState.data = {
    itemId,
    blockId,
    id: details.id,
    data: cloneDeep(data),
  };
  blockSettingsState.show = true;
};
const clearBlockSettings = () => {
  Object.assign(blockSettingsState, {
    data: null,
    show: false,
  });
};
const minimapNodeClassName = ({
  label,
}: {
  label?: import('@vue-flow/core').GraphNode['label'];
}) => {
  const blockDetails = typeof label === 'string' ? blocks[label] : undefined;
  if (!blockDetails) return 'gray';
  const { color } = categories[blockDetails.category as keyof typeof categories] || {
    color: 'gray',
  };
  return color;
};
const updateBlockData = (nodeId: string, data: Record<string, unknown> = {}) => {
  if (isDisabled.value) return;
  const node = editor.findNode(nodeId);
  node.data = { ...node.data, ...data };
  emit('update:node', node);
};
const updateBlockSettingsData = (newSettings: Record<string, unknown>) => {
  if (isDisabled.value) return;
  const nodeId = blockSettingsState.data.blockId;
  const node = editor.findNode(nodeId);
  if (blockSettingsState.data.itemId) {
    const index = node.data.blocks.findIndex(
      (item: { itemId: string }) => item.itemId === blockSettingsState.data.itemId
    );
    if (index === -1) return;
    node.data.blocks[index].data = {
      ...node.data.blocks[index].data,
      ...newSettings,
    };
  } else {
    node.data = { ...node.data, ...newSettings };
  }
  emit('update:settings', {
    settings: newSettings,
    itemId: blockSettingsState.data.itemId,
    blockId: blockSettingsState.data.blockId,
  });
};
const editBlock = (
  {
    id,
    label,
    data,
  }: {
    id: string;
    label?: import('@vue-flow/core').GraphNode['label'];
    data?: Record<string, unknown>;
  },
  additionalData = {}
) => {
  if (isDisabled.value) return;
  emit('edit', {
    id: typeof label === 'string' ? label : '',
    blockId: id,
    data: cloneDeep(data),
    ...additionalData,
  });
};
const deleteBlock = (nodeId: string) => {
  if (isDisabled.value) return;
  editor.removeNodes([nodeId]);
  emit('delete:node', nodeId);
};
const onMousedown = (event: MouseEvent) => {
  if (isDisabled.value && event.shiftKey) {
    event.stopPropagation();
    event.preventDefault();
  }
};
const applyFlowData = () => {
  if (settings.snapToGrid) {
    editor.snapToGrid.value = true;
    editor.snapGrid.value = [settings.snapGrid[0] || 20, settings.snapGrid[1] || 20];
  }
  editor.setNodes(props.data?.nodes?.map((node) => ({ ...node, events: {} })) || []);
  editor.setEdges(props.data?.edges || []);
  editor.setViewport({
    x: props.data?.x || 0,
    y: props.data?.y || 0,
    zoom: props.data?.zoom || 1,
  });
};
watch(
  () => props.disabled,
  (value) => {
    const keys = [
      'nodesDraggable',
      'edgesUpdatable',
      'nodesConnectable',
      'elementsSelectable',
    ] as const;
    keys.forEach((key) => {
      editor[key].value = !value;
    });
  },
  { immediate: true }
);
watch(editor.getSelectedNodes, (nodes, _, cleanup) => {
  const connectedEdges = getConnectedEdges(nodes, editor.getEdges.value);
  connectedEdges.forEach((edge) => {
    edge.class = 'connected-edges';
  });
  cleanup(() => {
    connectedEdges.forEach((edge) => {
      edge.class = undefined;
    });
  });
});
onMounted(() => {
  applyFlowData();
  window.addEventListener('mousedown', onMousedown, true);
  emit('init', editor);
});
onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onMousedown, true);
});
</script>
<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

.control-button {
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: white;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.dark .control-button {
  background: rgb(31 41 55);
}
</style>
