import getTranslateLog from '@/utils/getTranslateLog';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type LogDataBlockData = {
  workflowId?: string;
  assignVariable?: boolean;
  variableName?: string;
  saveData?: boolean;
  dataColumn?: string;
};

export async function logData(
  this: WorkflowHandlerContext,
  { id, data }: WorkflowHandlerBlock<LogDataBlockData>
) {
  if (!data.workflowId) {
    throw new Error('No workflow is selected');
  }

  // block handler is inside WorkflowWorker scope. See WorkflowWorker.js:343
  const { states } = this.engine.states;
  let logs: unknown[] | string = [];
  if (states) {
    const stateValues = Object.values(
      Object.fromEntries(states) as Record<
        string,
        { workflowId?: string; state?: unknown }
      >
    );
    const curWorkflowState = stateValues.find(
      (item) => item.workflowId === data.workflowId
    )?.state;

    if (curWorkflowState) {
      logs = getTranslateLog(curWorkflowState, 'json');

      if (data.assignVariable) {
        await this.setVariable(data.variableName, logs);
      }
      if (data.saveData) {
        this.addDataToColumn(data.dataColumn, logs);
      }
    }
  }

  return {
    data: logs,
    nextBlockId: this.getBlockConnections(id),
  };
}

export default logData;
