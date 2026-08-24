<template>
  <template v-if="retrieved">
    <app-sidebar v-if="$route.name !== 'recording'" />
    <main :class="{ 'pl-16': $route.name !== 'recording' }">
      <router-view />
    </main>
    <app-logs />
    <ui-dialog>
      <template #auth></template>
    </ui-dialog>
    <div
      v-if="isUpdated"
      class="fixed bottom-8 left-1/2 z-50 max-w-xl -translate-x-1/2 text-white dark:text-gray-900"
    >
      <div class="flex items-center rounded-lg bg-accent p-4 shadow-2xl">
        <v-remixicon name="riInformationLine" class="mr-3" />
        <p>
          {{ t('updateMessage.text1', { version: currentVersion }) }}
        </p>
        <div class="flex-1" />
        <button class="ml-6 text-gray-200 dark:text-gray-600" @click="isUpdated = false">
          <v-remixicon size="20" name="riCloseLine" />
        </button>
      </div>
    </div>
    <shared-permissions-modal
      v-model="permissionState.showModal"
      :permissions="permissionState.items"
    />
  </template>
  <div v-else class="py-8 text-center">
    <ui-spinner color="text-accent" size="28" />
  </div>
</template>
<script setup>
import iconChrome from '@/assets/logo.svg';
import AppLogs from '@/components/dashboard/app/AppLogs.vue';
import AppSidebar from '@/components/dashboard/app/AppSidebar.vue';
import SharedPermissionsModal from '@/components/dashboard/shared/SharedPermissionsModal.vue';
import { useTheme } from '@/composable/theme';
import dbLogs from '@/db/logs';
import dayjs from '@/lib/dayjs';
import {
  extensionStorage,
  getExtensionStorageValue,
  setExtensionStorageValue,
  watchExtensionStorageValue,
} from '@/lib/extensionStorage';
import emitter from '@/lib/mitt';
import { loadLocaleMessages, setI18nLanguage } from '@/lib/vueI18n';
import { useFolderStore } from '@/stores/folder';
import { useStore } from '@/stores/main';
import { usePackageStore } from '@/stores/package';
import { useWorkflowStore } from '@/stores/workflow';
import dataMigration from '@/utils/dataMigration';
import { MessageListener } from '@/utils/message';
import { getWorkflowPermissions } from '@/utils/workflowData';
import { useHead } from '@vueuse/head';
import { compare } from 'compare-versions';
import { reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { browser } from 'wxt/browser';
import { getExtensionManifest } from '@/utils/extensionManifest';
const iconElement = document.createElement('link');
iconElement.rel = 'icon';
iconElement.href = iconChrome;
document.head.appendChild(iconElement);
window.fromBackground = window.location.href.includes('?fromBackground=true');
const { t } = useI18n();
const route = useRoute();
const store = useStore();
const theme = useTheme();
const router = useRouter();
const folderStore = useFolderStore();
const packageStore = usePackageStore();
const workflowStore = useWorkflowStore();
theme.init();
const retrieved = ref(false);
const isUpdated = ref(false);
const permissionState = reactive({
  permissions: [],
  showModal: false,
});
const currentVersion = getExtensionManifest().version;
const autoDeleteLogs = async () => {
  const deleteAfter = store.settings.deleteLogAfter;
  if (deleteAfter === 'never') return;
  const lastCheck =
    +(await getExtensionStorageValue('local', 'checkDeleteLogs', 0)) ||
    Date.now() - 8.64e7;
  const dayDiff = dayjs().diff(dayjs(lastCheck), 'day');
  if (dayDiff < 1) return;
  const aDayInMs = 8.64e7;
  const maxLogAge = Date.now() - aDayInMs * deleteAfter;
  dbLogs.items
    .where('endedAt')
    .below(maxLogAge)
    .toArray()
    .then((values) => {
      const ids = values.map(({ id }) => id);
      dbLogs.items.bulkDelete(ids);
      dbLogs.ctxData.where('logId').anyOf(ids).delete();
      dbLogs.logsData.where('logId').anyOf(ids).delete();
      dbLogs.histories.where('logId').anyOf(ids).delete();
      setExtensionStorageValue('local', 'checkDeleteLogs', Date.now());
    });
};
const stopRecording = () => {
  if (!window.stopRecording) return;
  window.stopRecording();
};
const messageEvents = {
  'refresh-packages': function () {
    packageStore.loadData(true);
  },
  'open-logs': function (data) {
    emitter.emit('ui:logs', {
      show: true,
      logId: data.logId,
    });
  },
  'workflow:added': function (data) {
    if (data.workflowData) {
      workflowStore
        .insert(data.workflowData, { duplicateId: true })
        .then(async () => {
          try {
            const permissions = await getWorkflowPermissions(data.workflowData);
            if (permissions.length === 0) return;
            permissionState.items = permissions;
            permissionState.showModal = true;
          } catch (error) {
            console.error(error);
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }
  },
  'recording:stop': stopRecording,
  'background--recording:stop': stopRecording,
};
browser.runtime.onMessage.addListener(({ type, data }) => {
  if (!type || !messageEvents[type]) return;
  messageEvents[type](data);
});
watchExtensionStorageValue('local', 'workflowStates', (newValue) => {
  const states = Object.values(newValue || {});
  workflowStore.states = states;
});
useHead(() => {
  const runningWorkflows = workflowStore.popupStates.length;
  return {
    title: 'Dashboard',
    titleTemplate:
      runningWorkflows > 0
        ? `%s (${runningWorkflows} Workflows Running) - Browsless`
        : '%s - Browsless',
  };
});
window.onbeforeunload = () => {
  const runningWorkflows = workflowStore.popupStates.length;
  if (window.isDataChanged || runningWorkflows > 0) {
    return t('message.notSaved');
  }
};
window.addEventListener('message', ({ data }) => {
  if (data?.type !== 'browsless-fetch') return;
  const sendResponse = (result) => {
    const sandbox = document.getElementById('sandbox');
    sandbox.contentWindow.postMessage(
      {
        type: 'fetchResponse',
        data: result,
        id: data.data.id,
      },
      '*'
    );
  };
  MessageListener.sendMessage('fetch', data.data, 'background')
    .then((result) => {
      sendResponse({ isError: false, result });
    })
    .catch((error) => {
      sendResponse({ isError: true, result: error.message });
    });
});
watch(
  () => workflowStore.popupStates,
  () => {
    if (
      !window.fromBackground ||
      workflowStore.popupStates.length !== 0 ||
      route.name !== 'workflows'
    )
      return;
    window.close();
  }
);
(async () => {
  try {
    const prevVersion =
      (await getExtensionStorageValue('local', 'ext-version', '0.0.0')) || '0.0.0';
    const { workflowStates } = await extensionStorage.local.get('workflowStates');
    workflowStore.states = Object.values(workflowStates || {});
    const tabs = await browser.tabs.query({
      url: browser.runtime.getURL('/dashboard.html'),
    });
    const currentWindow = await browser.windows.getCurrent();
    if (currentWindow.type !== 'popup') {
      await browser.tabs.remove([tabs[0].id]);
      return;
    }
    if (tabs.length > 1) {
      const firstTab = tabs.shift();
      await browser.windows.update(firstTab.windowId, { focused: true });
      await browser.tabs.update(firstTab.id, { active: true });
      await browser.tabs.remove(tabs.map((tab) => tab.id));
      return;
    }
    const { isFirstTime } = await extensionStorage.local.get('isFirstTime');
    isUpdated.value = !isFirstTime && compare(currentVersion, prevVersion, '>');
    await Promise.allSettled([
      folderStore.load(),
      store.loadSettings(),
      workflowStore.loadData(),
      packageStore.loadData(),
    ]);
    await loadLocaleMessages(store.settings.locale, 'dashboard');
    setI18nLanguage(store.settings.locale);
    await dataMigration();
    retrieved.value = true;
    const { isRecording } = await extensionStorage.local.get('isRecording');
    if (isRecording) {
      router.push('/recording');
      await browser.action.setBadgeBackgroundColor({
        color: '#ef4444',
      });
      await browser.action.setBadgeText({
        text: 'rec',
      });
    }
    autoDeleteLogs();
  } catch (error) {
    retrieved.value = true;
    console.error(error);
  }
  await setExtensionStorageValue('local', 'ext-version', currentVersion);
})();
</script>
<style>
html,
body {
  background: rgb(248 250 252);
  color: rgb(0 0 0);
  overscroll-behavior: none;
}

.dark html,
.dark body {
  background: rgb(15 23 42);
  color: rgb(241 245 249);
}

body {
  min-height: 100vh;
}

#app {
  height: 100%;
  overscroll-behavior: none;
}

h1,
h2,
h3 {
  color: inherit;
}

.dark h1,
.dark h2,
.dark h3 {
  color: white;
}
</style>
