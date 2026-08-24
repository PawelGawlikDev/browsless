<template>
  <div
    :class="['h-48']"
    class="absolute top-0 left-0 w-full rounded-b-2xl bg-accent"
  ></div>
  <div
    :class="['mb-6']"
    class="dark relative z-10 px-5 pt-8 text-white placeholder:text-black"
  >
    <div class="mb-4 flex items-center">
      <h1 class="text-xl font-semibold text-white">BrowsLess</h1>
      <div class="grow"></div>
      <ui-button
        v-tooltip.group="
          t(`home.elementSelector.${state.haveAccess ? 'name' : 'noAccess'}`)
        "
        icon
        class="mr-2"
        @click="initElementSelector"
      >
        <v-remixicon name="riFocus3Line" />
      </ui-button>
      <ui-button
        v-tooltip.group="t('common.dashboard')"
        icon
        :title="t('common.dashboard')"
        @click="openDashboard('')"
      >
        <v-remixicon name="riHome5Line" />
      </ui-button>
    </div>
    <div class="flex">
      <ui-input
        v-model="state.query"
        :placeholder="`${t('common.search')}...`"
        autocomplete="off"
        prepend-icon="riSearch2Line"
        class="search-input w-full"
      />
    </div>
  </div>
  <div class="relative z-20 space-y-2 px-5 pb-5">
    <ui-card v-if="workflowStore.getWorkflows.length === 0" class="text-center">
      <img src="@/assets/svg/alien.svg" />
      <p class="font-semibold">{{ t('message.empty') }}</p>
      <ui-button variant="accent" class="mt-6" @click="openDashboard('/workflows')">
        {{ t('home.workflow.new') }}
      </ui-button>
    </ui-card>
    <div v-if="pinnedWorkflows.length > 0" class="mt-1 mb-4 border-b pb-4">
      <div class="mb-1 flex items-center text-gray-300">
        <v-remixicon name="riPushpin2Line" size="20" class="mr-2" />
        <span>Pinned workflows</span>
      </div>
      <home-workflow-card
        v-for="workflow in pinnedWorkflows"
        :key="workflow.id"
        :workflow="workflow"
        :tab="state.activeTab"
        :pinned="true"
        class="mb-2"
        @details="openWorkflowPage"
        @update="updateWorkflow(workflow.id, $event)"
        @execute="executeWorkflow"
        @rename="renameWorkflow"
        @delete="deleteWorkflow"
        @toggle-pin="togglePinWorkflow(workflow)"
      />
    </div>
    <div
      :class="{ 'p-2 rounded-lg bg-white': pinnedWorkflows.length === 0 }"
      class="flex items-center"
    >
      <ui-select v-model="state.activeFolder" class="folder-select flex-1">
        <option value="">Folder (all)</option>
        <option v-for="folder in folderStore.items" :key="folder.id" :value="folder.id">
          {{ folder.name }}
        </option>
      </ui-select>
      <ui-popover class="ml-2">
        <template #trigger>
          <ui-button>
            <v-remixicon name="riSortDesc" class="mr-2 -ml-1" />
            <span>Sort</span>
          </ui-button>
        </template>
        <div class="w-48">
          <ui-select v-model="sortState.order" block placeholder="Sort order">
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </ui-select>
          <ui-select
            v-model="sortState.by"
            :placeholder="t('sort.sortBy')"
            block
            class="mt-2 flex-1"
          >
            <option v-for="sort in sorts" :key="sort" :value="sort">
              {{ t(`sort.${sort}`) }}
            </option>
          </ui-select>
        </div>
      </ui-popover>
    </div>
    <home-workflow-card
      v-for="workflow in workflows"
      :key="workflow.id"
      :workflow="workflow"
      :tab="state.activeTab"
      :pinned="state.pinnedWorkflows.includes(workflow.id)"
      @details="openWorkflowPage"
      @update="updateWorkflow(workflow.id, $event)"
      @execute="executeWorkflow"
      @rename="renameWorkflow"
      @delete="deleteWorkflow"
      @toggle-pin="togglePinWorkflow(workflow)"
    />
    <div
      v-if="state.showSettingsPopup"
      class="fixed bottom-5 left-0 m-4 rounded-lg bg-accent p-4 text-white shadow-md dark:text-black z-10"
    >
      <p class="text-sm leading-tight">
        If the workflow runs for less than 5 minutes, set it to run in the background in
        the
        <a href="#" class="font-semibold underline" target="_blank">
          workflow settings.
        </a>
      </p>
      <v-remixicon
        name="riCloseLine"
        class="absolute top-2 right-2 cursor-pointer text-gray-300 dark:text-gray-600"
        size="20"
        @click="closeSettingsPopup"
      />
    </div>
  </div>
