import type {
  WorkflowHandlerBlock,
  WorkflowHandlerOptions,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type LoopElementsBlockData = {
  loopId: string;
  maxLoop?: number;
  findBy?: unknown;
  selector?: string;
  loadMoreAction?: string;
  scrollToBottom?: boolean;
  actionElMaxWaitTime?: number;
  actionElSelector?: string;
  actionPageMaxWaitTime?: number;
};

async function loopElements(
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<LoopElementsBlockData>,
  { refData }: WorkflowHandlerOptions
) {
  try {
    if (!this.activeTab.id) throw new Error('no-tab');

    if (this.loopList[data.loopId]) {
      const index = this.loopList[data.loopId].index + 1;

      this.loopList[data.loopId].index = index;

      refData.loopData[data.loopId] = {
        $index: index,
        data: this.loopList[data.loopId].data[index],
      };
    } else {
      const maxLoop = +data.maxLoop || 0;
      const { elements, url, loopId } = (await this._sendMessageToTab({
        id,
        label: 'loop-data',
        data: {
          max: maxLoop,
          multiple: true,
          ...data,
        },
      })) as {
        elements: unknown[];
        url?: unknown;
        loopId?: string;
      };
      this.loopEls.push({
        url,
        loopId,
        max: maxLoop,
        blockId: id,
        findBy: data.findBy,
        selector: data.selector,
      });

      const loopPayload = {
        maxLoop,
        index: 0,
        blockId: id,
        data: elements,
        id: data.loopId,
        type: 'elements',
      };

      if (data.loadMoreAction !== 'none') {
        (loopPayload as Record<string, unknown>).loadMoreAction = {
          maxLoop,
          loopAttrId: loopId,
          loopId: data.loopId,
          findBy: data.findBy,
          type: data.loadMoreAction,
          selector: (data.selector ?? '').trim(),
          scrollToBottom: data.scrollToBottom,
          actionElMaxWaitTime: data.actionElMaxWaitTime,
          actionElSelector: (data.actionElSelector ?? '').trim(),
          actionPageMaxWaitTime: data.actionPageMaxWaitTime,
        };
      }

      this.loopList[data.loopId] = loopPayload;

      refData.loopData[data.loopId] = {
        $index: 0,
        data: elements[0],
      };
    }

    return {
      data: refData.loopData[data.loopId],
      nextBlockId: this.getBlockConnections(id),
    };
  } catch (rawError) {
    const error = rawError as Error & { data?: Record<string, unknown> };
    if (error?.message === 'element-not-found') {
      error.data = { selector: data.selector };
    }

    throw error;
  }
}

export default loopElements;
