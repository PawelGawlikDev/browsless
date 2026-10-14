import { extensionStorage } from '@/lib/extensionStorage';
import type { EditorClipboardState, MainSettings, WorkspaceTab } from '@/types/models';
import { defineStore } from 'pinia';
import defu from 'defu';
import deepmerge from 'lodash.merge';

const defaultSettings: MainSettings = {
  locale: 'en',
  deleteLogAfter: 30,
  logsLimit: 1000,
  editor: {
    minZoom: 0.3,
    maxZoom: 1.3,
    arrow: true,
    snapToGrid: false,
    lineType: 'default',
    saveWhenExecute: false,
    snapGrid: { 0: 15, 1: 15 },
  },
};

export const useStore = defineStore('main', {
  storageMap: {
    tabs: 'tabs',
    settings: 'settings',
  },
  state: () => ({
    tabs: [] as WorkspaceTab[],
    copiedEls: {
      edges: [],
      nodes: [],
    } as EditorClipboardState,
    settings: defaultSettings as MainSettings,
    retrieved: true,
    connectedSheets: [] as unknown[],
    connectedSheetsRetrieved: false,
  }),
  actions: {
    loadSettings() {
      return extensionStorage.local.get('settings').then(({ settings }) => {
        this.settings = defu(
          (settings as Partial<MainSettings> | null | undefined) || {},
          defaultSettings
        ) as MainSettings;
        this.retrieved = true;
      });
    },
    async updateSettings(settings: Partial<MainSettings> = {}) {
      this.settings = deepmerge(this.settings, settings) as MainSettings;
      await this.saveToStorage('settings');
    },
  },
});

// `useStore`'s options-store generics don't infer under this project's
// TypeScript/Pinia combo (see @/utils/workflowData.ts for the original
// workaround) — this is the shape consumers should cast to:
// `useStore() as MainStoreInstance`.
export type MainStoreInstance = ReturnType<typeof useStore> & {
  tabs: WorkspaceTab[];
  copiedEls: EditorClipboardState;
  settings: MainSettings;
  retrieved: boolean;
  connectedSheets: unknown[];
  connectedSheetsRetrieved: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (settings?: Partial<MainSettings>) => Promise<void>;
};
