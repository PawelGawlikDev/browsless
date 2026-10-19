<template>
  <div v-if="workflow" class="flex" style="height: calc(100vh - 40px)">
    <div
      v-if="state.showSidebar && haveEditAccess"
      :class="editState.editing ? 'absolute h-full md:relative z-50' : 'hidden md:flex'"
      class="sidebar w-80 flex-col border-l border-gray-100 bg-white py-6 dark:border-gray-700 dark:border-opacity-50 dark:bg-gray-800"
      :style="{
        width: `${sidebarCss.width}px`,
        padding: sidebarCss.padding,
        position: 'relative',
      }"
    >
      <workflow-edit-block
        v-if="editState.editing"
        :data="editState.blockData"
        :workflow="workflow"
        :editor="editor"
        @update="updateBlockData"
        @close="closeEditingCard"
      />
      <workflow-details-card v-else :workflow="workflow" @update="updateWorkflow" />
      <!-- drag-element -->
      <div ref="sidebarRef" class="custom-drag" @mousedown="startDrag"></div>
    </div>
    <div class="relative flex-1 overflow-auto">
      <div
        class="pointer-events-none absolute left-0 top-0 z-10 flex w-full items-center p-4"
      >
        <ui-card
          v-if="!haveEditAccess"
          padding="px-2 mr-4"
          class="flex items-center overflow-hidden"
          style="min-width: 150px; height: 48px"
        >
          <span class="inline-block">
            <ui-img
              v-if="workflow.icon.startsWith('http')"
              :src="workflow.icon"
              class="h-8 w-8"
            />
            <v-remixicon v-else :name="workflow.icon" size="26" />
          </span>
          <div class="ml-2 max-w-sm">
            <p
              :class="{ 'text-lg': !workflow.description }"
              class="text-overflow font-semibold leading-tight"
            >
              {{ workflow.name }}
            </p>
            <p
              :class="{ 'text-sm': workflow.description }"
              class="text-overflow leading-tight text-gray-600 dark:text-gray-200"
            >
              {{ workflow.description }}
            </p>
          </div>
        </ui-card>
        <ui-tabs
          :model-value="isPackage ? state.activeTab : 'editor'"
          class="pointer-events-auto h-full space-x-1 rounded-lg border-none bg-white px-2 dark:bg-gray-800"
          @change="onTabChange"
        >
          <button
            v-if="haveEditAccess"
            v-tooltip="
              `${t('workflow.toggleSidebar')} (${
                shortcut['editor:toggle-sidebar'].readable
              })`
            "
            style="margin-right: 6px"
            @click="toggleSidebar"
          >
            <v-remixicon :name="state.showSidebar ? 'riSideBarFill' : 'riSideBarLine'" />
          </button>
          <ui-tab value="editor">{{ t('common.editor') }}</ui-tab>
          <template v-if="isPackage">
            <ui-tab value="package-details"> Details </ui-tab>
            <ui-tab value="package-settings">
              {{ t('common.settings') }}
            </ui-tab>
          </template>
          <ui-tab v-else value="logs" class="flex items-center">
            {{ t('common.log', 2) }}
            <span
              v-if="workflowStates.length > 0"
              class="ml-2 inline-block rounded-full bg-accent p-1 text-center text-xs text-white dark:text-black"
              style="min-width: 25px"
            >
              {{ workflowStates.length }}
            </span>
          </ui-tab>
        </ui-tabs>
        <div class="pointer-events-none grow" />
        <editor-used-credentials v-if="editor" :editor="editor" />
        <template v-if="isPackage">
          <ui-button
            v-if="workflow.isExternal"
            v-tooltip="t('workflow.previewMode.description')"
            class="pointer-events-auto cursor-default"
          >
            <v-remixicon name="riEyeLine" class="mr-2 -ml-1" />
            <span>{{ t('workflow.previewMode.title') }}</span>
          </ui-button>
          <editor-pkg-actions
            v-else
            :editor="editor"
            :data="workflow"
            :is-data-changed="state.dataChanged"
            @update="onActionUpdated"
          />
        </template>
        <editor-local-actions
          v-else
          :editor="editor"
          :workflow="workflow"
          :is-data-changed="state.dataChanged"
          :is-package="isPackage"
          :can-edit="haveEditAccess"
          @update="onActionUpdated"
          @permission="checkWorkflowPermission"
          @modal="((modalState.name = $event), (modalState.show = true))"
        />
      </div>
      <ui-tab-panels
        v-model="state.activeTab"
        :class="{ 'overflow-hidden': !state.activeTab.startsWith('package') }"
        class="h-full w-full"
        @drop="onDropInEditor"
        @dragend="clearHighlightedElements"
        @dragover.prevent="onDragoverEditor"
      >
        <template v-if="isPackage">
          <ui-tab-panel value="package-details" class="container pt-24">
            <package-details :data="workflow as SavedPackage" @update="updateWorkflow" />
          </ui-tab-panel>
          <ui-tab-panel value="package-settings" class="container pt-24">
            <package-settings
              :data="workflow as SavedPackage"
              :editor="editor"
              @update="updateWorkflow"
              @goBlock="goToPkgBlock"
            />
          </ui-tab-panel>
        </template>
        <ui-tab-panel cache value="editor" class="w-full" @keydown="onKeydown">
          <editor-debugging
            v-if="workflow.testingMode && workflowStates.length > 0"
            :states="workflowStates"
            @goToBlock="goToBlock"
          />
          <workflow-editor
            v-if="state.workflowConverted"
            :id="workflowId"
            :data="editorData"
            :disabled="!haveEditAccess"
            :class="{ 'animate-blocks': state.animateBlocks }"
            class="workflow-editor focus:outline-none"
            style="height: calc(100vh - 40px)"
            tabindex="0"
            @init="onEditorInit"
            @edit="initEditBlock"
            @update:node="state.dataChanged = true"
            @delete:node="state.dataChanged = true"
            @update:settings="onUpdateBlockSettings"
          >
            <template v-if="haveEditAccess" #controls-prepend>
              <ui-card padding="p-0 ml-2 undo-redo">
                <button
                  v-tooltip.group="
                    `${t('workflow.undo')} (${getReadableShortcut('mod+z')})`
                  "
                  :disabled="!commandManager.state.value.canUndo"
                  class="rounded-lg p-2 transition-colors"
                  @click="executeCommand('undo')"
                >
                  <v-remixicon name="riArrowGoBackLine" />
                </button>
                <button
                  v-tooltip.group="
                    `${t('workflow.redo')} (${getReadableShortcut('mod+shift+z')})`
                  "
                  :disabled="!commandManager.state.value.canRedo"
                  class="rounded-lg p-2 transition-colors"
                  @click="executeCommand('redo')"
                >
                  <v-remixicon name="riArrowGoForwardLine" />
                </button>
              </ui-card>
              <button
                v-if="!isPackage && haveEditAccess"
                v-tooltip="t('packages.open')"
                class="control-button hoverable ml-2"
                @click="blockFolderModal.showList = !blockFolderModal.showList"
              >
                <v-remixicon name="mdiPackageVariantClosed" />
              </button>
              <button
                v-tooltip="t('workflow.autoAlign.title')"
                class="control-button hoverable ml-2"
                @click="autoAlign"
              >
                <v-remixicon name="riMagicLine" />
              </button>
            </template>
          </workflow-editor>
          <editor-local-saved-blocks
            v-if="blockFolderModal.showList"
            @close="blockFolderModal.showList = false"
          />
          <editor-local-ctx-menu
            v-if="editor"
            :editor="editor"
            :is-package="isPackage"
            :package-io="(workflow.settings as { asBlock?: boolean })?.asBlock"
            @group="groupBlocks"
            @ungroup="ungroupBlocks"
            @packageIo="addPackageIO"
            @recording="startRecording"
            @copy="copySelectedElements"
            @paste="pasteCopiedElements"
            @saveBlock="initBlockFolder"
            @duplicate="duplicateElements"
          />
        </ui-tab-panel>
      </ui-tab-panels>
    </div>
  </div>
  <ui-modal
    v-model="modalState.show"
    :content-class="activeWorkflowModal?.width || 'max-w-xl'"
    v-bind="activeWorkflowModal.attrs || {}"
  >
    <template v-if="activeWorkflowModal.title" #header>
      {{ activeWorkflowModal.title }}
      <router-link
        v-if="activeWorkflowModal.docs"
        :title="t('common.docs')"
        :to="activeWorkflowModal.docs"
        class="inline-block align-middle"
      >
        <v-remixicon name="riInformationLine" size="20" />
      </router-link>
    </template>
    <component
      :is="activeWorkflowModal.component"
      v-bind="{ workflow }"
      v-on="activeWorkflowModal?.events || {}"
      @update="updateWorkflow"
      @close="modalState.show = false"
    />
  </ui-modal>
  <shared-permissions-modal
    v-model="permissionState.showModal"
    :permissions="permissionState.items"
    @granted="registerTrigger"
  />
  <ui-modal v-model="blockFolderModal.showModal" :title="t('packages.set')">
    <editor-add-package
      :data="{
        name: blockFolderModal.name,
        description: blockFolderModal.description,
        icon: blockFolderModal.icon,
      }"
      @update="Object.assign(blockFolderModal, $event)"
      @cancel="clearBlockFolderModal"
      @add="saveBlockToFolder"
    />
  </ui-modal>
