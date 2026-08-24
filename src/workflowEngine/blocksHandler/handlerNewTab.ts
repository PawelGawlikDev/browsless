import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import { isWhitespace, sleep } from '@/utils/helper';
import {
  attachDebugger,
  injectPreloadScript,
  sendDebugCommand,
  waitTabLoaded,
} from '../helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
type NewTabBlockData = {
  url?: string;
  active?: boolean;
  updatePrevTab?: boolean;
  customUserAgent?: boolean;
  userAgent?: string;
  tabZoom?: number;
  inGroup?: boolean;
  waitTabLoaded?: boolean;
};
const isValidURL = (url?: string) => {
  try {
    new URL(url as string);
    return true;
  } catch {
    return false;
  }
};
async function newTab(
  this: WorkflowHandlerContext,
  { id, data }: WorkflowHandlerBlock<NewTabBlockData>
) {
  if (this.windowId) {
    try {
      await BrowserAPIService.windows.get(this.windowId);
    } catch {
      this.windowId = null;
    }
  }
  if (!this.windowId) {
    const currentWindow = await BrowserAPIService.windows.getCurrent();
    if (currentWindow) {
      this.windowId = currentWindow.id ?? null;
    }
  }
  if (!isValidURL(data.url)) {
    const error = Object.assign(
      new Error(isWhitespace(data.url as string) ? 'url-empty' : 'invalid-active-tab'),
      { data: { url: data.url } }
    );
    throw error;
  }
  let tab: chrome.tabs.Tab | null = null;
  if (data.updatePrevTab && this.activeTab.id) {
    tab = await BrowserAPIService.tabs.update(this.activeTab.id, {
      url: data.url,
      active: data.active,
    });
  } else {
    tab = await BrowserAPIService.tabs.create({
      url: data.url,
      active: data.active,
      windowId: this.windowId ?? undefined,
    });
  }
  this.activeTab.url = data.url;
  if (tab) {
    if (this.settings.debugMode || data.customUserAgent) {
      await attachDebugger(tab.id as number, this.activeTab.id);
      this.debugAttached = true;
      if (data.customUserAgent) {
        await sendDebugCommand(tab.id as number, 'Network.setUserAgentOverride', {
          userAgent: data.userAgent,
        });
        await BrowserAPIService.tabs.reload(tab.id as number);
        await sleep(1000);
      }
    }
    if (data.tabZoom && data.tabZoom !== 1) {
      await sleep(1000);
      await BrowserAPIService.tabs.setZoom(tab.id as number, data.tabZoom);
    }
    this.activeTab.id = tab.id ?? null;
    this.windowId = tab.windowId;
  }
  if (data.inGroup && !data.updatePrevTab) {
    const options: chrome.tabs.GroupOptions & {
      groupId?: number;
    } = {
      tabIds: this.activeTab.id as number,
    };
    if (!this.activeTab.groupId) {
      options.createProperties = {
        windowId: this.windowId ?? undefined,
      };
    } else {
      options.groupId = this.activeTab.groupId;
    }
    BrowserAPIService.tabs.group(options, (tabGroupId) => {
      this.activeTab.groupId = tabGroupId;
    });
  }
  this.activeTab.frameId = 0;
  if (!this.settings.debugMode && data.customUserAgent) {
    BrowserAPIService.debugger.detach({ tabId: tab?.id as number });
  }
  if (this.preloadScripts.length > 0) {
    await injectPreloadScript({
      scripts: this.preloadScripts as Array<{
        id: string;
        data: {
          code: string;
        };
      }>,
      frameSelector: this.frameSelector,
      target: {
        tabId: this.activeTab.id,
        frameIds: [this.activeTab.frameId || 0],
      },
    });
  }
  if (data.waitTabLoaded) {
    await waitTabLoaded({
      listenError: true,
      tabId: this.activeTab.id,
      ms: this.settings?.tabLoadTimeout ?? 30000,
    });
  }
  await BrowserAPIService.windows.update(tab?.windowId as number, { focused: true });
  return {
    data: data.url,
    nextBlockId: this.getBlockConnections(id),
  };
}
export default newTab;
