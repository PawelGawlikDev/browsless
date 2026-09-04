import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import Packages from './pages/Packages.vue';
import Workflows from './pages/workflows/index.vue';
import WorkflowContainer from './pages/Workflows.vue';
import WorkflowDetails from './pages/workflows/[id].vue';
import ScheduledWorkflow from './pages/ScheduledWorkflow.vue';
import Storage from './pages/Storage.vue';
import StorageTables from './pages/storage/Tables.vue';
import LogsDetails from './pages/logs/[id].vue';
import Recording from './pages/Recording.vue';
import Settings from './pages/Settings.vue';
import SettingsIndex from './pages/settings/SettingsIndex.vue';
import SettingsShortcuts from './pages/settings/SettingsShortcuts.vue';
import SettingsBackup from './pages/settings/SettingsBackup.vue';
import SettingsEditor from './pages/settings/SettingsEditor.vue';
import DocsIndex from './pages/DocsIndex.vue';
import DocsArticle from './pages/DocsArticle.vue';

const routes: RouteRecordRaw[] = [
  {
    name: 'home',
    path: '/',
    redirect: '/workflows',
  },
  {
    name: 'packages',
    path: '/packages',
    component: Packages,
  },
  {
    name: 'recording',
    path: '/recording',
    component: Recording,
  },
  {
    name: 'packages-details',
    path: '/packages/:id',
    component: WorkflowDetails,
  },
  {
    path: '/workflows',
    component: WorkflowContainer,
    children: [
      {
        path: '',
        name: 'workflows',
        component: Workflows,
      },
      {
        path: ':id',
        name: 'workflows-details',
        component: WorkflowDetails,
      },
    ],
  },
  {
    name: 'schedule',
    path: '/schedule',
    component: ScheduledWorkflow,
  },
  {
    name: 'storage',
    path: '/storage',
    component: Storage,
  },
  {
    name: 'storage-tables',
    path: '/storage/tables/:id',
    component: StorageTables,
  },
  {
    name: 'logs-details',
    path: '/logs/:id?/:mode?',
    component: LogsDetails,
  },
  {
    name: 'docs',
    path: '/docs',
    component: DocsIndex,
  },
  {
    name: 'docs-article',
    path: '/docs/:section/:slug',
    component: DocsArticle,
  },
  {
    path: '/settings',
    component: Settings,
    children: [
      { path: '', component: SettingsIndex },
      { path: '/backup', component: SettingsBackup },
      { path: '/editor', component: SettingsEditor },
      { path: '/shortcuts', component: SettingsShortcuts },
    ],
  },
];

export default createRouter({
  routes,
  history: createWebHashHistory(),
});
