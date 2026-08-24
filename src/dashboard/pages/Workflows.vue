<template>
  <div class="flex flex-col">
    <div class="flex h-10 items-center border-b">
      <draggable
        v-model="state.tabs"
        item-key="id"
        class="scroll scroll-xs flex h-full items-center overflow-auto text-sm text-gray-600 dark:text-gray-300"
      >
        <template #item="{ element: tab, index }">
          <button
            :value="tab.id"
            :class="[
              state.activeTab === tab.id
                ? 'border-accent dark:border-accent'
                : 'border-transparent dark:border-transparent',
              {
                'bg-box-transparent text-black dark:text-gray-100':
                  state.activeTab === tab.id,
              },
            ]"
            class="workflow-tab flex h-full cursor-default items-center border-b-2 px-4 text-slate-600 transition-colors focus:ring-0 dark:text-slate-300"
            @click="state.activeTab = tab.id"
          >
            <p :title="tab.name" class="text-overflow mr-2 max-w-[170px] flex-1">
              {{ tab.name }}
            </p>
            <span
              class="workflow-tab-icon rounded-full p-0.5 text-slate-500 transition-colors dark:text-slate-300"
              title="Close tab"
              @click.stop="closeTab(index, tab)"
            >
              <v-remixicon name="riCloseLine" size="20" />
            </span>
          </button>
        </template>
      </draggable>
      <button
        class="workflow-tab-add h-full px-2 text-slate-500 transition-colors dark:text-slate-300"
        @click="addTab()"
      >
        <v-remixicon name="riAddLine" />
      </button>
    </div>
    <div class="flex-1">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" :key="$route.fullPath"></component>
        </keep-alive>
      </router-view>
    </div>
  </div>
</template>
<script setup>
import {
  getExtensionStorageValue,
  setExtensionStorageValue,
} from '@/lib/extensionStorage';
import { nanoid } from 'nanoid/non-secure';
import { onMounted, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Draggable from 'vuedraggable';
let tabTitleTimeout = null;
const route = useRoute();
const router = useRouter();
const state = reactive({
  tabs: [],
  activeTab: '',
  tabChanging: false,
});
const addTab = (detail = {}) => {
  const workflowsTab = state.tabs.find(
    (tab) => tab.path === '/' || tab.path === '/workflows'
  );
  if (workflowsTab) {
    state.activeTab = workflowsTab.id;
    return;
  }
  const tabId = nanoid();
  state.tabs.push({
    id: tabId,
    path: '/',
    name: 'Workflows',
    ...detail,
  });
  state.activeTab = tabId;
};
const closeTab = (index, tab) => {
  if (state.tabs.length === 1) {
    state.tabs[0] = {
      path: '/',
      id: nanoid(),
      name: 'Workflows',
    };
  } else {
    state.tabs.splice(index, 1);
  }
  if (tab.id === state.activeTab) {
    state.activeTab = state.tabs[0].id;
  }
};
const getTabTitle = () => {
  if (route.name === 'workflows') return 'Workflows';
  return `${document.title}`.replace(' - Browsless', '');
};
watch(
  () => state.activeTab,
  (id) => {
    const tab = state.tabs.find((item) => item.id === id);
    if (!tab) return;
    state.tabChanging = true;
    setExtensionStorageValue('local', 'activeTab', state.activeTab);
    router.replace(tab.path);
    setTimeout(() => {
      state.tabChanging = false;
    }, 1000);
  }
);
watch(
  () => route.path,
  () => {
    if (state.tabChanging) return;
    const index = state.tabs.findIndex((tab) => tab.id === state.activeTab);
    if (index === -1) return;
    const duplicateTab = state.tabs.find(
      (tab) => tab.path === route.path && tab.id !== state.activeTab
    );
    if (duplicateTab) {
      state.activeTab = duplicateTab.id;
      state.tabs.splice(index, 1);
      return;
    }
    clearTimeout(tabTitleTimeout);
    tabTitleTimeout = setTimeout(() => {
      Object.assign(state.tabs[index], {
        path: route.path,
        name: getTabTitle(),
      });
    }, 1000);
  }
);
watch(
  () => state.tabs,
  () => {
    setExtensionStorageValue('local', 'tabs', state.tabs);
  },
  { deep: true }
);
onMounted(async () => {
  const tabs = await getExtensionStorageValue('local', 'tabs', null);
  if (tabs) {
    state.tabs = Array.isArray(tabs) ? tabs : [];
    const activeTab = await getExtensionStorageValue('local', 'activeTab');
    state.activeTab = activeTab || state.tabs[0]?.id || '';
  }
  if (state.tabs.length !== 0) {
    if (/\/workflows\/.+/.test(route.path)) {
      const routeTab = state.tabs.find((tab) => tab.path === route.path);
      if (routeTab) {
        if (routeTab.id !== state.activeTab) {
          state.activeTab = routeTab.id;
        }
      } else {
        const index = state.tabs.findIndex((tab) => tab.id === state.activeTab);
        if (index !== -1) {
          Object.assign(state.tabs[index], {
            path: route.path,
            name: getTabTitle(),
          });
          setTimeout(() => {
            Object.assign(state.tabs[index], {
              name: getTabTitle(),
            });
          }, 1000);
        }
      }
    }
    return;
  }
  addTab({
    path: route.path,
    name: getTabTitle(),
  });
});
</script>
<style scoped>
.workflow-tab:hover {
  background-color: rgb(226 232 240);
  color: rgb(15 23 42);
}

.workflow-tab:hover .workflow-tab-icon {
  color: rgb(15 23 42);
}

.workflow-tab-add:hover {
  background-color: rgb(226 232 240);
  color: rgb(15 23 42);
}

.dark .workflow-tab:hover,
.dark .workflow-tab-add:hover {
  background-color: rgb(30 41 59);
  color: rgb(241 245 249);
}

.dark .workflow-tab:hover .workflow-tab-icon {
  color: rgb(241 245 249);
}
</style>