</template>
<script setup>
import BackgroundUtils from '@/background/BackgroundUtils';
import HomeWorkflowCard from '@/components/popup/home/HomeWorkflowCard.vue';
import { useDialog } from '@/composable/dialog';
import { useGroupTooltip } from '@/composable/groupTooltip';
import {
  extensionStorage,
  getExtensionStorageValue,
  setExtensionStorageValue,
} from '@/lib/extensionStorage';
import { initElementSelector as initElementSelectorFunc } from '@/dashboard/utils/elementSelector';
import RendererWorkflowService from '@/service/renderer/RendererWorkflowService';
import { useFolderStore } from '@/stores/folder';
import { useWorkflowStore } from '@/stores/workflow';
import { arraySorter } from '@/utils/helper';
import { computed, onMounted, shallowReactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { browser } from 'wxt/browser';
const { t } = useI18n();
const dialog = useDialog();
const folderStore = useFolderStore();
const workflowStore = useWorkflowStore();
useGroupTooltip();
const sorts = ['name', 'createdAt', 'updatedAt', 'mostUsed'];
const sortState = shallowReactive({
  by: 'createdAt',
  order: 'desc',
});
const state = shallowReactive({
  query: '',
  cardHeight: 255,
  retrieved: false,
  haveAccess: true,
  pinnedWorkflows: [],
  activeFolder: '',
  showSettingsPopup: true,
});
const pinnedWorkflows = computed(() => {
  const list = [];
  state.pinnedWorkflows.forEach((workflowId) => {
    const workflow = workflowStore.getById(workflowId);
    if (
      !workflow ||
      !workflow.name.toLocaleLowerCase().includes(state.query.toLocaleLowerCase())
    )
      return;
    list.push(workflow);
  });
  return list;
});
const localWorkflows = computed(() => {
  const filteredLocalWorkflows = workflowStore.getWorkflows.filter(
    ({ name, folderId }) => {
      const isInFolder = !state.activeFolder || state.activeFolder === folderId;
      const nameMatch = name
        .toLocaleLowerCase()
        .includes(state.query.toLocaleLowerCase());
      return isInFolder && nameMatch;
    }
  );
  return arraySorter({
    key: sortState.by,
    order: sortState.order,
    data: filteredLocalWorkflows,
  });
});
const workflows = computed(() => localWorkflows.value);
const closeSettingsPopup = () => {
  state.showSettingsPopup = false;
  setExtensionStorageValue('local', 'settingsPopup', false);
};
const togglePinWorkflow = (workflow) => {
  const index = state.pinnedWorkflows.indexOf(workflow.id);
  const copyData = [...state.pinnedWorkflows];
  if (index === -1) {
    copyData.push(workflow.id);
  } else {
    copyData.splice(index, 1);
  }
  state.pinnedWorkflows = copyData;
  extensionStorage.local.set({
    pinnedWorkflows: copyData,
  });
};
const executeWorkflow = async (workflow) => {
  try {
    await RendererWorkflowService.executeWorkflow(workflow, workflow.options);
    window.close();
  } catch (error) {
    console.error(error);
  }
};
const updateWorkflow = (id, data) => {
  return workflowStore.update({
    id,
    data,
  });
};
const renameWorkflow = ({ id, name }) => {
  dialog.prompt({
    title: t('home.workflow.rename'),
    placeholder: t('common.name'),
    okText: t('common.rename'),
    inputValue: name,
    onConfirm: (newName) => {
      updateWorkflow(id, { name: newName });
    },
  });
};
const deleteWorkflow = ({ id, name }) => {
  dialog.confirm({
    title: t('home.workflow.delete'),
    okVariant: 'danger',
    body: t('message.delete', { name }),
    onConfirm: () => {
      workflowStore.delete(id);
    },
  });
};
const openDashboard = (url) => {
  BackgroundUtils.openDashboard(url);
};
const initElementSelector = async () => {
  const [tab] = await browser.tabs.query({
    url: '*://*/*',
    active: true,
    currentWindow: true,
  });
  if (!tab) return;
  initElementSelectorFunc(tab).then(() => {
    window.close();
  });
};
const openWorkflowPage = ({ id }) => {
  let url = `/workflows/${id}`;
  openDashboard(url);
};
watch(
  () => [sortState.by, sortState.order, state.activeFolder],
  ([sortBy, sortOrder, activeFolder]) => {
    setExtensionStorageValue('local', 'popup-workflow-sort', {
      sortOrder,
      sortBy,
      activeFolder,
    });
  }
);
onMounted(async () => {
  const savedSorts =
    (await getExtensionStorageValue('local', 'popup-workflow-sort', {})) || {};
  sortState.by = savedSorts.sortBy || 'createdAt';
  sortState.order = savedSorts.sortOrder || 'desc';
  state.activeFolder = savedSorts.activeFolder || '';
  state.showSettingsPopup =
    (await getExtensionStorageValue('local', 'settingsPopup', true)) ?? true;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  state.haveAccess = /^(https?)/.test(tab.url);
  const storage = await extensionStorage.local.get('pinnedWorkflows');
  state.pinnedWorkflows = storage.pinnedWorkflows || [];
  await folderStore.load();
  state.retrieved = true;
  if (state.activeFolder) {
    const folderExist = folderStore.items.some(
      (folder) => folder.id === state.activeFolder
    );
    if (!folderExist) state.activeFolder = '';
  }
});
</script>
<style>
.recording-card {
  transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.folder-select select,
.folder-select svg {
  color: rgb(0 0 0);
}

.folder-select .ui-select__content {
  background: rgb(255 255 255);
  border-radius: 0.5rem;
}

.folder-select option,
.folder-select optgroup {
  background: rgb(255 255 255);
  color: rgb(0 0 0);
}
</style>
