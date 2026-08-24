import { sleep } from '@/utils/helper';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import { attachDebugger, injectPreloadScript } from '../helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

async function activeTab(this: WorkflowHandlerContext, _block: WorkflowHandlerBlock) {
  try {
    const data = {
      data: '' as unknown,
      nextBlockId: this.getBlockConnections(_block.id),
    };

    if (this.activeTab.id) {
      await BrowserAPIService.tabs.update(this.activeTab.id, { active: true });
      return data;
    }

    const tabsQuery: chrome.tabs.QueryInfo = {
      active: true,
      url: '*://*/*',
    };

    if (this.engine.isPopup) {
      let windowId: number | null = null;
      const extURL = BrowserAPIService.runtime.getURL('');
      const windows = await BrowserAPIService.windows.getAll({
        populate: true,
      });
      for (const browserWindow of windows) {
        const [tab] = browserWindow.tabs ?? [];
        const isDashboard =
          browserWindow.tabs?.length === 1 && tab?.url?.includes(extURL);

        if (isDashboard) {
          await BrowserAPIService.windows.update(browserWindow.id as number, {
            focused: false,
          });
        } else if (browserWindow.focused) {
          windowId = browserWindow.id ?? null;
        }
      }

      if (windowId) tabsQuery.windowId = windowId;
      else if (windows.length > 2) tabsQuery.lastFocusedWindow = true;
    } else {
      const dashboardTabs = await BrowserAPIService.tabs.query({
        url: BrowserAPIService.runtime.getURL('/dashboard.html'),
      });
      await Promise.all(
        dashboardTabs.map((item) =>
          BrowserAPIService.windows.update(item.windowId as number, {
            focused: false,
          })
        )
      );

      tabsQuery.currentWindow = true;
    }

    const [tab] = await BrowserAPIService.tabs.query(tabsQuery);
    if (!tab) {
      throw new Error("Can't find active tab");
    }
    if (!tab.url?.startsWith('http')) {
      const error = new Error('invalid-active-tab') as Error & {
        data?: Record<string, unknown>;
      };
      error.data = { url: tab.url };

      throw error;
    }

    this.activeTab = {
      ...this.activeTab,
      frameId: 0,
      id: tab.id ?? null,
      url: tab.url,
    };
    this.windowId = tab.windowId;

    if (this.settings.debugMode) {
      await attachDebugger(tab.id as number, this.activeTab.id);
      this.debugAttached = true;
    }

    if (this.preloadScripts.length > 0) {
      await injectPreloadScript({
        scripts: this.preloadScripts as Array<{ id: string; data: { code: string } }>,
        frameSelector: this.frameSelector,
        target: {
          tabId: this.activeTab.id,
          frameIds: [this.activeTab.frameId || 0],
        },
      });
    }

    await BrowserAPIService.tabs.update(tab.id as number, { active: true });
    await BrowserAPIService.windows.update(tab.windowId, { focused: true });

    await sleep(200);

    return data;
  } catch (error) {
    console.error(error);
    (error as Error & { data?: Record<string, unknown> }).data =
      (error as Error & { data?: Record<string, unknown> }).data || {};

    throw error;
  }
}

export default activeTab;
