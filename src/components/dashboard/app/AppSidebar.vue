<template>
  <aside
    class="fixed left-0 top-0 z-50 flex h-screen w-18 flex-col items-center border-r border-white/10 bg-slate-950/95 py-6 text-slate-400 backdrop-blur"
  >
    <img
      :title="`v${extensionVersion}`"
      src="@/assets/logo.svg"
      class="mx-auto mb-4 w-10"
    />
    <div
      class="relative w-full space-y-2 text-center"
      @mouseleave="showHoverIndicator = false"
    >
      <div
        v-show="showHoverIndicator"
        ref="hoverIndicator"
        class="absolute left-1/2 h-10 w-10 rounded-lg bg-slate-700/90 transition-transform duration-200 dark:bg-slate-800"
        style="transform: translate(-50%, 0)"
      ></div>
      <router-link
        v-for="tab in tabs"
        v-slot="{ href, navigate, isActive }"
        :key="tab.id"
        :to="tab.path"
        custom
      >
        <a
          v-tooltip:right.group="
            `${t(`common.${tab.id}`, 2)} ${tab.shortcut && `(${tab.shortcut.readable})`}`
          "
          :class="{ 'is-active': isActive }"
          :href="tab.id === 'log' ? '#' : href"
          class="tab relative z-10 flex w-full items-center justify-center text-slate-300 transition-colors hover:text-white"
          @click="navigateLink($event, navigate, tab)"
          @mouseenter="hoverHandler"
        >
          <div class="inline-block rounded-lg p-2 transition-colors">
            <v-remixicon :name="tab.icon" />
          </div>
          <span
            v-if="tab.id === 'log' && runningWorkflowsLen > 0"
            class="absolute -top-1 right-2 h-4 w-4 rounded-full bg-accent text-xs text-white dark:text-black"
          >
            {{ runningWorkflowsLen }}
          </span>
        </a>
      </router-link>
    </div>
    <hr class="my-4 w-8/12 border-white/10" />
    <button
      v-tooltip:right.group="$t('home.elementSelector.name')"
      class="text-slate-300 transition-colors hover:text-white focus:ring-0"
      @click="injectElementSelector"
    >
      <v-remixicon name="riFocus3Line" />
    </button>
    <div class="grow"></div>
  </aside>
</template>
<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { browser } from 'wxt/browser';
import { getExtensionManifest } from '@/utils/extensionManifest';
import { useWorkflowStore } from '@/stores/workflow';
import { useShortcut, getShortcut } from '@/composable/shortcut';
import { useGroupTooltip } from '@/composable/groupTooltip';
import { initElementSelector } from '@/dashboard/utils/elementSelector';
import emitter from '@/lib/mitt';
useGroupTooltip();
const { t } = useI18n();
const toast = useToast();
const router = useRouter();
const workflowStore = useWorkflowStore();
const extensionVersion = getExtensionManifest().version;
const tabs = [
  {
    id: 'workflow',
    icon: 'riFlowChart',
    path: '/workflows',
    shortcut: getShortcut('page:workflows', '/workflows'),
  },
  {
    id: 'packages',
    icon: 'mdiPackageVariantClosed',
    path: '/packages',
  },
  {
    id: 'schedule',
    icon: 'riTimeLine',
    path: '/schedule',
    shortcut: getShortcut('page:schedule', '/triggers'),
  },
  {
    id: 'storage',
    icon: 'riHardDrive2Line',
    path: '/storage',
    shortcut: getShortcut('page:storage', '/storage'),
  },
  {
    id: 'log',
    icon: 'riHistoryLine',
    path: '/logs',
    shortcut: getShortcut('page:logs', '/logs'),
  },
  {
    id: 'docs',
    icon: 'riArticleLine',
    path: '/docs',
  },
  {
    id: 'settings',
    icon: 'riSettings3Line',
    path: '/settings',
    shortcut: getShortcut('page:settings', '/settings'),
  },
];
const hoverIndicator = ref(null);
const showHoverIndicator = ref(false);
const runningWorkflowsLen = computed(() => workflowStore.getAllStates.length);
useShortcut(
  tabs.reduce((acc, { shortcut }) => {
    if (shortcut) {
      acc.push(shortcut);
    }
    return acc;
  }, []),
  ({ data }) => {
    if (!data) return;
    if (data.includes('/logs')) {
      emitter.emit('ui:logs', { show: true });
      return;
    }
    router.push(data);
  }
);
const navigateLink = (event, navigateFn, tab) => {
  event.preventDefault();
  if (tab.id === 'log') {
    emitter.emit('ui:logs', { show: true });
  } else {
    navigateFn();
  }
};
const hoverHandler = ({ target }) => {
  showHoverIndicator.value = true;
  hoverIndicator.value.style.transform = `translate(-50%, ${target.offsetTop}px)`;
};
const injectElementSelector = async () => {
  try {
    const [tab] = await browser.tabs.query({ active: true, url: '*://*/*' });
    if (!tab) {
      toast.error(t('home.elementSelector.noAccess'));
      return;
    }
    await initElementSelector();
  } catch (error) {
    console.error(error);
  }
};
</script>
<style scoped>
.tab.is-active:after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 4px;
  background-color: rgb(var(--color-accent));
}

.tab.is-active {
  color: white;
}
</style>
