import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type DelayBlockData = {
  time?: number | string;
};

function delay(
  this: WorkflowHandlerContext,
  block: WorkflowHandlerBlock<DelayBlockData>
) {
  return new Promise<{ data: string; nextBlockId: unknown[] }>((resolve) => {
    const delayTime = +block.data.time || 500;
    setTimeout(() => {
      resolve({
        data: '',
        nextBlockId: this.getBlockConnections(block.id),
      });
    }, delayTime);
  });
}

export default delay;
