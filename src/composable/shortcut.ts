import { getExtensionStorageValue } from '@/lib/extensionStorage';
import { onUnmounted, onMounted, reactive } from 'vue';
import defu from 'defu';
import Mousetrap from 'mousetrap';
import { isObject } from '@/utils/helper';
type ShortcutData = Record<string, unknown>;
export type ShortcutDefinition = {
  id: string;
  combo: string;
  readable?: string;
  data?: ShortcutData;
} & ShortcutData;
type ShortcutInput =
  | string
  | ShortcutDefinition
  | {
      id: string;
      data?: ShortcutData;
    }
  | Array<string | ShortcutDefinition>;
type ShortcutHandlerParams = ShortcutDefinition & {
  event: KeyboardEvent;
};
type ShortcutHandler = (params: ShortcutHandlerParams, event: KeyboardEvent) => void;
type ShortcutMap = Record<string, ShortcutDefinition>;
type ReadableShortcutToken = 'option' | 'mod';
type PlatformKey = 'mac' | 'win';
type MousetrapWithStopCallback = typeof Mousetrap & {
  prototype: {
    stopCallback: (event: KeyboardEvent, element: Element, combo: string) => boolean;
  };
};
const defaultShortcut: ShortcutMap = {
  'page:dashboard': {
    id: 'page:dashboard',
    combo: 'option+1',
  },
  'page:workflows': {
    id: 'page:workflows',
    combo: 'option+w',
  },
  'page:schedule': {
    id: 'page:schedule',
    combo: 'option+t',
  },
  'page:logs': {
    id: 'page:logs',
    combo: 'option+l',
  },
  'page:storage': {
    id: 'page:storage',
    combo: 'option+a',
  },
  'page:settings': {
    id: 'page:settings',
    combo: 'option+s',
  },
  'action:search': {
    id: 'action:search',
    combo: 'mod+f',
  },
  'action:new': {
    id: 'action:new',
    combo: 'mod+option+n',
  },
  'editor:duplicate-block': {
    id: 'editor:duplicate-block',
    combo: 'mod+option+d',
  },
  'editor:search-blocks': {
    id: 'editor:search-blocks',
    combo: 'mod+b',
  },
  'editor:save': {
    id: 'editor:save',
    combo: 'mod+shift+s',
  },
  'editor:execute-workflow': {
    id: 'editor:execute-workflow',
    combo: 'option+enter',
  },
  'editor:toggle-sidebar': {
    id: 'editor:toggle-sidebar',
    combo: 'mod+[',
  },
};
export const mapShortcuts = reactive(defu({}, defaultShortcut));
getExtensionStorageValue<Partial<ShortcutMap>>('local', 'shortcuts', {}).then(
  (customShortcut) => {
    Object.assign(mapShortcuts, defu(customShortcut || {}, defaultShortcut));
  }
);
const os: PlatformKey = navigator.appVersion.includes('Mac') ? 'mac' : 'win';
export const getReadableShortcut = (str: string) => {
  const list: Record<ReadableShortcutToken, Record<PlatformKey, string>> = {
    option: {
      win: 'alt',
      mac: 'option',
    },
    mod: {
      win: 'ctrl',
      mac: '⌘',
    },
  };
  const regex = /option|mod/g;
  const replacedStr = str.replace(regex, (match) => {
    const token = match as ReadableShortcutToken;
    return list[token][os];
  });
  return replacedStr;
};
export const getShortcut = (id: string, data?: ShortcutData): ShortcutDefinition => {
  const shortcut = (mapShortcuts[id] || { id, combo: '' }) as ShortcutDefinition;
  if (data) shortcut.data = data;
  if (!shortcut.readable) {
    shortcut.readable = getReadableShortcut(shortcut.combo);
  }
  return shortcut;
};
export const useShortcut = (shortcuts: ShortcutInput, handler?: ShortcutHandler) => {
  (Mousetrap as MousetrapWithStopCallback).prototype.stopCallback = () => false;
  const extractedShortcuts = {
    ids: {} as Record<string, string>,
    keys: [] as string[],
    data: {} as Record<string, ShortcutDefinition>,
  };
  const handleShortcut = (event: KeyboardEvent, combo: string) => {
    const shortcutId = extractedShortcuts.ids[combo];
    const params = {
      event,
      ...extractedShortcuts.data[shortcutId],
    };
    if (shortcutId) event.preventDefault();
    if (typeof params.data === 'function') {
      (params.data as ShortcutHandler)(params, event);
    } else if (handler) {
      handler(params, event);
    }
  };
  const addShortcutData = ({ combo, id, readable, ...rest }: ShortcutDefinition) => {
    extractedShortcuts.ids[combo] = id;
    extractedShortcuts.keys.push(combo);
    extractedShortcuts.data[id] = { combo, id, readable, ...rest };
  };
  if (typeof shortcuts === 'string') {
    addShortcutData(getShortcut(shortcuts));
  } else if (Array.isArray(shortcuts)) {
    shortcuts.forEach((item) => {
      const currentShortcut = typeof item === 'string' ? getShortcut(item) : item;
      addShortcutData(currentShortcut);
    });
  } else if (isObject(shortcuts)) {
    const shortcut = shortcuts as
      | ShortcutDefinition
      | {
          id: string;
          data?: ShortcutData;
        };
    addShortcutData(getShortcut(shortcut.id, shortcut.data));
  }
  onMounted(() => {
    Mousetrap.bind(extractedShortcuts.keys, handleShortcut);
  });
  onUnmounted(() => {
    Mousetrap.unbind(extractedShortcuts.keys);
  });
  return extractedShortcuts.data;
};
