import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

export async function reloadTab(
  this: WorkflowHandlerContext,
  { id }: WorkflowHandlerBlock
) {
  if (!this.activeTab.id) throw new Error('no-tab');

  await BrowserAPIService.tabs.reload(this.activeTab.id);

  return {
    data: '',
    nextBlockId: this.getBlockConnections(id),
  };
}

export default reloadTab;
