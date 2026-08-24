import { storage } from '#imports';
type StorageArea = 'local' | 'session';
type StorageKey = `${StorageArea}:${string}`;
type StorageChanges = Record<
  string,
  {
    newValue: unknown;
    oldValue: unknown;
  }
>;
const getStorageKey = (area: StorageArea, key: string): StorageKey => {
  return `${area}:${key}`;
};
const get = async (area: StorageArea, keys: string | string[]) => {
  if (Array.isArray(keys)) {
    const entries = await Promise.all(
      keys.map(async (key) => [key, await storage.getItem(getStorageKey(area, key))])
    );
    return Object.fromEntries(entries);
  }
  return {
    [keys]: await storage.getItem(getStorageKey(area, keys)),
  };
};
const set = async (area: StorageArea, values: Record<string, unknown>) => {
  await Promise.all(
    Object.entries(values).map(([key, value]) =>
      storage.setItem(getStorageKey(area, key), value)
    )
  );
};
const remove = async (area: StorageArea, keys: string | string[]) => {
  const list = Array.isArray(keys) ? keys : [keys];
  await Promise.all(list.map((key) => storage.removeItem(getStorageKey(area, key))));
};
const watch = (
  area: StorageArea,
  key: string,
  callback: (changes: StorageChanges) => void
) => {
  return storage.watch(getStorageKey(area, key), (newValue, oldValue) => {
    callback({
      [key]: {
        newValue,
        oldValue,
      },
    });
  });
};
export const extensionStorage = {
  local: {
    get: (keys: string | string[]) => get('local', keys),
    set: (values: Record<string, unknown>) => set('local', values),
    remove: (keys: string | string[]) => remove('local', keys),
    watch: (key: string, callback: (changes: StorageChanges) => void) =>
      watch('local', key, callback),
  },
  session: {
    get: (keys: string | string[]) => get('session', keys),
    set: (values: Record<string, unknown>) => set('session', values),
    remove: (keys: string | string[]) => remove('session', keys),
    watch: (key: string, callback: (changes: StorageChanges) => void) =>
      watch('session', key, callback),
  },
};
export const getExtensionStorageValue = async <T>(
  area: StorageArea,
  key: string,
  fallback?: T
) => {
  const value = await storage.getItem<T>(getStorageKey(area, key));
  return (value ?? fallback) as T | null | undefined;
};
export const setExtensionStorageValue = (
  area: StorageArea,
  key: string,
  value: unknown
) => {
  return storage.setItem(getStorageKey(area, key), value);
};
export const removeExtensionStorageValue = (area: StorageArea, key: string) => {
  return storage.removeItem(getStorageKey(area, key));
};
export const watchExtensionStorageValue = <T>(
  area: StorageArea,
  key: string,
  callback: (newValue: T | null, oldValue: T | null) => void
) => {
  return storage.watch<T>(getStorageKey(area, key), callback);
};
