import { extensionStorage } from '@/lib/extensionStorage';
import type { PiniaPluginContext } from 'pinia';
import { markRaw } from 'vue';
import { createPinia } from 'pinia';
const saveToStoragePlugin = ({ store, options }: PiniaPluginContext) => {
  const localStorageArea = markRaw(extensionStorage.local);
  const storageMap =
    (
      options as {
        storageMap?: Record<string, string>;
      }
    ).storageMap || {};
  store.saveToStorage = (key?: string) => {
    const storageKey = key ? storageMap[key] : undefined;
    if (!storageKey || !store.retrieved) return null;
    const value = JSON.parse(
      JSON.stringify(store.$state[key as keyof typeof store.$state])
    );
    return localStorageArea.set({ [storageKey]: value });
  };
};
const pinia = createPinia();
pinia.use(saveToStoragePlugin);
export default pinia;