</template>
<script setup lang="ts">
import PackageDetails from '@/components/dashboard/package/PackageDetails.vue';
import PackageSettings from '@/components/dashboard/package/PackageSettings.vue';
import SharedPermissionsModal from '@/components/dashboard/shared/SharedPermissionsModal.vue';
import EditorAddPackage from '@/components/dashboard/workflow/editor/EditorAddPackage.vue';
import EditorDebugging from '@/components/dashboard/workflow/editor/EditorDebugging.vue';
import EditorLocalActions from '@/components/dashboard/workflow/editor/EditorLocalActions.vue';
import EditorLocalCtxMenu from '@/components/dashboard/workflow/editor/EditorLocalCtxMenu.vue';
import EditorLocalSavedBlocks from '@/components/dashboard/workflow/editor/EditorLocalSavedBlocks.vue';
import EditorPkgActions from '@/components/dashboard/workflow/editor/EditorPkgActions.vue';
import EditorUsedCredentials from '@/components/dashboard/workflow/editor/EditorUsedCredentials.vue';
import WorkflowDataTable from '@/components/dashboard/workflow/WorkflowDataTable.vue';
import WorkflowDetailsCard from '@/components/dashboard/workflow/WorkflowDetailsCard.vue';
import WorkflowEditBlock from '@/components/dashboard/workflow/WorkflowEditBlock.vue';
import WorkflowEditor from '@/components/dashboard/workflow/WorkflowEditor.vue';
import WorkflowGlobalData from '@/components/dashboard/workflow/WorkflowGlobalData.vue';
import WorkflowSettings from '@/components/dashboard/workflow/WorkflowSettings.vue';
import { useCommandManager } from '@/composable/commandManager';
import { useGroupTooltip } from '@/composable/groupTooltip';
import {
  getExtensionStorageValue,
  setExtensionStorageValue,
} from '@/lib/extensionStorage';
import { getReadableShortcut, getShortcut, useShortcut } from '@/composable/shortcut';
import dbStorage from '@/db/storage';
import emitter from '@/lib/mitt';
import startRecordWorkflow from '@/dashboard/utils/startRecordWorkflow';
import RendererWorkflowService from '@/service/renderer/RendererWorkflowService';
import { usePackageStore, type PackageStoreInstance } from '@/stores/package';
import { useWorkflowStore, type WorkflowStoreInstance } from '@/stores/workflow';
import convertWorkflowData from '@/utils/convertWorkflowData';
import DroppedNode from '@/utils/editor/DroppedNode';
import extractAutocopmleteData from '@/utils/editor/editorAutocomplete';
import EditorCommands from '@/utils/editor/EditorCommands';
import { getBlocks } from '@/utils/getSharedData';
import { debounce, getActiveTab, parseJSON } from '@/utils/helper';
import { excludeGroupBlocks } from '@/utils/shared';
import { getWorkflowPermissions } from '@/utils/workflowData';
import { registerWorkflowTrigger } from '@/utils/workflowTrigger';
import { getWorkflowDocsPath } from '@/docs';
import functions from '@/workflowEngine/templating/templatingFunctions';
import { useHead } from '@vueuse/head';
import dagre from 'dagre';
import defu from 'defu';
import cloneDeep from 'lodash.clonedeep';
import { customAlphabet } from 'nanoid';
import {
  computed,
  markRaw,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  provide,
  reactive,
  ref,
  shallowRef,
  watch,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { browser } from 'wxt/browser';
import type { VueFlowStore, GraphNode, EdgeChange, NodeChange } from '@vue-flow/core';
import type {
  Workflow,
  WorkflowNode,
  WorkflowDataColumn,
  PackageIoItem,
  DrawflowData,
  SavedPackage,
} from '@/types/models';
import type { DbStorageTableItem } from '@/types/db';
import type { WorkflowOrPackage } from '@/types/editor';

interface EditingBlockData extends Record<string, unknown> {
  id?: string;
  blockId?: string;
  itemId?: string;
  data?: Record<string, unknown>;
  connections?: { id: string; name: string }[];
  editComponent?: unknown;
  name?: string;
}
interface ModalDef {
  icon?: string;
  width?: string;
  component?: unknown;
  title?: string;
  docs?: string;
  events?: Record<string, (...args: unknown[]) => void>;
  attrs?: Record<string, unknown>;
}

const blocks = getBlocks();
let editorCommands: EditorCommands | null = null;
const executeCommandTimeout: ReturnType<typeof setTimeout> | null = null;
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 7);
useGroupTooltip();
const { t, te } = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const packageStore = usePackageStore() as PackageStoreInstance;
const workflowStore = useWorkflowStore() as WorkflowStoreInstance;
const commandManager = useCommandManager();
const workflowId = route.params.id as string;
const isPackage = route.name === 'packages-details';
const funcsAutocomplete = Object.keys(functions).reduce<Record<string, string>>(
  (acc, name) => {
    acc[`$${name}`] = '';
    return acc;
  },
  {}
);
const editor = shallowRef<VueFlowStore | null>(null);
const connectedTable = shallowRef<DbStorageTableItem | null>(null);
const sidebarRef = ref<HTMLElement | null>(null);
const sidebarCss = reactive({
  width: 360,
  padding: '20px',
  isDragging: false,
  startX: 0,
  startWidth: 0,
});
const drag = (event: MouseEvent) => {
  if (sidebarCss.isDragging) {
    const diffX = event.clientX - sidebarCss.startX;
    sidebarCss.width = Math.max(360, sidebarCss.startWidth + diffX); // min-width : 360px,max-width: 30%
  }
};
const stopDrag = () => {
  sidebarCss.isDragging = false;
  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', stopDrag);
};
const startDrag = (event: MouseEvent) => {
  sidebarCss.isDragging = true;
  sidebarCss.startX = event.clientX;
  sidebarCss.startWidth = sidebarCss.width;
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
};
const state = reactive({
  showSidebar: true,
  sidebarState: true,
  dataChanged: false,
  animateBlocks: false,
  isExecuteCommand: false,
  workflowConverted: false,
  activeTab: (route.query.tab as string) || 'editor',
});
const blockFolderModal = reactive<{
  name: string;
  icon: string;
  nodes: WorkflowNode[];
  description: string;
  showList: boolean;
  showModal: boolean;
  asBlock: boolean;
}>({
  name: '',
  icon: '',
  nodes: [],
  description: '',
  showList: false,
  showModal: false,
  asBlock: false,
});
const permissionState = reactive<{ items: string[]; showModal: boolean }>({
  items: [],
  showModal: false,
});
const modalState = reactive<{ name: string; show: boolean }>({
  name: '',
  show: false,
});
const editState = reactive<{ blockData: EditingBlockData; editing: boolean }>({
  blockData: {},
  editing: false,
});
const autocompleteState = reactive<{
  blocks: Record<string, Record<string, unknown>>;
  common: { globalData?: unknown; variables?: Record<string, unknown> };
}>({
  blocks: {},
  common: {},
});
const workflowPayload: { data: Record<string, unknown>; isUpdating: boolean } = {
  data: {},
  isUpdating: false,
};
const workflowModals: Record<string, ModalDef> = {
  table: {
    icon: 'riKey2Line',
    width: 'max-w-2xl',
    component: WorkflowDataTable,
    title: t('workflow.table.title'),
    docs: getWorkflowDocsPath('table'),
    events: {
      connect: fetchConnectedTable,
      disconnect() {
        connectedTable.value = null;
      },
    },
  },
  'global-data': {
    width: 'max-w-2xl',
    icon: 'riDatabase2Line',
    component: WorkflowGlobalData,
    title: t('common.globalData'),
    docs: getWorkflowDocsPath('global-data'),
  },
  settings: {
    width: 'max-w-2xl',
    icon: 'riSettings3Line',
    component: WorkflowSettings,
    title: t('common.settings'),
    docs: getWorkflowDocsPath('settings'),
    attrs: {
      customContent: true,
    },
    events: {
      close() {
        modalState.show = false;
        modalState.name = '';
      },
    },
  },
};
const autocompleteList = computed(() => {
  const autocompleteData: Record<string, unknown> = {
    loopData: {},
    table: {},
    ...funcsAutocomplete,
    globalData: autocompleteState.common.globalData,
    variables: { ...autocompleteState.common.variables },
  };
  Object.values(autocompleteState.blocks).forEach((item) => {
    if (item.loopData) Object.assign(autocompleteData.loopData as object, item.loopData);
    if (item.variables)
      Object.assign(autocompleteData.variables as object, item.variables);
  });
  return autocompleteData;
});
const haveEditAccess = computed(() => {
  return true;
});
const workflow = computed<WorkflowOrPackage | undefined>(() => {
  if (isPackage) {
    return packageStore.getById(workflowId);
  }
  return workflowStore.getById(workflowId);
});
const workflowStates = computed(() => workflowStore.getWorkflowStates(workflowId));
const activeWorkflowModal = computed(() => workflowModals[modalState.name] || {});
const workflowColumns = computed<WorkflowDataColumn[]>(() => {
  if (connectedTable.value) {
    return connectedTable.value.columns;
  }
  return (workflow.value as { table?: WorkflowDataColumn[] })?.table || [];
});
const editorData = computed<DrawflowData | undefined>(() => {
  if (isPackage) return workflow.value?.data;
  return (workflow.value as { drawflow?: DrawflowData })?.drawflow;
});
const updateBlockData = debounce((data: Record<string, unknown>) => {
  if (!haveEditAccess.value) return;
  const node = editor.value?.getNode.value(editState.blockData.blockId as string);
  if (!node) return;
  const dataCopy = JSON.parse(JSON.stringify(data));
  let autocompleteId = '';
  if (editState.blockData.itemId) {
    const itemIndex = node.data.blocks.findIndex(
      ({ itemId }: { itemId: string }) => itemId === editState.blockData.itemId
    );
    if (itemIndex !== -1) {
      node.data.blocks[itemIndex].data = dataCopy;
      autocompleteId = editState.blockData.itemId as string;
    }
  } else {
    node.data = dataCopy;
    autocompleteId = editState.blockData.blockId as string;
  }
  if (autocompleteState.blocks[autocompleteId]) {
    const { id, blockId } = editState.blockData;
    Object.assign(
      autocompleteState.blocks,
      extractAutocopmleteData(id as string, { data, id: blockId })
    );
  }
  editState.blockData.data = data;
  state.dataChanged = true;
}, 250);
const onEdgesChange = debounce((changes: EdgeChange[]) => {
  changes.forEach((change) => {
    const { type } = change;
    const item = 'item' in change ? change.item : undefined;
    if (
      type === 'add' &&
      item?.sourceHandle?.includes('output') &&
      item?.targetHandle?.includes('output')
    ) {
      editor.value?.removeEdges([item.id]);
      return;
    }
    if (state.dataChanged) return;
    state.dataChanged = type !== 'select';
  });
}, 250);
const onTabChange = (tabVal: string | number) => {
  if (tabVal === 'logs') {
    emitter.emit('ui:logs', {
      workflowId,
      show: true,
    });
    return;
  }
  state.activeTab = tabVal as string;
};
const onUpdateBlockSettings = ({
  blockId,
  itemId,
  settings,
}: {
  blockId: string;
  itemId?: string;
  settings: Record<string, unknown>;
}) => {
  state.dataChanged = true;
  if (!editState.editing) return;
  if (itemId && itemId !== editState.blockData.itemId) return;
  if (editState.blockData.blockId !== blockId) return;
  editState.blockData.data = { ...editState.blockData.data, ...settings };
};
const closeEditingCard = () => {
  editState.editing = false;
  editState.blockData = {};
  state.showSidebar = state.sidebarState;
};
const executeFromBlock = async (blockId: string) => {
  try {
    if (!blockId) return;
    const workflowOptions: { blockId: string; tabId?: number } = { blockId };
    let tab = await getActiveTab();
    if (!tab) {
      [tab] = await browser.tabs.query({ active: true, url: '*://*/*' });
    }
    if (tab) {
      workflowOptions.tabId = tab.id;
    }
    RendererWorkflowService.executeWorkflow(
      workflow.value as Record<string, unknown>,
      workflowOptions
    );
  } catch (error) {
    console.error(error);
  }
};
const startRecording = ({
  nodeId,
  handleId,
}: {
  nodeId?: string | null;
  handleId?: string | null;
}) => {
  if (state.dataChanged) {
    alert('Make sure to save the workflow before starting recording');
    return;
  }
  const options = {
    workflowId,
    name: workflow.value?.name,
    connectFrom: {
      id: nodeId,
      output: handleId,
    },
  };
  startRecordWorkflow(options).then(() => {
    state.dataChanged = false;
    router.replace('/recording');
  });
};
const goToBlock = (blockId: string) => {
  if (!editor.value) return;
  const block = editor.value.getNode.value(blockId);
  if (!block) return;
  editor.value.addSelectedNodes([block]);
  setTimeout(() => {
    const editorContainer = document.querySelector('.vue-flow');
    if (!editorContainer || !editor.value) return;
    const { height, width } = editorContainer.getBoundingClientRect();
    const { x, y } = block.position;
    editor.value.setTransform({
      y: -(y - height / 2),
      x: -(x - width / 2) - 200,
      zoom: 1,
    });
  }, 200);
};
const goToPkgBlock = (blockId: string) => {
  state.activeTab = 'editor';
  goToBlock(blockId);
};
const addPackageIO = ({
  type,
  handleId,
  nodeId,
}: {
  type: 'inputs' | 'outputs';
  handleId: string;
  nodeId: string;
}) => {
  const copyPkgIO = [
    ...((workflow.value as Record<string, unknown>)[type] as PackageIoItem[]),
  ];
  const itemExist = copyPkgIO.some(
    (io) => io.blockId === nodeId && handleId === io.handleId
  );
  if (itemExist) {
    toast.error(`You already add this as an ${type.slice(0, -1)}`);
    return;
  }
  copyPkgIO.push({
    handleId,
    name: '',
    id: nanoid(),
    blockId: nodeId,
  });
  updateWorkflow({ [type]: copyPkgIO });
};
const initBlockFolder = ({ nodes }: { nodes: GraphNode[] }) => {
  Object.assign(blockFolderModal, {
    nodes: nodes.map((node) => ({ ...node, label: String(node.label) })),
    showModal: true,
  });
};
const clearBlockFolderModal = () => {
  Object.assign(blockFolderModal, {
    name: '',
    nodes: [],
    asBlock: false,
    description: '',
    showModal: false,
    icon: 'mdiPackageVariantClosed',
  });
};
const saveBlockToFolder = async () => {
  try {
    if (!editor.value) return;
    const seen = new Set<string>();
    const nodeList = [
      ...editor.value.getSelectedNodes.value,
      ...blockFolderModal.nodes,
    ].reduce<WorkflowNode[]>((acc, node) => {
      if (seen.has(node.id)) return acc;
      const { label, data, position, id, type } = node as unknown as WorkflowNode;
      acc.push(cloneDeep({ label, data, position, id, type }));
      seen.add(node.id);
      return acc;
    }, []);
    const edges = editor.value.getSelectedEdges.value.map(
      ({ source, target, targetHandle, sourceHandle, id }) =>
        cloneDeep({ id, source, target, targetHandle, sourceHandle })
    );
    packageStore.insert({
      data: { nodes: nodeList, edges },
      name: blockFolderModal.name || 'unnamed',
      description: blockFolderModal.description,
      asBlock: blockFolderModal?.asBlock ?? false,
      icon: blockFolderModal.icon || 'mdiPackageVariantClosed',
    });
    clearBlockFolderModal();
  } catch (error) {
    console.error(error);
  }
};
const groupBlocks = ({
  position,
}: {
  position?: { clientX: number; clientY: number };
}) => {
  if (!editor.value || !position) return;
  const nodesToDelete: GraphNode[] = [];
  const nodes = editor.value.getSelectedNodes.value;
  const groupBlocksList = nodes.reduce<{ id: string; itemId: string; data: unknown }[]>(
    (acc, node) => {
      if (excludeGroupBlocks.includes(node.label as string)) return acc;
      acc.push({
        id: node.label as string,
        itemId: node.id,
        data: node.data,
      });
      nodesToDelete.push(node);
      return acc;
    },
    []
  );
  if (groupBlocksList.length === 0) return;
  editor.value.removeNodes(nodesToDelete);
  const { component, data } = blocks['blocks-group'];
  editor.value.addNodes([
    {
      id: nanoid(),
      type: component,
      label: 'blocks-group',
      data: { ...data, blocks: groupBlocksList },
      position: editor.value.project({
        x: position.clientX - 360,
        y: position.clientY,
      }),
    },
  ]);
};
const ungroupBlocks = ({ nodes }: { nodes: GraphNode[] }) => {
  const [node] = nodes;
  if (!node || node.label !== 'blocks-group') return;
  const edges: import('@vue-flow/core').Edge[] = [];
  const position = { ...node.position };
  const copyBlocks = cloneDeep(node.data?.blocks || []) as {
    id: string;
    itemId?: string;
    data: Record<string, unknown>;
    label?: string;
    position?: { x: number; y: number };
    type?: string;
  }[];
  const groupBlocksList = copyBlocks.map((item, index) => {
    const nextNode = copyBlocks[index + 1];
    if (nextNode) {
      edges.push({
        id: `edge-${nanoid()}`,
        source: item.itemId,
        target: nextNode.itemId,
        sourceHandle: `${item.itemId}-output-1`,
        targetHandle: `${nextNode.itemId}-input-1`,
      });
    }
    item.label = item.id;
    item.id = item.itemId;
    item.position = { ...position };
    item.type = blocks[item.label].component;
    delete item.itemId;
    position.x += 250;
    return { ...item, position: { ...item.position } as { x: number; y: number } };
  });
  editor.value.removeNodes(nodes);
  editor.value.addNodes(groupBlocksList);
  editor.value.addSelectedNodes(
    groupBlocksList.map((item) => editor.value.findNode(item.id)).filter(Boolean)
  );
  editor.value.addEdges(edges);
};
const initAutocomplete = async () => {
  const autocompleteCache = await getExtensionStorageValue<string>(
    'session',
    `autocomplete:${workflowId}`
  );
  if (autocompleteCache) {
    const objData = parseJSON<Record<string, Record<string, unknown>>>(
      autocompleteCache,
      {}
    );
    autocompleteState.blocks = objData;
  } else {
    const autocompleteData: Record<string, Record<string, unknown>> = {};
    editorData.value?.nodes.forEach(({ label, id, data }) => {
      Object.assign(autocompleteData, extractAutocopmleteData(label, { data, id }));
    });
    autocompleteState.blocks = autocompleteData;
  }
  try {
    const storageVars = await dbStorage.variables.toArray();
    autocompleteState.common.globalData = parseJSON(
      (workflow.value as { globalData?: string })?.globalData as string,
      {}
    );
    autocompleteState.common.variables = {};
    storageVars.forEach((variable) => {
      (autocompleteState.common.variables as Record<string, unknown>)[
        `$$${variable.name}`
      ] = {};
    });
  } catch (error) {
    console.error(error);
  }
};
const registerTrigger = () => {
  const triggerBlock = editorData.value?.nodes.find((node) => node.label === 'trigger');
  if (!triggerBlock) return;
  registerWorkflowTrigger(workflowId, triggerBlock);
};
const executeCommand = (type: 'undo' | 'redo') => {
  state.isExecuteCommand = true;
  if (type === 'undo') {
    commandManager.undo();
  } else if (type === 'redo') {
    commandManager.redo();
  }
  clearTimeout(executeCommandTimeout);
  setTimeout(() => {
    state.isExecuteCommand = false;
  }, 500);
};
const onNodesChange = (changes: NodeChange[]) => {
  const nodeChanges: { added: GraphNode[]; removed: string[] } = {
    added: [],
    removed: [],
  };
  changes.forEach((change) => {
    const { type, id } = change as { type: string; id: string };
    const item = 'item' in change ? change.item : undefined;
    if (type === 'remove') {
      if (editState.blockData.blockId === id) {
        editState.editing = false;
        editState.blockData = {};
      }
      state.dataChanged = true;
      nodeChanges.removed.push(id);
    } else if (type === 'add' && item) {
      if (isPackage) {
        const excludeBlocks = ['block-package', 'trigger', 'execute-workflow'];
        if (excludeBlocks.includes(item.label as string)) {
          editor.value?.removeNodes([item]);
        }
        return;
      }
      nodeChanges.added.push(item);
    }
  });
  if (state.isExecuteCommand) return;
  let command = null;
  if (nodeChanges.added.length > 0) {
    command = editorCommands.nodeAdded(nodeChanges.added);
  } else if (nodeChanges.removed.length > 0) {
    command = editorCommands.nodeRemoved(nodeChanges.removed);
  }
  if (command) {
    commandManager.add(command);
  }
};
const autoAlign = () => {
  state.animateBlocks = true;
  const graph = new dagre.graphlib.Graph({ multigraph: true });
  graph.setGraph({
    rankdir: 'LR',
    ranksep: 100,
    ranker: 'tight-tree',
  });
  graph.setDefaultEdgeLabel(() => ({}));
  editor.value.getNodes.value.forEach(({ id, label, dimensions, parentNode }) => {
    if (label === 'blocks-group-2' || parentNode) return;
    graph.setNode(id, {
      label,
      width: dimensions.width,
      height: dimensions.height,
    });
  });
  editor.value.getEdges.value.forEach(({ source, target, id }) => {
    graph.setEdge(source, target, { id });
  });
  dagre.layout(graph);
  const nodeChanges: NodeChange[] = [];
  graph.nodes().forEach((nodeId) => {
    const graphNode = graph.node(nodeId);
    if (!graphNode) return;
    const { x, y } = graphNode;
    if (editorCommands.state.nodes[nodeId]) {
      editorCommands.state.nodes[nodeId].position = { x, y };
    }
    nodeChanges.push({
      id: nodeId,
      type: 'position',
      from: editor.value.findNode(nodeId)?.position || { x, y },
      dragging: false,
      position: { x, y },
    });
  });
  editor.value.applyNodeChanges(nodeChanges);
  editor.value.fitView();
  setTimeout(() => {
    state.dataChanged = true;
    state.animateBlocks = false;
  }, 500);
};
function toggleSidebar() {
  state.showSidebar = !state.showSidebar;
  setExtensionStorageValue('local', 'workflow:sidebar', state.showSidebar);
}
const getBlockDefinition = (blockId: string, blockNodeId: string | null = null) => {
  if (blocks[blockId]) return blocks[blockId];
  if (blockNodeId) {
    const node = editor.value?.findNode?.(blockNodeId);
    const fallbackLabel = node?.label as string | undefined;
    if (fallbackLabel && blocks[fallbackLabel]) {
      return blocks[fallbackLabel];
    }
  }
  return null;
};
const initEditBlock = (data: EditingBlockData) => {
  const blockDefinition = getBlockDefinition(
    data.id as string,
    (data.blockId as string) ?? null
  );
  if (!blockDefinition) {
    console.warn('Missing block definition for edit action', data);
    return;
  }
  const { editComponent, data: blockDefData, name } = blockDefinition;
  if (!editComponent) return;
  const blockData = defu(data.data, blockDefData);
  const blockEditComponent =
    typeof editComponent === 'string' ? editComponent : markRaw(editComponent);
  editState.blockData = {
    ...data,
    editComponent: blockEditComponent,
    name,
    data: blockData,
  };
  if (data.id === 'wait-connections' && editor.value) {
    const connections = editor.value.getEdges.value.reduce<
      { id: string; name: string }[]
    >((acc, { target, sourceNode, source }) => {
      if (target !== data.blockId) return acc;
      const sourceLabel = sourceNode.label as string;
      const blockNameKey = `workflow.blocks.${sourceLabel}.name`;
      let blockName = te(blockNameKey)
        ? t(blockNameKey)
        : blocks[sourceLabel]?.name || sourceLabel;
      const { description, name: groupName } = sourceNode.data;
      if (description || groupName) blockName += ` (${description || groupName})`;
      acc.push({
        id: source,
        name: blockName,
      });
      return acc;
    }, []);
    editState.blockData.connections = connections;
  }
  state.showSidebar = true;
  editState.editing = true;
};
const updateWorkflow = async (data: Record<string, unknown>) => {
  try {
    if (isPackage) {
      if ((workflow.value as { isExternal?: boolean })?.isExternal) return;
      delete data.drawflow;
      await packageStore.update({
        id: workflowId,
        data,
      });
      return;
    }
    await workflowStore.update({
      data,
      id: workflowId,
    });
    workflowPayload.data = { ...workflowPayload.data, ...data };
  } catch (error) {
    console.error(error);
  }
};
const onActionUpdated = ({
  data,
  changedIndicator,
}: {
  data: Record<string, unknown>;
  changedIndicator: boolean;
}) => {
  state.dataChanged = changedIndicator;
  workflowPayload.data = { ...workflowPayload.data, ...data };
};
const onEditorInit = (instance: VueFlowStore) => {
  editor.value = instance;
  let nodeToConnect: { nodeId: string; handleId: string | null } | null = null;
  instance.onEdgesChange(onEdgesChange);
  instance.onNodesChange(onNodesChange);
  instance.onEdgeDoubleClick(({ edge }) => {
    instance.removeEdges([edge]);
  });
  instance.onConnectStart(({ nodeId, handleId, handleType }) => {
    if (handleType !== 'source' || !nodeId) return;
    nodeToConnect = { nodeId, handleId };
  });
  instance.onConnectEnd((event) => {
    const target = event.target as HTMLElement;
    if (!nodeToConnect) return;
    if (target.hasAttribute('data-handleid')) {
      const handleId = target.getAttribute('data-handleid');
      if (handleId?.includes('-output-')) return;
    }
    const isNotTargetHandle = !target.closest('.vue-flow__handle.target');
    const targetNode = isNotTargetHandle && target.closest('.vue-flow__node');
    if (targetNode && (targetNode as HTMLElement).dataset.id !== nodeToConnect.nodeId) {
      const nodeId = (targetNode as HTMLElement).dataset.id as string;
      const nodeData = editor.value?.getNode.value(nodeId);
      if (
        nodeData &&
        nodeData.handleBounds?.target &&
        nodeData.handleBounds.target.length >= 1
      ) {
        const targetHandle = nodeData.handleBounds.target.find((item) => item.id);
        if (!targetHandle) return;
        editor.value?.addEdges([
          {
            target: nodeId,
            source: nodeToConnect.nodeId,
            targetHandle: targetHandle.id as string,
            sourceHandle: nodeToConnect.handleId,
          },
        ]);
      }
    }
    nodeToConnect = null;
  });
  // instance.onEdgeUpdateEnd(({ edge }) => {
  //   editorCommands.state.edges[edge.id] = edge;
  // });
  instance.onNodeDragStop(({ nodes }) => {
    if (!editorCommands?.state?.nodes) return;
    nodes.forEach((node) => {
      editorCommands.state.nodes[node.id] = node;
    });
  });
  const convertToObj = <T extends { id: string }>(array: T[]) =>
    array.reduce<Record<string, T>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  setTimeout(() => {
    const commandInitState = {
      nodes: convertToObj(instance.getNodes.value),
      edges: convertToObj(instance.getEdges.value),
    };
    editorCommands = new EditorCommands(
      instance as unknown as ConstructorParameters<typeof EditorCommands>[0],
      commandInitState as unknown as ConstructorParameters<typeof EditorCommands>[1]
    );
  }, 1000);
  const { blockId } = route.query;
  if (blockId) goToBlock(blockId as string);
};
const clearHighlightedElements = () => {
  const elements = document.querySelectorAll(
    '.dropable-area__node, .dropable-area__handle'
  );
  elements.forEach((element) => {
    element.classList.remove('dropable-area__node');
    element.classList.remove('dropable-area__handle');
  });
};
const toggleHighlightElement = ({
  target,
  elClass,
  classes,
}: {
  target: HTMLElement;
  elClass: string;
  classes: string;
}) => {
  const targetEl = target.closest(elClass);
  if (targetEl) {
    targetEl.classList.add(classes);
  } else {
    const elements = document.querySelectorAll(`.${classes}`);
    elements.forEach((element) => {
      element.classList.remove(classes);
    });
  }
};
const onDragoverEditor = (event: DragEvent) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  toggleHighlightElement({
    target,
    elClass: '.vue-flow__handle.source',
    classes: 'dropable-area__handle',
  });
  if (!target.closest('.vue-flow__handle')) {
    toggleHighlightElement({
      target,
      elClass: '.vue-flow__node:not(.vue-flow__node-BlockGroup)',
      classes: 'dropable-area__node',
    });
  }
};
const onDropInEditor = ({
  dataTransfer,
  clientX,
  clientY,
  target,
}: DragEvent & { target: HTMLElement }) => {
  if (!dataTransfer || !editor.value) return;
  const savedBlocks = parseJSON<import('@/types/models').SavedPackage | null>(
    dataTransfer.getData('savedBlocks'),
    null
  );
  const editorRect = editor.value.viewportRef.value?.getBoundingClientRect();
  const position = editor.value.project({
    y: clientY - (editorRect?.top ?? 0),
    x: clientX - (editorRect?.left ?? 0),
  });
  if (savedBlocks && !isPackage) {
    if (savedBlocks.settings.asBlock) {
      editor.value.addNodes([
        {
          position,
          id: nanoid(),
          data: savedBlocks,
          type: 'BlockPackage',
          label: 'block-package',
        },
      ]);
    } else {
      const { nodes, edges } = savedBlocks.data;
      const newElements = copyElements(nodes, edges, { clientX, clientY });
      editor.value.addNodes(newElements.nodes);
      editor.value.addEdges(newElements.edges);
    }
    state.dataChanged = true;
    return;
  }
  const block = parseJSON<{
    id: string;
    component?: string;
    data?: Record<string, unknown>;
    fromBlockBasic?: boolean;
    fromGroup?: boolean;
    outputs?: number;
    itemId?: string;
  } | null>(dataTransfer.getData('block'), null);
  if (!block || block.fromBlockBasic) return;
  if (block.id === 'trigger' && isPackage) return;
  clearHighlightedElements();
  const isTriggerExists =
    block.id === 'trigger' &&
    editor.value.getNodes.value.some((node) => node.label === 'trigger');
  if (isTriggerExists) return;
  const nodeEl = DroppedNode.isNode(target);
  if (nodeEl) {
    DroppedNode.replaceNode(
      editor.value as unknown as Parameters<typeof DroppedNode.replaceNode>[0],
      { block, target: nodeEl as HTMLElement }
    );
    return;
  }
  const nodeId = nanoid();
  const newNode = {
    position,
    label: block.id,
    data: block.data,
    type: block.component,
    id: block.id === 'blocks-group-2' ? `group-${nodeId}` : nodeId,
  };
  editor.value.addNodes([newNode]);
  const edgeEl = DroppedNode.isEdge(target);
  const handleEl = DroppedNode.isHandle(target);
  if (handleEl) {
    DroppedNode.appendNode(
      editor.value as unknown as Parameters<typeof DroppedNode.replaceNode>[0],
      {
        target: handleEl as HTMLElement,
        nodeId: newNode.id,
      }
    );
  } else if (edgeEl) {
    DroppedNode.insertBetweenNode(
      editor.value as unknown as Parameters<typeof DroppedNode.replaceNode>[0],
      {
        target: edgeEl as HTMLElement,
        nodeId: newNode.id,
        outputs: block.outputs,
      }
    );
  }
  if (block.fromGroup) {
    setTimeout(() => {
      const blockEl = document.querySelector(`[data-id="${newNode.id}"]`);
      blockEl?.setAttribute('group-item-id', block.itemId);
    }, 200);
  }
  state.dataChanged = true;
};
const copyElements = (
  nodes: (WorkflowNode | GraphNode)[],
  edges: (import('@/types/models').WorkflowEdge | import('@vue-flow/core').GraphEdge)[],
  initialPos?: { clientX: number; clientY: number } | { x: number; y: number }
) => {
  const newIds = new Map<string, string>();
  let firstNodePos: { x: number; y: number } | null = null;
  let projectedInitialPos = initialPos as { x: number; y: number } | undefined;
  const newNodes = nodes.map(({ id, label: nodeLabel, position, data, type }, index) => {
    const label = typeof nodeLabel === 'string' ? nodeLabel : '';
    const newNodeId = nanoid();
    const nodePos = {
      z: 0,
      y: position.y + 50,
      x: position.x + 50,
    };
    newIds.set(id, newNodeId);
    if (projectedInitialPos) {
      if (index === 0) {
        firstNodePos = {
          x: nodePos.x,
          y: nodePos.y,
        };
        projectedInitialPos = editor.value?.project({
          y: (initialPos as { clientY: number }).clientY,
          x: (initialPos as { clientX: number }).clientX - 360,
        });
        Object.assign(nodePos, projectedInitialPos);
      } else if (firstNodePos && projectedInitialPos) {
        const xDistance = nodePos.x - (firstNodePos as { x: number }).x;
        const yDistance = nodePos.y - (firstNodePos as { y: number }).y;
        nodePos.x = projectedInitialPos.x + xDistance;
        nodePos.y = projectedInitialPos.y + yDistance;
      }
    }
    const copyNode = cloneDeep({
      data,
      label,
      id: newNodeId,
      selected: true,
      position: nodePos,
      type: type || blocks[label].component,
    });
    copyNode.data = reactive(copyNode.data);
    return copyNode;
  });
  const newEdges = edges.reduce(
    (acc, { target, targetHandle, source, sourceHandle }) => {
      const targetId = newIds.get(target);
      const sourceId = newIds.get(source);
      if (!targetId || !sourceId) return acc;
      const copyEdge = cloneDeep({
        selected: true,
        target: targetId,
        source: sourceId,
        id: `edge-${nanoid()}`,
        targetHandle: targetHandle?.replace(target, targetId),
        sourceHandle: sourceHandle?.replace(source, sourceId),
      });
      acc.push(copyEdge);
      return acc;
    },
    [] as import('@/types/models').WorkflowEdge[]
  );
  return {
    nodes: newNodes,
    edges: newEdges,
  };
};
function duplicateElements({
  nodes,
  edges,
}: {
  nodes?: (WorkflowNode | GraphNode)[];
  edges?: (import('@/types/models').WorkflowEdge | import('@vue-flow/core').GraphEdge)[];
} = {}) {
  if (!editor.value) return;
  const selectedNodes = editor.value.getSelectedNodes.value;
  const selectedEdges = editor.value.getSelectedEdges.value;
  const { edges: newEdges, nodes: newNodes } = copyElements(
    nodes || selectedNodes,
    edges || selectedEdges
  );
  selectedNodes.forEach((node) => {
    node.selected = false;
  });
  selectedEdges.forEach((edge) => {
    edge.selected = false;
  });
  editor.value.addNodes(newNodes);
  editor.value.addEdges(newEdges);
  state.dataChanged = true;
}
const copySelectedElements = (
  data: {
    nodes?: (WorkflowNode | GraphNode)[];
    edges?: (
      import('@/types/models').WorkflowEdge | import('@vue-flow/core').GraphEdge
    )[];
  } = {}
) => {
  if (!editor.value) return;
  const nodes = data.nodes || editor.value.getSelectedNodes.value;
  const edges = data.edges || editor.value.getSelectedEdges.value;
  const clipboardData = JSON.stringify({
    name: 'browsless-blocks',
    data: { nodes, edges },
  });
  navigator.clipboard.writeText(clipboardData).catch((error) => {
    console.error(error);
  });
};
const pasteCopiedElements = async (position?: { clientX: number; clientY: number }) => {
  if (!editor.value) return;
  editor.value.removeSelectedNodes(editor.value.getSelectedNodes.value);
  editor.value.removeSelectedEdges(editor.value.getSelectedEdges.value);
  const permission = await browser.permissions.request({
    permissions: ['clipboardRead'],
  });
  if (!permission) {
    toast.error('Browsless requires clipboard permission to paste blocks');
    return;
  }
  try {
    const copiedText = await navigator.clipboard.readText();
    const workflowBlocks = parseJSON<{
      name?: string;
      data?: { nodes: WorkflowNode[]; edges: import('@/types/models').WorkflowEdge[] };
    } | null>(copiedText, null);
    if (
      workflowBlocks &&
      workflowBlocks.name === 'browsless-blocks' &&
      workflowBlocks.data
    ) {
      const { nodes, edges } = copyElements(
        workflowBlocks.data.nodes,
        workflowBlocks.data.edges,
        position
      );
      editor.value.addNodes(nodes);
      editor.value.addEdges(edges);
      state.dataChanged = true;
    }
  } catch (error) {
    console.error(error);
  }
};
const undoRedoCommand = (type: 'undo' | 'redo', { target }: { target: HTMLElement }) => {
  const els = ['INPUT', 'SELECT', 'TEXTAREA'];
  if (els.includes(target.tagName) || target.isContentEditable) return;
  executeCommand(type);
};
const onKeydown = ({
  ctrlKey,
  metaKey,
  shiftKey,
  key,
  target,
  repeat,
}: KeyboardEvent & { target: HTMLElement }) => {
  if (repeat) return;
  const els = ['INPUT', 'SELECT', 'TEXTAREA'];
  if (
    els.includes(target.tagName) ||
    target.isContentEditable ||
    !target.closest('.workflow-editor')
  )
    return;
  if (isPackage && (workflow.value as { isExternal?: boolean })?.isExternal) return;
  const command = (keyName: string) => (ctrlKey || metaKey) && keyName === key;
  if (command('c')) {
    copySelectedElements();
  } else if (command('v')) {
    pasteCopiedElements();
  } else if (command('z')) {
    undoRedoCommand(shiftKey ? 'redo' : 'undo', { target });
  }
};
async function fetchConnectedTable() {
  const table = await dbStorage.tablesItems
    .where('id')
    .equals((workflow.value as { connectedTable?: number })?.connectedTable as number)
    .first();
  if (!table) return;
  connectedTable.value = table;
}
const checkWorkflowPermission = () => {
  if (!editorData.value) return;
  getWorkflowPermissions(editorData.value).then((permissions) => {
    if (permissions.length === 0) return;
    permissionState.items = permissions;
    permissionState.showModal = true;
  });
};
const onBeforeLeave = () => {
  // disselect node before leave
  const selectedNodes = editor.value?.getSelectedNodes?.value;
  selectedNodes?.forEach((node) => {
    node.selected = false;
  });
  const dataNotChanged = !state.dataChanged || !haveEditAccess.value;
  const isExternalPkg = isPackage && workflow.value.isExternal;
  if (dataNotChanged || isExternalPkg) return;
  const confirm = window.confirm(t('message.notSaved'));
  if (!confirm) return false;
};
useHead({
  title: () => `${workflow.value?.name} ${isPackage ? 'package' : 'workflow'}`,
});
const shortcut = useShortcut([
  getShortcut('editor:toggle-sidebar', toggleSidebar),
  getShortcut('editor:duplicate-block', () => duplicateElements()),
]);
provide('workflow-editor', editor);
provide('autocompleteData', autocompleteList);
provide('workflow', {
  editState,
  isPackage,
  data: workflow,
  columns: workflowColumns,
});
provide('workflow-utils', {
  executeFromBlock,
});
watch(
  () => state.activeTab,
  (value) => {
    router.replace({ ...route, query: { tab: value } });
  }
);
watch(
  () => state.dataChanged,
  (isDataChanged) => {
    window.isDataChanged = isDataChanged && haveEditAccess.value;
  }
);
onDeactivated(() => {
  const selectedNodes = editor.value?.getSelectedNodes?.value;
  selectedNodes?.forEach((node) => {
    node.selected = false;
  });
});
onBeforeRouteLeave(onBeforeLeave);
onMounted(async () => {
  if (!workflow.value) {
    router.replace(isPackage ? '/packages' : '/');
    return;
  }
  const sidebarState =
    (await getExtensionStorageValue('local', 'workflow:sidebar', true)) ?? true;
  state.showSidebar = sidebarState;
  state.sidebarState = sidebarState;
  if (!isPackage) {
    const convertedData = convertWorkflowData(workflow.value as Workflow);
    updateWorkflow({ drawflow: convertedData.drawflow }).then(() => {
      state.workflowConverted = true;
    });
  } else {
    state.workflowConverted = true;
  }
  if (route.query.permission || !haveEditAccess.value) checkWorkflowPermission();
  if (workflow.value.connectedTable) {
    fetchConnectedTable();
  }
  initAutocomplete();
});
onBeforeUnmount(() => {
  if (isPackage && workflow.value.isExternal) return;
});
</script>
<style>
@reference "../../../assets/css/tailwind.css";

.vue-flow,
.editor-tab {
  width: 100%;
  height: 100%;
}
.vue-flow__node {
  @apply rounded-lg;
}
.dropable-area__node,
.dropable-area__handle {
  @apply ring-4;
}
.animate-blocks {
  .vue-flow__transformationpane,
  .vue-flow__node {
    transition: transform 300ms ease;
  }
}
.undo-redo {
  button:not(:disabled):hover {
    @apply bg-box-transparent;
  }
  button:disabled {
    @apply text-gray-500 dark:text-gray-400;
  }
}
.sidebar {
  max-width: 30%;
}

.custom-drag {
  position: absolute;
  width: 8px;
  height: 90%;
  right: 0;
  top: 50%;
  transform: translateY(-50%);

  border-radius: 4px;
  opacity: 0;
  cursor: col-resize;
  transition: opacity 0.5s;
  background-color: #436dec;
}
.custom-drag:hover {
  cursor: col-resize;
  opacity: 1;
}
</style>
