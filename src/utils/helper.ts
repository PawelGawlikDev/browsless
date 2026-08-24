import {
  getExtensionStorageValue,
  removeExtensionStorageValue,
} from '@/lib/extensionStorage';
import type { DrawflowData, Workflow, WorkflowNode } from '@/types/models';
import type { TriggerSearchDrawflow } from '@/types/utils';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import { browser } from 'wxt/browser';
const storageCache = {
  runCounts: {} as Record<string, number>,
};
getExtensionStorageValue('local', 'runCounts', {}).then((runCounts) => {
  storageCache.runCounts = runCounts || {};
});
export const getActiveTab = async () => {
  try {
    const tabsQuery: chrome.tabs.QueryInfo = {
      active: true,
      url: '*://*/*',
    };
    const window = await browser.windows.getLastFocused({
      populate: true,
      windowTypes: ['normal'],
    });
    const windowId = window.id;
    if (windowId) tabsQuery.windowId = windowId;
    else tabsQuery.lastFocusedWindow = true;
    const [tab] = await browser.tabs.query(tabsQuery);
    return tab;
  } catch (error) {
    console.error(error);
    return null;
  }
};
export const isXPath = (str: string) => {
  const regex = /^([(/@]|id\()/;
  return regex.test(str);
};
export const visibleInViewport = (element: Element) => {
  const { top, left, bottom, right, height, width } = element.getBoundingClientRect();
  if (height === 0 || width === 0) return false;
  return (
    top >= 0 &&
    left >= 0 &&
    bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};
export const sleep = (timeout = 500) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
};
export const findTriggerBlock = (drawflow: TriggerSearchDrawflow = {}) => {
  if (!drawflow) return null;
  const legacyDrawflow = drawflow as {
    drawflow?: {
      Home?: {
        data?: Record<
          string,
          WorkflowNode & {
            name?: string;
          }
        >;
      };
    };
  };
  if (legacyDrawflow.drawflow) {
    const blocks = Object.values(legacyDrawflow.drawflow.Home?.data ?? {});
    if (!blocks) return null;
    return (
      blocks as Array<
        WorkflowNode & {
          name?: string;
        }
      >
    ).find(({ name }) => name === 'trigger');
  }
  if ('nodes' in drawflow && drawflow.nodes) {
    return drawflow.nodes.find((node) => node.label === 'trigger');
  }
  return null;
};
export const throttle = <TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  limit: number
) => {
  let waiting = false;
  return (...args: TArgs) => {
    if (!waiting) {
      callback(...args);
      waiting = true;
      setTimeout(() => {
        waiting = false;
      }, limit);
    }
  };
};
export const convertArrObjTo2DArr = (arr: Record<string, unknown>[]) => {
  const keyIndex = new Map();
  const values: unknown[][] = [[]];
  arr.forEach((obj) => {
    const keys = Object.keys(obj);
    const row = [];
    keys.forEach((key) => {
      if (!keyIndex.has(key)) {
        keyIndex.set(key, keyIndex.size);
        values[0].push(key);
      }
      const value = obj[key];
      const rowIndex = keyIndex.get(key) as number;
      row[rowIndex] = typeof value === 'object' ? JSON.stringify(value) : value;
    });
    values.push([...row]);
  });
  return values;
};
export const convert2DArrayToArrayObj = (values: unknown[][]) => {
  let keyIndex = 0;
  const keys = (values.shift() || []) as string[];
  const result: Record<string, unknown>[] = [];
  for (let columnIndex = 0; columnIndex < values.length; columnIndex += 1) {
    const currentColumn: Record<string, unknown> = {};
    for (let rowIndex = 0; rowIndex < values[columnIndex].length; rowIndex += 1) {
      let key = keys[rowIndex];
      if (!key) {
        keyIndex += 1;
        key = `_row${keyIndex}`;
        keys.push(key);
      }
      currentColumn[key] = values[columnIndex][rowIndex];
    }
    result.push(currentColumn);
  }
  return result;
};
export const parseJSON = <T = unknown>(data, def?: T): T => {
  try {
    const result = JSON.parse(data);
    return result as T;
  } catch {
    return def as T;
  }
};
export const parseFlow = <T = DrawflowData>(flow: string | T) => {
  const obj = typeof flow === 'string' ? parseJSON<T>(flow, {} as T) : flow;
  return obj;
};
export const replaceMustache = (str: string, replacer: (...args: string[]) => string) => {
  return str.replace(/\{\{(.*?)\}\}/g, replacer);
};
export const openFilePicker = (
  acceptedFileTypes: string[] | string = [],
  attrs: Record<string, unknown> = {}
) => {
  return new Promise<File[]>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = Array.isArray(acceptedFileTypes)
      ? acceptedFileTypes.join(',')
      : acceptedFileTypes;
    Object.entries(attrs).forEach(([key, value]) => {
      input[key] = value;
    });
    input.onchange = (event) => {
      const { files } = event.target as HTMLInputElement;
      const validFiles: File[] = [];
      Array.from(files).forEach((file) => {
        if (Array.isArray(acceptedFileTypes) && acceptedFileTypes.length > 0) {
          if (!acceptedFileTypes.includes(file.type)) return;
        }
        validFiles.push(file);
      });
      resolve(validFiles);
    };
    input.click();
  });
};
export const fileSaver = (filename: string, data: string) => {
  const anchor = document.createElement('a');
  anchor.download = filename;
  anchor.href = data;
  anchor.dispatchEvent(new MouseEvent('click'));
  anchor.remove();
};
export const countDuration = (started: number, ended: number) => {
  const duration = Math.round((ended - started) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  const getText = (num, suffix) => (num > 0 ? `${num}${suffix}` : '');
  return `${getText(minutes, 'm')} ${seconds}s`;
};
export const toCamelCase = (str: string, capitalize = false) => {
  const result = str.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
    return index === 0 && !capitalize ? letter.toLowerCase() : letter.toUpperCase();
  });
  return result.replace(/\s+|[-]/g, '');
};
export const isObject = <T extends object = Record<string, unknown>>(
  obj: unknown
): obj is T => {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
};
export const objectHasKey = <T extends object>(
  obj: T,
  key: PropertyKey
): key is keyof T => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};
export const isWhitespace = (str: string) => {
  return !/\S/.test(str);
};
export const debounce = <TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  time = 200
) => {
  let interval: ReturnType<typeof setTimeout> | null;
  return (...args: TArgs) => {
    if (interval) clearTimeout(interval);
    return new Promise<void>((resolve) => {
      interval = setTimeout(() => {
        interval = null;
        callback(...args);
        resolve();
      }, time);
    });
  };
};
export const clearCache = async (workflow: Workflow) => {
  try {
    await BrowserAPIService.storage.local.remove(`state:${workflow.id}`);
    const flows = parseJSON<Record<string, unknown> | DrawflowData>(
      workflow.drawflow as unknown as string,
      null as unknown as DrawflowData
    );
    const blocks =
      (
        flows as {
          drawflow?: {
            Home?: {
              data?: Record<
                string,
                WorkflowNode & {
                  name?: string;
                }
              >;
            };
          };
        }
      )?.drawflow?.Home?.data || null;
    if (blocks) {
      Object.values(blocks).forEach(({ name, id }) => {
        if (name !== 'loop-data') return;
        removeExtensionStorageValue('local', `index:${id}`);
      });
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};
export const arraySorter = <
  T extends Record<string, unknown> & {
    id?: string;
  },
>({
  data,
  key,
  order = 'asc',
}: {
  data: T[];
  key: keyof T | 'mostUsed';
  order?: 'asc' | 'desc';
}) => {
  let runCounts: Record<string, number> = {};
  const copyData = data.slice();
  if (key === 'mostUsed') {
    runCounts = storageCache.runCounts || {};
  }
  return copyData.sort((a, b) => {
    let comparison = 0;
    let itemA: string | number = String(
      (key === 'mostUsed' ? a : a[key as keyof T]) || ''
    );
    let itemB: string | number = String(
      (key === 'mostUsed' ? b : b[key as keyof T]) || ''
    );
    if (key === 'mostUsed') {
      itemA = runCounts[String(a.id)] || 0;
      itemB = runCounts[String(b.id)] || 0;
    }
    if (itemA > itemB) {
      comparison = 1;
    } else if (itemA < itemB) {
      comparison = -1;
    }
    return order === 'desc' ? comparison * -1 : comparison;
  });
};
