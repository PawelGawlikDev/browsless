import { extensionStorage } from '@/lib/extensionStorage';
import type { SavedPackage } from '@/types/models';
import firstPackages from '@/utils/firstPackages';
import { defineStore } from 'pinia';
import { nanoid } from 'nanoid';
const defaultPackage: SavedPackage = {
  id: '',
  name: '',
  icon: 'mdiPackageVariantClosed',
  isExtenal: false,
  content: null,
  inputs: [],
  outputs: [],
  variable: [],
  settings: {
    asBlock: false,
  },
  data: {
    edges: [],
    nodes: [],
  },
};
const clonePackage = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};
export const usePackageStore = defineStore('packages', {
  storageMap: {
    packages: 'savedBlocks',
  },
  state: () => ({
    packages: [] as SavedPackage[],
    retrieved: false,
  }),
  getters: {
    getById: (state) => (pkgId: string) => {
      return state.packages.find((pkg) => pkg.id === pkgId);
    },
  },
  actions: {
    async insert(data: Partial<SavedPackage>, newId = true) {
      const packageData = {
        ...defaultPackage,
        ...data,
        createdAt: Date.now(),
      } as SavedPackage;
      if (newId) packageData.id = nanoid();
      this.packages.push(packageData);
      await this.saveToStorage('packages');
      return packageData;
    },
    async update({ id, data }: { id: string; data: Partial<SavedPackage> }) {
      const index = this.packages.findIndex((pkg) => pkg.id === id);
      if (index === -1) return null;
      Object.assign(this.packages[index], data);
      await this.saveToStorage('packages');
      return this.packages[index];
    },
    async delete(id: string) {
      const index = this.packages.findIndex((pkg) => pkg.id === id);
      if (index === -1) return null;
      const data = this.packages[index];
      this.packages.splice(index, 1);
      await this.saveToStorage('packages');
      return data;
    },
    async loadData(force = false) {
      if (this.retrieved && !force) return this.packages;
      const { savedBlocks, starterPackagesSeeded } = await extensionStorage.local.get([
        'savedBlocks',
        'starterPackagesSeeded',
      ]);
      let localPackages = (savedBlocks as SavedPackage[] | null | undefined) || [];
      if (!starterPackagesSeeded && localPackages.length === 0) {
        localPackages = (firstPackages as SavedPackage[]).map((item) =>
          clonePackage(item)
        );
        await extensionStorage.local.set({
          savedBlocks: localPackages,
          starterPackagesSeeded: true,
        });
      }
      this.packages = localPackages;
      this.retrieved = true;
      return this.packages;
    },
  },
});
