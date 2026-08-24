import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import { attachDebugger } from '../helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type NewWindowBlockData = {
  windowState?: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
  incognito?: boolean;
  type?: chrome.windows.CreateType;
  top?: number;
  left?: number;
  height?: number;
  width?: number;
  url?: string;
};

export async function newWindow(
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<NewWindowBlockData>
) {
  const windowOptions: chrome.windows.CreateData = {
    state: data.windowState as chrome.windows.CreateData['state'],
    incognito: data.incognito,
    type: data.type,
  };

  if (data.windowState === 'normal') {
    (['top', 'left', 'height', 'width'] as const).forEach((key) => {
      if (!data[key] || data[key] <= 0) return;

      windowOptions[key] = data[key];
    });
  }
  if (data.url) windowOptions.url = data.url;

  const newWindowInstance = await BrowserAPIService.windows.create(windowOptions);
  this.windowId = newWindowInstance.id ?? null;

  if (data.url) {
    const [tab] = newWindowInstance.tabs ?? [];

    if (this.settings.debugMode && tab?.id)
      await attachDebugger(tab.id, this.activeTab.id);

    if (tab) {
      this.activeTab.id = tab.id ?? null;
      this.activeTab.url = tab.url ?? '';
    }
  }

  return {
    data: newWindowInstance.id,
    nextBlockId: this.getBlockConnections(id),
  };
}

export default newWindow;
