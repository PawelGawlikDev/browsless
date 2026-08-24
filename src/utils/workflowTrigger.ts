import { extensionStorage } from '@/lib/extensionStorage';
import type { WorkflowNode } from '@/types/models';
import type {
  TriggerBlockData,
  WorkflowTriggerEntry,
  VisitWebTriggerItem,
} from '@/types/runtime';
import cronParser from 'cron-parser';
import dayjs from 'dayjs';
import { browser } from 'wxt/browser';
import { isObject } from './helper';
type TriggerHandler = (
  workflowId: string,
  data: TriggerBlockData
) => Promise<unknown> | unknown;
const asContextTypes = (
  value: string[]
): [chrome.contextMenus.ContextType, ...chrome.contextMenus.ContextType[]] => {
  return value as unknown as [
    chrome.contextMenus.ContextType,
    ...chrome.contextMenus.ContextType[],
  ];
};
export const registerContextMenu = (triggerId: string, data: TriggerBlockData) => {
  return new Promise<void>((resolve, reject) => {
    const documentUrlPatterns = ['https://*/*', 'http://*/*'];
    const contextTypes =
      !data.contextTypes || data.contextTypes.length === 0 ? ['all'] : data.contextTypes;
    const browserContext = browser.contextMenus;
    if (!browserContext) {
      resolve();
      return;
    }
    const workflowId = triggerId.includes(':') ? triggerId.split(':')[1] : triggerId;
    browserContext.create(
      {
        id: workflowId,
        documentUrlPatterns,
        contexts: asContextTypes(contextTypes),
        title: data.contextMenuName,
        parentId: 'browslessContextMenu',
      },
      () => {
        const error = browser.runtime.lastError;
        if (error) {
          if (error.message.includes('browslessContextMenu')) {
            browserContext.create(
              {
                documentUrlPatterns,
                contexts: asContextTypes(['all']),
                id: 'browslessContextMenu',
                title: 'Run Browsless workflow',
              },
              () => {
                registerContextMenu(workflowId, data).then(resolve).catch(reject);
              }
            );
            resolve();
            return;
          }
          if (error.message.includes('Duplicate id')) {
            browserContext.remove(triggerId).then(() => {
              registerContextMenu(workflowId, data).then(resolve).catch(reject);
            });
            return;
          }
          reject(error.message);
        } else {
          const refreshable = browserContext as typeof browser.contextMenus & {
            refresh?: () => void;
          };
          if (refreshable.refresh) refreshable.refresh();
          resolve();
        }
      }
    );
  });
};
const removeFromWorkflowQueue = async (workflowId: string) => {
  const { workflowQueue } = await extensionStorage.local.get('workflowQueue');
  const queue = (workflowQueue as string[] | null | undefined) || [];
  const queueIndex = queue.findIndex((id) => id.includes(workflowId));
  if (queueIndex === -1) return;
  queue.splice(queueIndex, 1);
  await extensionStorage.local.set({ workflowQueue: queue });
};
export const cleanWorkflowTriggers = async (
  workflowId: string,
  triggers?: WorkflowTriggerEntry[]
) => {
  try {
    const alarms = await browser.alarms.getAll();
    for (const alarm of alarms) {
      if (alarm.name.includes(workflowId)) {
        await browser.alarms.clear(alarm.name);
      }
    }
    const { visitWebTriggers, onStartupTriggers, shortcuts } =
      await extensionStorage.local.get([
        'shortcuts',
        'visitWebTriggers',
        'onStartupTriggers',
      ]);
    const keyboardShortcuts = Array.isArray(shortcuts)
      ? {}
      : ((shortcuts as Record<string, string> | null | undefined) ?? {});
    Object.keys(keyboardShortcuts).forEach((shortcutId) => {
      if (!shortcutId.includes(workflowId)) return;
      delete keyboardShortcuts[shortcutId];
    });
    const startupTriggers = (
      (onStartupTriggers as string[] | null | undefined) ?? []
    ).filter((id) => !id.includes(workflowId));
    const filteredVisitWebTriggers = (
      visitWebTriggers as VisitWebTriggerItem[] | null | undefined
    )?.filter((item) => !item.id.includes(workflowId));
    await removeFromWorkflowQueue(workflowId);
    await extensionStorage.local.set({
      shortcuts: keyboardShortcuts,
      onStartupTriggers: startupTriggers,
      visitWebTriggers: filteredVisitWebTriggers,
    });
    const browserContextMenu = browser.contextMenus;
    const removeFromContextMenu = async () => {
      try {
        let promises = [];
        if (triggers) {
          promises = triggers.map(async (trigger: WorkflowTriggerEntry) => {
            if (trigger.type !== 'context-menu') return;
            const triggerId = `trigger:${workflowId}:${trigger.id}`;
            await browserContextMenu.remove(triggerId);
          });
        }
        promises.push(browserContextMenu.remove(workflowId));
        await Promise.allSettled(promises);
      } catch {
        return;
      }
    };
    if (browserContextMenu) await removeFromContextMenu();
  } catch (error) {
    console.error(error);
  }
};
export const registerSpecificDay = (workflowId: string, data: TriggerBlockData) => {
  const days = data.days || [];
  if (days.length === 0) return null;
  const getDate = (dayId: number, time: string) => {
    const [hour, minute, seconds] = time.split(':');
    const date = dayjs()
      .day(dayId)
      .hour(Number(hour))
      .minute(Number(minute))
      .second(Number(seconds || 0));
    return date.valueOf();
  };
  const dates = days
    .reduce<number[]>((acc, item) => {
      if (isObject(item)) {
        const dayItem = item as {
          id: number;
          times: string[];
        };
        dayItem.times.forEach((time: string) => {
          acc.push(getDate(dayItem.id, time));
        });
      } else {
        acc.push(getDate(item as number, (data.time as string) || '00:00'));
      }
      return acc;
    }, [])
    .sort();
  const findDate =
    dates.find((date) => date > Date.now()) || dayjs(dates[0]).add(7, 'day').valueOf();
  return browser.alarms.create(workflowId, {
    when: findDate,
  });
};
export const registerInterval = (workflowId: string, data: TriggerBlockData) => {
  const alarmInfo: {
    periodInMinutes: number;
    delayInMinutes?: number;
  } = {
    periodInMinutes: Number(data.interval),
  };
  if ((data.delay as number) > 0 && !data.fixedDelay)
    alarmInfo.delayInMinutes = Number(data.delay);
  return browser.alarms.create(workflowId, alarmInfo);
};
export const registerSpecificDate = async (
  workflowId: string,
  data: TriggerBlockData
) => {
  let date = Date.now() + 60000;
  if (data.date) {
    const [hour, minute, second] = String(data.time || '00:00').split(':');
    date = dayjs(String(data.date))
      .hour(Number(hour))
      .minute(Number(minute))
      .second(Number(second || 0))
      .valueOf();
  }
  if (Date.now() > date) return;
  await browser.alarms.create(workflowId, {
    when: date,
  });
};
export const registerVisitWeb = async (workflowId: string, data: TriggerBlockData) => {
  try {
    if (String(data.url || '').trim() === '') return;
    const visitWebTriggers =
      ((await extensionStorage.local.get('visitWebTriggers'))?.visitWebTriggers as
        VisitWebTriggerItem[] | null | undefined) || [];
    const index = visitWebTriggers.findIndex((item) => item.id === workflowId);
    const payload = {
      id: workflowId,
      url: String(data.url),
      isRegex: data.isUrlRegex,
      supportSPA: data.supportSPA ?? false,
    };
    if (index === -1) {
      visitWebTriggers.unshift(payload);
    } else {
      visitWebTriggers[index] = payload;
    }
    await extensionStorage.local.set({ visitWebTriggers });
  } catch (error) {
    console.error(error);
  }
};
export const registerKeyboardShortcut = async (
  workflowId: string,
  data: TriggerBlockData
) => {
  try {
    const { shortcuts } = await extensionStorage.local.get('shortcuts');
    const keyboardShortcuts = Array.isArray(shortcuts)
      ? {}
      : ((shortcuts as Record<string, string> | null | undefined) ?? {});
    keyboardShortcuts[workflowId] = String(data.shortcut || '');
    await extensionStorage.local.set({ shortcuts: keyboardShortcuts });
  } catch (error) {
    console.error(error);
  }
};
export const registerOnStartup = async () => {
  // Do nothing
};
export const registerCronJob = async (workflowId: string, data: TriggerBlockData) => {
  try {
    const cronExpression = (
      cronParser as unknown as {
        parseExpression: (value: string) => {
          next: () => {
            getTime: () => number;
          };
        };
      }
    ).parseExpression(String(data.expression || ''));
    const nextSchedule = cronExpression.next();
    await browser.alarms.create(workflowId, { when: nextSchedule.getTime() });
  } catch (error) {
    console.error(error);
  }
};
export const workflowTriggersMap: Record<string, TriggerHandler> = {
  interval: registerInterval,
  date: registerSpecificDate,
  'cron-job': registerCronJob,
  'visit-web': registerVisitWeb,
  'on-startup': registerOnStartup,
  'specific-day': registerSpecificDay,
  'context-menu': registerContextMenu,
  'keyboard-shortcut': registerKeyboardShortcut,
};
export const registerWorkflowTrigger = async (
  workflowId: string,
  { data }: WorkflowNode
) => {
  try {
    const triggerData = data as TriggerBlockData;
    await cleanWorkflowTriggers(workflowId, triggerData?.triggers);
    if (triggerData.triggers) {
      for (const trigger of triggerData.triggers) {
        const handler = workflowTriggersMap[trigger.type];
        if (handler) await handler(`trigger:${workflowId}:${trigger.id}`, trigger.data);
      }
    } else if (triggerData.type && workflowTriggersMap[triggerData.type]) {
      await workflowTriggersMap[triggerData.type](workflowId, triggerData);
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};
export default {
  cleanUp: cleanWorkflowTriggers,
  register: registerWorkflowTrigger,
};
