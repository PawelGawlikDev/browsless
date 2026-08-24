import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type TabUrlBlockData = {
  type?: 'active-tab' | string;
  qMatchPatterns?: string;
  qTitle?: string;
  assignVariable?: boolean;
  variableName?: string;
  saveData?: boolean;
  dataColumn?: string;
};

export async function logData(
  this: WorkflowHandlerContext,
  { id, data }: WorkflowHandlerBlock<TabUrlBlockData>
) {
  let urls: string | string[] = [];

  if (data.type === 'active-tab') {
    if (!this.activeTab.id) throw new Error('no-tab');

    const tab = await BrowserAPIService.tabs.get(this.activeTab.id);
    urls = tab.url || tab.pendingUrl || '';
  } else {
    const query: chrome.tabs.QueryInfo = {};

    if (data.qMatchPatterns) {
      query.url = data.qMatchPatterns;
    }
    if (data.qTitle) {
      query.title = data.qTitle;
    }

    const tabs = await BrowserAPIService.tabs.query(query);
    urls = tabs.map((tab) => tab.url);
  }

  if (data.assignVariable) {
    await this.setVariable(data.variableName, urls);
  }
  if (data.saveData) {
    this.addDataToColumn(data.dataColumn, urls);
  }

  return {
    data: urls,
    nextBlockId: this.getBlockConnections(id),
  };
}

export default logData;
