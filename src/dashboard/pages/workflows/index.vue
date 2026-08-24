<template>
  <div class="container pt-8 pb-4">
    <h1 class="text-2xl font-semibold capitalize">
      {{ t('common.workflow', 2) }}
    </h1>
    <div class="mt-8 flex items-start">
      <div class="sticky top-8 hidden w-60 lg:block">
        <div class="flex w-full">
          <ui-button
            :title="shortcut['action:new'].readable"
            variant="accent"
            class="flex-1 rounded-r-none border-r font-semibold"
            @click="addWorkflowModal.show = true"
          >
            {{ t('workflow.new') }}
          </ui-button>
          <ui-popover>
            <template #trigger>
              <ui-button icon class="rounded-l-none" variant="accent">
                <v-remixicon name="riArrowLeftSLine" rotate="-90" />
              </ui-button>
            </template>
            <ui-list class="space-y-1">
              <ui-list-item
                v-close-popover
                class="cursor-pointer"
                @click="openImportDialog"
              >
                {{ t('workflow.import') }}
              </ui-list-item>
              <ui-list-item
                v-close-popover
                class="cursor-pointer"
                @click="initRecordWorkflow"
              >
                {{ t('home.record.title') }}
              </ui-list-item>
            </ui-list>
          </ui-popover>
        </div>
        <workflows-folder v-model="state.activeFolder" class="mt-6" />
      </div>
      <div
        class="workflows-list flex-1 lg:ml-8"
        style="min-height: calc(100vh - 8rem)"
        @dblclick="clearSelectedWorkflows"
      >
        <div class="flex flex-wrap items-center">
          <div class="flex w-full items-center md:w-auto">
            <ui-input
              id="search-input"
              v-model="state.query"
              class="flex-1 md:w-auto"
              :placeholder="`${t(`common.search`)}... (${
                shortcut['action:search'].readable
              })`"
              prepend-icon="riSearch2Line"
            />
            <ui-popover>
              <template #trigger>
                <ui-button variant="accent" class="ml-4 lg:hidden">
                  <v-remixicon name="riAddLine" class="mr-2 -ml-1" />
                  <span>{{ t('common.workflow') }}</span>
                </ui-button>
              </template>
              <ui-list class="space-y-1">
                <ui-list-item
                  v-close-popover
                  class="cursor-pointer"
                  @click="addWorkflowModal.show = true"
                >
                  {{ t('workflow.new') }}
                </ui-list-item>
                <ui-list-item
                  v-close-popover
                  class="cursor-pointer"
                  @click="openImportDialog"
                >
                  {{ t('workflow.import') }}
                </ui-list-item>
                <ui-list-item
                  v-close-popover
                  class="cursor-pointer"
                  @click="initRecordWorkflow"
                >
                  {{ t('home.record.title') }}
                </ui-list-item>
              </ui-list>
            </ui-popover>
          </div>
          <div class="grow"></div>
          <div class="mt-4 flex w-full items-center md:mt-0 md:w-auto">
            <span v-tooltip:bottom.group="t('workflow.backupCloud')" class="mr-4">
              <ui-button tag="router-link" to="/backup" class="inline-block" icon>
                <v-remixicon name="riDatabase2Line" />
              </ui-button>
            </span>
            <div class="workflow-sort flex flex-1 items-center">
              <ui-button
                icon
                class="rounded-r-none border-r border-gray-300 dark:border-gray-700"
                @click="state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc'"
              >
                <v-remixicon
                  :name="state.sortOrder === 'asc' ? 'riSortAsc' : 'riSortDesc'"
                />
              </ui-button>
              <ui-select
                v-model="state.sortBy"
                :placeholder="t('sort.sortBy')"
                class="flex-1"
              >
                <option v-for="sort in sorts" :key="sort" :value="sort">
                  {{ t(`sort.${sort}`) }}
                </option>
              </ui-select>
            </div>
          </div>
        </div>
        <div class="mt-6 flex-1">
          <workflows-local
            v-model:per-page="state.perPage"
            :search="state.query"
            :folder-id="state.activeFolder"
            :sort="{ by: state.sortBy, order: state.sortOrder }"
          />
        </div>
        <ui-card
          v-if="workflowStore.isFirstTime"
          class="first-card relative mt-8 dark:text-gray-200"
        >
          <v-remixicon
            name="riCloseLine"
            class="absolute top-4 right-4 cursor-pointer"
            @click="workflowStore.isFirstTime = false"
          />
          <p>Create your first workflow by recording your actions:</p>
          <ol class="list-inside list-decimal">
            <li>Open your browser and go to your destination URL</li>
            <li>
              Click the "Record workflow" button, and do your simple repetitive task
            </li>
            <li>
              Add blocks, selectors, delays, and data steps until the flow does exactly
              what you need.
            </li>
          </ol>
        </ui-card>
      </div>
    </div>
    <ui-modal v-model="addWorkflowModal.show" title="Workflow">
      <ui-input
        v-model="addWorkflowModal.name"
        :placeholder="t('common.name')"
        autofocus
        class="mb-4 w-full"
        @keyup.enter="
          addWorkflowModal.type === 'manual' ? addWorkflow() : startRecordWorkflow()
        "
      />
      <ui-textarea
        v-model="addWorkflowModal.description"
        :placeholder="t('common.description')"
        height="165px"
        class="w-full dark:text-gray-200"
        max="300"
      />
      <p class="mb-6 text-right text-gray-600 dark:text-gray-200">
        {{ addWorkflowModal.description.length }}/300
      </p>
      <div class="flex space-x-2">
        <ui-button class="w-full" @click="clearAddWorkflowModal">
          {{ t('common.cancel') }}
        </ui-button>
        <ui-button
          variant="accent"
          class="w-full"
          @click="
            addWorkflowModal.type === 'manual' ? addWorkflow() : startRecordWorkflow()
          "
        >
          {{
            addWorkflowModal.type === 'manual' ? t('common.add') : t('home.record.button')
          }}
        </ui-button>
      </div>
    </ui-modal>
    <shared-permissions-modal
      v-model="permissionState.showModal"
      :permissions="permissionState.items"
    />
  </div>
</template>
<script setup>
import SharedPermissionsModal from '@/components/dashboard/shared/SharedPermissionsModal.vue';
import WorkflowsFolder from '@/components/dashboard/workflows/WorkflowsFolder.vue';
import WorkflowsLocal from '@/components/dashboard/workflows/WorkflowsLocal.vue';
import { useGroupTooltip } from '@/composable/groupTooltip';
import { useShortcut } from '@/composable/shortcut';
import recordWorkflow from '@/dashboard/utils/startRecordWorkflow';
import {
  getExtensionStorageValue,
  setExtensionStorageValue,
} from '@/lib/extensionStorage';
import { useWorkflowStore } from '@/stores/workflow';
import { getWorkflowPermissions, importWorkflow } from '@/utils/workflowData';
import { onMounted, shallowReactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
useGroupTooltip();
const { t } = useI18n();
const router = useRouter();
const workflowStore = useWorkflowStore();
const sorts = ['name', 'createdAt', 'updatedAt', 'mostUsed'];
const state = shallowReactive({
  query: '',
  activeFolder: '',
  perPage: 18,
  sortBy: 'createdAt',
  sortOrder: 'desc',
});
const addWorkflowModal = shallowReactive({
  name: '',
  show: false,
  type: 'manual',
  description: '',
});
const permissionState = shallowReactive({
  items: [],
  showModal: false,
});
const clearAddWorkflowModal = () => {
  Object.assign(addWorkflowModal, {
    name: '',
    show: false,
    type: 'manual',
    description: '',
  });
};
const initRecordWorkflow = () => {
  addWorkflowModal.show = true;
  addWorkflowModal.type = 'recording';
};
const startRecordWorkflow = () => {
  recordWorkflow({
    name: addWorkflowModal.name,
    description: addWorkflowModal.description,
  }).then(() => {
    router.push('/recording');
  });
};
const addWorkflow = () => {
  workflowStore
    .insert({
      name: addWorkflowModal.name,
      folderId: state.activeFolder,
      description: addWorkflowModal.description,
    })
    .then((workflows) => {
      const workflowId = Object.keys(workflows)[0];
      router.push(`/workflows/${workflowId}`);
    })
    .finally(clearAddWorkflowModal);
};
const checkWorkflowPermissions = async (workflows) => {
  let requiredPermissions = [];
  for (const workflow of workflows) {
    if (workflow.drawflow) {
      const permissions = await getWorkflowPermissions(workflow.drawflow);
      requiredPermissions.push(...permissions);
    }
  }
  requiredPermissions = Array.from(new Set(requiredPermissions));
  if (requiredPermissions.length === 0) return;
  permissionState.items = requiredPermissions;
  permissionState.showModal = true;
};
const openImportDialog = async () => {
  try {
    const workflows = await importWorkflow({ multiple: true });
    await checkWorkflowPermissions(Object.values(workflows));
  } catch (error) {
    console.error(error);
  }
};
const shortcut = useShortcut(['action:search', 'action:new'], ({ id }) => {
  if (id === 'action:search') {
    const searchInput = document.querySelector('#search-input input');
    searchInput?.focus();
  } else {
    addWorkflowModal.show = true;
  }
});
watch(
  () => [state.sortOrder, state.sortBy, state.perPage],
  ([sortOrder, sortBy, perPage]) => {
    setExtensionStorageValue('local', 'workflow-sorts', { sortOrder, sortBy, perPage });
  }
);
onMounted(async () => {
  const savedSorts =
    (await getExtensionStorageValue('local', 'workflow-sorts', {})) || {};
  state.perPage = savedSorts.perPage || 18;
  state.sortBy = savedSorts.sortBy || 'createdAt';
  state.sortOrder = savedSorts.sortOrder || 'desc';
});
</script>
<style>
@reference "../../../assets/css/tailwind.css";

.workflow-sort select {
  @apply rounded-l-none;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
}
.workflows-container {
  @apply grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4;
}

.first-card {
  a {
    @apply text-blue-400 underline;
  }
}
</style>
