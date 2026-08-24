import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import { attachDebugger, injectPreloadScript } from '../helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type SwitchTabBlockData = {
  activeTab?: boolean;
  findTabBy?: 'match-patterns' | 'tab-title' | 'tab-index' | 'next-tab' | 'prev-tab';
  matchPattern?: string;
  tabTitle?: string;
  createIfNoMatch?: boolean;
  url?: string;
  tabIndex?: number;
};

export default async function (
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<SwitchTabBlockData>
) {
  const nextBlockId = this.getBlockConnections(id);
  const generateError = (message: string, errorData?: Record<string, unknown>) => {
    const error = Object.assign(new Error(message), { nextBlockId });

    if (errorData) (error as Error & { data?: Record<string, unknown> }).data = errorData;

    return error as Error & { nextBlockId?: unknown };
  };
  this.windowId = null;

  let tab: chrome.tabs.Tab | null = null;
  const activeTab = data.activeTab ?? true;
  const findTabBy = data.findTabBy || 'match-patterns';
  const isPrevNext = ['next-tab', 'prev-tab'].includes(findTabBy);

  if (!this.activeTab.id && isPrevNext) {
    throw new Error('no-tab');
  }

  const isTabsQuery = ['match-patterns', 'tab-title'];
  const tabs =
    findTabBy !== 'match-patterns' ? await BrowserAPIService.tabs.query({}) : [];

  if (isTabsQuery.includes(findTabBy)) {
    const query: chrome.tabs.QueryInfo = {};

    if (data.findTabBy === 'match-patterns') query.url = data.matchPattern;
    else if (data.findTabBy === 'tab-title') query.title = data.tabTitle;

    [tab] = await BrowserAPIService.tabs.query(query);

    if (!tab) {
      if (data.createIfNoMatch) {
        if (!data.url?.startsWith('http')) {
          throw generateError('invalid-active-tab', { url: data.url });
        }

        tab = await BrowserAPIService.tabs.create({
          url: data.url,
          active: activeTab,
          windowId: this.windowId ?? undefined,
        });
      } else {
        throw generateError('no-match-tab', { pattern: data.matchPattern });
      }
    }
  } else if (isPrevNext) {
    const incrementBy = findTabBy.includes('next') ? 1 : -1;
    let tabIndex = tabs.findIndex((item) => item.id === this.activeTab.id);

    tabIndex += incrementBy;

    if (tabIndex < 0) tabIndex = tabs.length - 1;
    else if (tabIndex > tabs.length - 1) tabIndex = 0;

    tab = tabs[tabIndex] ?? null;
  } else if (findTabBy === 'tab-index') {
    tab = tabs[data.tabIndex ?? 0] ?? null;

    if (!tab) throw generateError(`Can't find a tab with ${data.tabIndex} index`);
  }

  if (!tab?.id) throw generateError('no-match-tab');

  await BrowserAPIService.tabs.update(tab.id, { active: activeTab });

  this.activeTab.id = tab.id;
  this.activeTab.frameId = 0;
  this.activeTab.url = tab.url ?? '';
  this.windowId = tab.windowId;

  if (this.settings.debugMode) {
    await attachDebugger(tab.id, this.activeTab.id);
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

  if (activeTab) {
    await BrowserAPIService.windows.update(tab.windowId, { focused: true });
  }

  return {
    nextBlockId,
    data: tab.url,
  };
}
