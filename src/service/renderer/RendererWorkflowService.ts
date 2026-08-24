import { MessageListener } from '@/utils/message';
import { toRaw } from 'vue';
import type { WorkflowNode } from '@/types/models';

type WorkflowExecuteOptions = Record<string, unknown>;
type WorkflowPayload = WorkflowNode | Record<string, unknown>;

class RendererWorkflowService {
  static executeWorkflow(workflowData: WorkflowPayload, options: WorkflowExecuteOptions) {
    const clonedWorkflowData: Record<string, unknown> = {};
    Object.keys(workflowData).forEach((key) => {
      clonedWorkflowData[key] = toRaw((workflowData as Record<string, unknown>)[key]);
    });

    return MessageListener.sendMessage(
      'workflow:execute',
      { ...clonedWorkflowData, options },
      'background'
    );
  }

  static stopWorkflowExecution(executionId: string) {
    return MessageListener.sendMessage('workflow:stop', executionId, 'background');
  }
}

export default RendererWorkflowService;
