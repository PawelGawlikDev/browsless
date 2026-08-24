import { extensionStorage } from '@/lib/extensionStorage';
import type { LocalBackupSettings, WorkflowWithTrigger } from '@/types/background';
import { browser } from 'wxt/browser';
import { initElementSelector } from '@/dashboard/utils/elementSelector';
import dayjs from 'dayjs';
import dbStorage from '@/db/storage';
import cronParser from 'cron-parser';
import BackgroundUtils from './BackgroundUtils';
import BackgroundWorkflowTriggers from './BackgroundWorkflowTriggers';
const handleScheduleBackup = async () => {
  try {
    const storageDb = dbStorage as typeof dbStorage & {
      tablesItems: {
        toArray: () => Promise<unknown[]>;
      };
      variables: {
        toArray: () => Promise<unknown[]>;
      };
    };
    const { localBackupSettings, workflows } = await extensionStorage.local.get([
      'localBackupSettings',
      'workflows',
    ]);
    const backupSettings = localBackupSettings as LocalBackupSettings | null | undefined;
    const workflowsList = Object.values(
      (workflows as Record<string, WorkflowWithTrigger>) || {}
    ) as WorkflowWithTrigger[];
    if (!backupSettings) return;
    const workflowsData = workflowsList.reduce<WorkflowWithTrigger[]>((acc, workflow) => {
      if (workflow.isProtected) return acc;
      delete workflow.$id;
      delete workflow.createdAt;
      delete workflow.data;
      delete workflow.isDisabled;
      delete workflow.isProtected;
      acc.push(workflow);
      return acc;
    }, []);
    const payload: Record<string, string> = {
      workflows: JSON.stringify(workflowsData),
    };
    if (backupSettings.includedItems.includes('storage:table')) {
      const tables = await storageDb.tablesItems.toArray();
      payload.storageTables = JSON.stringify(tables);
    }
    if (backupSettings.includedItems.includes('storage:variables')) {
      const variables = await storageDb.variables.toArray();
      payload.storageVariables = JSON.stringify(variables);
    }
    const base64 = btoa(encodeURIComponent(JSON.stringify(payload)));
    const filename = `${backupSettings.folderName ? `${backupSettings.folderName}/` : ''}${dayjs().format('DD-MMM-YYYY--HH-mm')}.json`;
    await browser.downloads.download({
      filename,
      url: `data:application/json;base64,${base64}`,
    });
    await extensionStorage.local.set({
      localBackupSettings: {
        ...backupSettings,
        lastBackup: Date.now(),
      },
    });
    const expression =
      backupSettings.schedule === 'custom'
        ? backupSettings.customSchedule
        : backupSettings.schedule;
    const parsedExpression = (
      cronParser as unknown as {
        parseExpression: (value: string) => {
          next: () => {
            getTime: () => number;
          };
        };
      }
    )
      .parseExpression(expression)
      .next();
    if (!parsedExpression) return;
    await browser.alarms.create('schedule-local-backup', {
      when: parsedExpression.getTime(),
    });
  } catch (error) {
    console.error(error);
  }
};
class BackgroundEventsListeners {
  static onActionClicked() {
    BackgroundUtils.openDashboard();
  }
  static onCommand(name: string) {
    if (name === 'open-dashboard') {
      BackgroundUtils.openDashboard();
    } else if (name === 'element-picker') {
      initElementSelector();
    }
  }
  static onAlarms(event: chrome.alarms.Alarm) {
    if (event.name === 'schedule-local-backup') {
      handleScheduleBackup();
      return;
    }
    BackgroundWorkflowTriggers.scheduleWorkflow(event);
  }
  static onWebNavigationCompleted({
    tabId,
    url,
    frameId,
  }: chrome.webNavigation.WebNavigationFramedCallbackDetails) {
    if (frameId > 0) return;
    BackgroundWorkflowTriggers.visitWebTriggers(tabId, url);
  }
  static onContextMenuClicked(
    event: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ) {
    BackgroundWorkflowTriggers.contextMenu(event, tab);
  }
  static async onNotificationClicked(notificationId: string) {
    if (notificationId.startsWith('logs')) {
      const { 1: logId } = notificationId.split(':');
      const [tab] = await browser.tabs.query({
        url: browser.runtime.getURL('/dashboard.html'),
      });
      if (!tab) await BackgroundUtils.openDashboard('');
      await BackgroundUtils.sendMessageToDashboard('open-logs', { logId });
    }
  }
  static onRuntimeStartup() {
    extensionStorage.local.remove('workflowStates');
    browser.action.setBadgeText({ text: '' });
    BackgroundWorkflowTriggers.reRegisterTriggers(true);
  }
  static onHistoryStateUpdated({ frameId, url, tabId }) {
    if (frameId !== 0) return;
    BackgroundWorkflowTriggers.visitWebTriggers(tabId, url, true);
  }
  static async onRuntimeInstalled({ reason }: chrome.runtime.InstalledDetails) {
    try {
      if (reason === 'install') {
        await extensionStorage.local.set({
          logs: [],
          shortcuts: {},
          workflows: [],
          collections: [],
          workflowState: {},
          isFirstTime: true,
          visitWebTriggers: [],
        });
        await browser.windows.create({
          type: 'popup',
          state: 'maximized',
          url: browser.runtime.getURL('/dashboard.html#/workflows'),
        });
        return;
      }
      if (reason === 'update') {
        await BackgroundWorkflowTriggers.reRegisterTriggers();
      }
    } catch (error) {
      console.error(error);
    }
  }
}
export default BackgroundEventsListeners;
