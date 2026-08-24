import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

async function trigger(this: WorkflowHandlerContext, block: WorkflowHandlerBlock) {
  return new Promise((resolve) => {
    resolve({
      data: '',
      nextBlockId: this.getBlockConnections(block.id),
    });
  });
}

export default trigger;
