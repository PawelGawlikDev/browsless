import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
type CloseTabBlockData = {
  allWindows?: boolean;
  activeTab?: boolean;
  closeType?: 'window' | 'tab';
  url?: string;
};
const closeWindow = async (data: CloseTabBlockData, windowId: number | null) => {
  const windowIds: number[] = [];
  if (data.allWindows) {
    const windows = await BrowserAPIService.windows.getAll();
    windows.forEach(({ id }) => {
      if (typeof id === 'number') {
        windowIds.push(id);
      }
    });
  } else {
    let currentWindowId;
    if (windowId && typeof windowId === 'number') {
      currentWindowId = windowId;
    } else {
      currentWindowId = (await BrowserAPIService.windows.getCurrent()).id;
    }
    windowIds.push(currentWindowId);
  }
  await Promise.allSettled(windowIds.map((id) => BrowserAPIService.windows.remove(id)));
};
const closeTab = async (data: CloseTabBlockData, tabId: number | null) => {
  let tabIds: number | number[] | undefined;
  if (data.activeTab && tabId) {
    tabIds = tabId;
  } else if (data.url) {
    tabIds = (await BrowserAPIService.tabs.query({ url: data.url })).map((tab) => tab.id);
  }
  if (tabIds) await BrowserAPIService.tabs.remove(tabIds);
};
export default async function (
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<CloseTabBlockData>
) {
  if (data.closeType === 'window') {
    await closeWindow(data, this.windowId);
    this.windowId = null;
  } else {
    await closeTab(data, this.activeTab.id);
    if (data.activeTab) {
      this.activeTab.id = null;
    }
  }
  return {
    data: '',
    nextBlockId: this.getBlockConnections(id),
  };
}
