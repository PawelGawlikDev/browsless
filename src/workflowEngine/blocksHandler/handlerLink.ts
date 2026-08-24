import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type LinkBlockData = {
  openInNewTab?: boolean;
};

export default async function (
  this: WorkflowHandlerContext,
  { data, id, label }: WorkflowHandlerBlock<LinkBlockData>
) {
  const url = await this._sendMessageToTab({
    id,
    data,
    label,
  });

  if (data.openInNewTab) {
    const tab = await BrowserAPIService.tabs.create({
      url,
      windowId: this.activeTab.windowId ?? undefined,
    });

    this.activeTab.url = url;
    this.activeTab.frameId = 0;
    this.activeTab.id = tab.id;
  }

  return {
    data: url,
    nextBlockId: this.getBlockConnections(id),
  };
}
