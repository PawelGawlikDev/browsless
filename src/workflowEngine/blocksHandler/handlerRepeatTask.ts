import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type RepeatTaskBlockData = {
  repeatFor?: string | number;
};

function repeatTask(
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<RepeatTaskBlockData>
) {
  return new Promise<{ data: number; nextBlockId: unknown[] }>((resolve) => {
    const repeat = Number.isNaN(+data.repeatFor) ? 0 : +data.repeatFor;

    if (this.repeatedTasks[id] > repeat || !this.getBlockConnections(id, 2)) {
      delete this.repeatedTasks[id];

      resolve({
        data: repeat,
        nextBlockId: this.getBlockConnections(id),
      });
    } else {
      this.repeatedTasks[id] = (this.repeatedTasks[id] || 1) + 1;

      resolve({
        data: repeat,
        nextBlockId: this.getBlockConnections(id, 2),
      });
    }
  });
}

export default repeatTask;
