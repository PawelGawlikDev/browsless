<template>
  <ui-card padding="p-1" class="pointer-events-auto ml-4 flex items-center"> </ui-card>
  <ui-card v-if="canEdit" padding="p-1 ml-4 hidden md:block pointer-events-auto">
    <button
      v-for="item in modalActions"
      :key="item.id"
      v-tooltip.group="item.name"
      class="hoverable rounded-lg p-2"
      @click="$emit('modal', item.id)"
    >
      <v-remixicon :name="item.icon" />
    </button>
  </ui-card>
  <ui-card padding="p-1 ml-4 flex items-center pointer-events-auto">
    <ui-popover v-if="canEdit" class="md:hidden">
      <template #trigger>
        <button class="hoverable rounded-lg p-2">
          <v-remixicon name="riMore2Line" />
        </button>
      </template>
      <ui-list class="cursor-pointer space-y-1">
        <ui-list-item
          v-for="item in modalActions"
          :key="item.id"
          v-close-popover
          @click="$emit('modal', item.id)"
        >
          <v-remixicon :name="item.icon" class="mr-2 -ml-1" />
          {{ item.name }}
        </ui-list-item>
      </ui-list>
    </ui-popover>
    <template v-if="!workflow.isDisabled">
      <button
        v-if="canEdit"
        v-tooltip.group="t(`workflow.testing.${isDataChanged ? 'disabled' : 'title'}`)"
        :class="[
          { 'cursor-default': isDataChanged },
          workflow.testingMode ? 'bg-primary bg-opacity-20 text-primary' : 'hoverable',
        ]"
        class="rounded-lg p-2"
        @click="toggleTestingMode"
      >
        <v-remixicon name="riBug2Line" />
      </button>
      <button
        v-tooltip.group="
          `${t('common.execute')} (${shortcuts['editor:execute-workflow'].readable})`
        "
        class="hoverable rounded-lg p-2"
        @click="executeCurrWorkflow"
      >
        <v-remixicon name="riPlayLine" />
      </button>
    </template>
    <button
      v-else
      v-tooltip="t('workflow.clickToEnable')"
      class="p-2"
      @click="updateWorkflow({ isDisabled: false })"
    >
      {{ t('common.disabled') }}
    </button>
  </ui-card>
  <ui-card padding="p-1 ml-4 space-x-1 pointer-events-auto flex items-center">
    <button
      v-if="!canEdit"
      v-tooltip.group="state.triggerText"
      class="hoverable rounded-lg p-2"
    >
      <v-remixicon name="riFlashlightLine" />
    </button>
    <ui-popover>
      <template #trigger>
        <button class="hoverable rounded-lg p-2">
          <v-remixicon name="riMore2Line" />
        </button>
      </template>
      <ui-list style="min-width: 9rem">
        <ui-list-item v-close-popover class="cursor-pointer" @click="copyWorkflowId">
          <v-remixicon name="riFileCopyLine" class="mr-2 -ml-1" />
          Copy workflow Id
        </ui-list-item>
        <ui-list-item
          class="cursor-pointer"
          @click="updateWorkflow({ isDisabled: !workflow.isDisabled })"
        >
          <v-remixicon name="riToggleLine" class="mr-2 -ml-1" />
          {{ t(`common.${workflow.isDisabled ? 'enable' : 'disable'}`) }}
        </ui-list-item>
        <ui-list-item
          v-for="item in moreActions"
          :key="item.id"
          v-bind="item.attrs || {}"
          v-close-popover
          class="cursor-pointer"
          @click="item.action"
        >
          <v-remixicon :name="item.icon" class="mr-2 -ml-1" />
          {{ item.name }}
        </ui-list-item>
      </ui-list>
    </ui-popover>
    <ui-button
      :title="shortcuts['editor:save'].readable"
      variant="accent"
      class="relative px-2 md:px-4"
      @click="saveWorkflow"
    >
      <span v-if="isDataChanged" class="absolute top-0 left-0 -ml-1 -mt-1 flex h-3 w-3">
        <span
          class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
        ></span>
        <span class="relative inline-flex h-3 w-3 rounded-full bg-blue-600"></span>
      </span>
      <v-remixicon name="riSaveLine" class="my-1 md:-ml-1" />
      <span class="ml-2 hidden md:block">{{ t('common.save') }}</span>
    </ui-button>
    <template>
      <ui-button
        v-tooltip="`Save workflow (${shortcuts['editor:save'].readable})`"
        class="mr-2"
        icon
        @click="saveWorkflow"
      >
        <span v-if="isDataChanged" class="absolute top-0 left-0 -ml-1 -mt-1 flex h-3 w-3">
          <span
            class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
          ></span>
          <span class="relative inline-flex h-3 w-3 rounded-full bg-blue-600"></span>
        </span>
        <v-remixicon name="riSaveLine" />
      </ui-button>
    </template>
  </ui-card>
  <ui-modal v-model="renameState.showModal" title="Rename">
    <ui-input
      v-model="renameState.name"
      :placeholder="t('common.name')"
      autofocus
      class="mb-4 w-full"
      @keyup.enter="renameWorkflow"
    />
    <ui-textarea
      v-model="renameState.description"
      :placeholder="t('common.description')"
      height="165px"
      class="w-full dark:text-gray-200"
      max="300"
      style="min-height: 140px"
    />
    <p class="mb-6 text-right text-gray-600 dark:text-gray-200">
      {{ renameState.description.length }}/300
    </p>
    <div class="flex space-x-2">
      <ui-button class="w-full" @click="clearRenameModal">
        {{ t('common.cancel') }}
      </ui-button>
      <ui-button variant="accent" class="w-full" @click="renameWorkflow">
        {{ t('common.update') }}
      </ui-button>
    </div>
  </ui-modal>
