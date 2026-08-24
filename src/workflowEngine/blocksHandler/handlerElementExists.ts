import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
  WorkflowBlockResult,
} from '@/types/workflow-engine';

type ElementExistsBlockData = {
  throwError?: boolean;
  selector?: string;
};

function elementExists(
  this: WorkflowHandlerContext,
  block: WorkflowHandlerBlock<ElementExistsBlockData>
) {
  return new Promise<WorkflowBlockResult>((resolve, reject) => {
    this._sendMessageToTab(block as unknown as Record<string, unknown>)
      .then((data) => {
        if (!data && block.data.throwError) {
          const error = Object.assign(new Error('element-not-found'), {
            data: { selector: block.data.selector },
          });

          reject(error);
          return;
        }

        resolve({
          data,
          nextBlockId: this.getBlockConnections(block.id, data ? 1 : 2),
        });
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export default elementExists;
