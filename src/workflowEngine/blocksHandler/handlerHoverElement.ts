import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import { attachDebugger } from '../helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type HoverElementBlockData = Record<string, unknown>;

export async function hoverElement(
  this: WorkflowHandlerContext,
  block: WorkflowHandlerBlock<HoverElementBlockData>
) {
  if (!this.activeTab.id) throw new Error('no-tab');

  const { debugMode, executedBlockOnWeb } = this.settings;

  if (!debugMode) {
    await attachDebugger(this.activeTab.id);
  }

  await this._sendMessageToTab({
    ...block,
    debugMode,
    executedBlockOnWeb,
    activeTabId: this.activeTab.id,
    frameSelector: this.frameSelector,
  });

  if (!debugMode) {
    BrowserAPIService.debugger.detach({ tabId: this.activeTab.id });
  }

  return {
    data: '',
    nextBlockId: this.getBlockConnections(block.id),
  };
}

export default hoverElement;