</template>
<script setup>
import { useDialog } from '@/composable/dialog';
import { useGroupTooltip } from '@/composable/groupTooltip';
import { getShortcut, useShortcut } from '@/composable/shortcut';
import RendererWorkflowService from '@/service/renderer/RendererWorkflowService';
import { useStore } from '@/stores/main';
import { usePackageStore } from '@/stores/package';
import { useWorkflowStore } from '@/stores/workflow';
import { findTriggerBlock } from '@/utils/helper';
import getTriggerText from '@/utils/triggerText';
import { exportWorkflow } from '@/utils/workflowData';
import { registerWorkflowTrigger } from '@/utils/workflowTrigger';
import { reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { getExtensionManifest } from '@/utils/extensionManifest';
const props = defineProps({
  isDataChanged: {
    type: Boolean,
    default: false,
  },
  workflow: {
    type: Object,
    default: () => ({}),
  },
  editor: {
    type: Object,
    default: () => ({}),
  },
  changedData: {
    type: Object,
    default: () => ({}),
  },
  canEdit: {
    type: Boolean,
    default: true,
  },
  isPackage: Boolean,
});
const emit = defineEmits(['modal', 'change', 'update', 'permission']);
useGroupTooltip();
const { t } = useI18n();
const toast = useToast();
const router = useRouter();
const dialog = useDialog();
const mainStore = useStore();
const packageStore = usePackageStore();
const workflowStore = useWorkflowStore();
const shortcuts = useShortcut([
  getShortcut('editor:save', saveWorkflow),
  getShortcut('editor:execute-workflow', executeCurrWorkflow),
]);
const state = reactive({
  triggerText: '',
  loadingSync: false,
  isPublishing: false,
  showEditDescription: false,
});
const renameState = reactive({
  name: '',
  description: '',
  showModal: false,
});
const updateWorkflow = (data = {}, changedIndicator = false) => {
  let store = null;
  store = workflowStore.update({
    data,
    id: props.workflow.id,
  });
  return store.then((result) => {
    emit('update', { data, changedIndicator });
    return result;
  });
};
const toggleTestingMode = () => {
  if (props.isDataChanged) return;
  updateWorkflow({ testingMode: !props.workflow.testingMode });
};
const copyWorkflowId = () => {
  navigator.clipboard.writeText(props.workflow.id).catch((error) => {
    console.error(error);
    const textarea = document.createElement('textarea');
    textarea.value = props.workflow.id;
    textarea.select();
    document.execCommand('copy');
    textarea.blur();
  });
};
async function saveWorkflow() {
  try {
    const flow = props.editor.toObject();
    flow.edges = flow.edges.map((edge) => {
      delete edge.sourceNode;
      delete edge.targetNode;
      return edge;
    });
    const triggerBlock = flow.nodes.find((node) => node.label === 'trigger');
    if (!triggerBlock) {
      toast.error(t('message.noTriggerBlock'));
      return;
    }
    await updateWorkflow(
      {
        drawflow: flow,
        trigger: triggerBlock.data,
        version: getExtensionManifest().version,
      },
      false
    );
    await registerWorkflowTrigger(props.workflow.id, triggerBlock);
    emit('change', { drawflow: flow });
  } catch (error) {
    console.error(error);
  }
}
async function executeCurrWorkflow() {
  if (mainStore.settings.editor.saveWhenExecute && props.isDataChanged) {
    saveWorkflow();
  }
  RendererWorkflowService.executeWorkflow({
    ...props.workflow,
    isTesting: props.isDataChanged,
  });
}
const clearRenameModal = () => {
  Object.assign(renameState, {
    id: '',
    name: '',
    description: '',
    showModal: false,
  });
};
const initRenameWorkflow = () => {
  Object.assign(renameState, {
    showModal: true,
    name: `${props.workflow.name}`,
    description: `${props.workflow.description}`,
  });
};
const renameWorkflow = () => {
  updateWorkflow({
    name: renameState.name,
    description: renameState.description,
  });
  clearRenameModal();
};
const deleteWorkflow = () => {
  dialog.confirm({
    title: props.isPackage ? t('common.delete') : t('workflow.delete'),
    okVariant: 'danger',
    body: props.isPackage
      ? `Are you sure you want to delete "${props.workflow.name}" from the packages?`
      : t('message.delete', { name: props.workflow.name }),
    onConfirm: async () => {
      if (props.isPackage) {
        await packageStore.delete(props.workflow.id);
      } else {
        await workflowStore.delete(props.workflow.id);
      }
      router.replace(props.isPackage ? '/packages' : '/');
    },
  });
};
const retrieveTriggerText = async () => {
  if (props.canEdit) return;
  const triggerBlock = findTriggerBlock(props.workflow.drawflow);
  if (!triggerBlock) return;
  state.triggerText = await getTriggerText(
    triggerBlock.data,
    t,
    router.currentRoute.value.params.id,
    true
  );
};
retrieveTriggerText();
const modalActions = [
  {
    id: 'table',
    name: t('workflow.table.title'),
    icon: 'riTable2',
  },
  {
    id: 'global-data',
    name: t('common.globalData'),
    icon: 'riDatabase2Line',
  },
  {
    id: 'settings',
    name: t('common.settings'),
    icon: 'riSettings3Line',
  },
];
const moreActions = [
  {
    id: 'export',
    icon: 'riDownloadLine',
    name: t('common.export'),
    action: () => exportWorkflow(props.workflow),
    hasAccess: true,
  },
  {
    id: 'rename',
    icon: 'riPencilLine',
    hasAccess: true,
    name: t('common.rename'),
    action: initRenameWorkflow,
  },
  {
    id: 'delete',
    hasAccess: true,
    action: deleteWorkflow,
    name: t('common.delete'),
    icon: 'riDeleteBin7Line',
    attrs: {
      class: 'text-red-400 dark:text-red-500',
    },
  },
].filter((item) => item.hasAccess);
</script>
