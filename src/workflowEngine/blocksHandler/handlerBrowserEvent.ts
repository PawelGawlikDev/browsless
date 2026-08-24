import { isWhitespace } from '@/utils/helper';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
type BrowserEventBlockData = {
  eventName: 'tab:loaded' | 'tab:close' | 'tab:create' | 'window:create' | 'window:close';
  tabLoadedUrl?: string;
  activeTabLoaded?: boolean;
  timeout?: number;
  tabUrl?: string;
  setAsActiveTab?: boolean;
};
type ActiveTabRef = {
  id: number | null;
  url?: string | null;
};
type ListenerEventTarget<TEvent> = {
  addListener: (callback: (event: TEvent) => void) => void;
  removeListener: (callback: (event: TEvent) => void) => void;
};
const handleEventListener = <TEvent>(
  target: ListenerEventTarget<TEvent>,
  validate?: (
    event: TEvent,
    ctx: {
      data: BrowserEventBlockData;
      activeTab: ActiveTabRef;
    }
  ) => boolean
) => {
  return (data: BrowserEventBlockData, activeTab: ActiveTabRef) => {
    return new Promise<TEvent | ''>((resolve) => {
      let resolved = false;
      const eventListener = (event: TEvent) => {
        if (resolved) return;
        if (validate && !validate(event, { data, activeTab })) return;
        target.removeListener(eventListener);
        resolve(event);
      };
      setTimeout(() => {
        resolved = true;
        target.removeListener(eventListener);
        resolve('');
      }, data.timeout || 10000);
      target.addListener(eventListener);
    });
  };
};
const onTabLoaded = (
  { tabLoadedUrl, activeTabLoaded, timeout }: BrowserEventBlockData,
  { id }: ActiveTabRef
) => {
  return new Promise<void>((resolve, reject) => {
    let resolved = false;
    const checkActiveTabStatus = () => {
      if (resolved) return;
      if (!id) {
        reject(new Error('no-tab'));
        return;
      }
      BrowserAPIService.tabs
        .get(id)
        .then((tab) => {
          if (tab.status === 'complete') {
            resolve();
            return;
          }
          setTimeout(checkActiveTabStatus, 1000);
        })
        .catch(reject);
    };
    const url = isWhitespace(tabLoadedUrl)
      ? '<all_urls>'
      : tabLoadedUrl.replace(/\s/g, '').split(',');
    const checkTabsStatus = () => {
      BrowserAPIService.tabs
        .query({
          url,
          status: 'loading',
        })
        .then((tabs) => {
          if (resolved) return;
          if (tabs.length === 0) {
            resolve();
            return;
          }
          setTimeout(checkTabsStatus, 1000);
        })
        .catch(reject);
    };
    if (activeTabLoaded) checkActiveTabStatus();
    else checkTabsStatus();
    setTimeout(() => {
      resolved = true;
      reject(new Error('timeout'));
    }, timeout || 10000);
  });
};
const validateCreatedTab = (
  {
    url,
  }: {
    url?: string;
  },
  {
    data,
  }: {
    data: BrowserEventBlockData;
  }
) => {
  if (!isWhitespace(data.tabUrl)) {
    const regex = new RegExp(data.tabUrl, 'gi');
    if (!regex.test(url)) return false;
  }
  return true;
};
const events: Record<
  BrowserEventBlockData['eventName'],
  (data: BrowserEventBlockData, activeTab: ActiveTabRef) => Promise<unknown>
> = {
  'tab:loaded': onTabLoaded,
  'tab:close': handleEventListener(BrowserAPIService.tabs.onRemoved),
  'tab:create': handleEventListener(
    BrowserAPIService.webNavigation.onCreatedNavigationTarget,
    validateCreatedTab
  ),
  'window:create': handleEventListener(
    BrowserAPIService.webNavigation.onCreatedNavigationTarget,
    validateCreatedTab
  ),
  'window:close': handleEventListener(BrowserAPIService.windows.onRemoved),
};
export default async function (
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<BrowserEventBlockData>
) {
  const currentEvent = events[data.eventName];
  if (!currentEvent) {
    throw new Error(`Can't find ${data.eventName} event`);
  }
  const result = await currentEvent(data, this.activeTab as ActiveTabRef);
  if (data.eventName === 'tab:create' && data.setAsActiveTab) {
    const tabResult = result as {
      tabId?: number;
      url?: string;
    };
    this.activeTab.id = tabResult.tabId || null;
    this.activeTab.url = tabResult.url || null;
  }
  return {
    data: result || '',
    nextBlockId: this.getBlockConnections(id),
  };
}
