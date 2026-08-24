import { extensionStorage } from '@/lib/extensionStorage';
import type { Folder } from '@/types/models';
import { defineStore } from 'pinia';
import { nanoid } from 'nanoid';

export const useFolderStore = defineStore('folder', {
  storageMap: {
    items: 'folders',
  },
  state: () => ({
    items: [] as Folder[],
    retrieved: false,
  }),
  actions: {
    async addFolder(name: string) {
      this.items.push({
        name,
        id: nanoid(),
      });

      await this.saveToStorage('items');

      return this.items.at(-1);
    },
    async deleteFolder(id: string) {
      const index = this.items.findIndex((folder) => folder.id === id);
      if (index === -1) return null;

      this.items.splice(index, 1);
      await this.saveToStorage('items');

      return index;
    },
    async updateFolder(id: string, data: Partial<Folder> = {}) {
      const index = this.items.findIndex((folder) => folder.id === id);
      if (index === -1) return null;

      Object.assign(this.items[index], data);
      await this.saveToStorage('items');

      return this.items[index];
    },
    load() {
      return extensionStorage.local.get('folders').then(({ folders }) => {
        const items = (folders as Folder[] | null | undefined) || [];

        this.items = items;
        this.retrieved = true;

        return items;
      });
    },
  },
});
