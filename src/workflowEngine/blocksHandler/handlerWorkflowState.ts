import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type WorkflowStateBlockData = {
  type?: 'stop-current' | 'stop-specific' | 'stop-all';
  throwError?: boolean;
  errorMessage?: string;
  workflowsToStop?: string[];
  exceptCurrent?: boolean;
};

export default async function (
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<WorkflowStateBlockData>
) {
  try {
    let stopCurrent = false;

    if (data.type === 'stop-current') {
      if (data.throwError) {
        throw new Error(data.errorMessage || 'Workflow stopped manually');
      } else {
        return {};
      }
    }
    if (data.type && ['stop-specific', 'stop-all'].includes(data.type)) {
      const ids: Array<string | undefined> = [];
      const isSpecific = data.type === 'stop-specific';
      this.engine.states.getAll.forEach((state) => {
        const workflowNotIncluded =
          isSpecific && !data.workflowsToStop?.includes(state.workflowId ?? '');
        if (workflowNotIncluded) return;

        ids.push(state.id);
      });

      for (const stateId of ids) {
        if (stateId === this.engine.id) {
          stopCurrent = isSpecific ? true : !data.exceptCurrent;
        } else if (stateId) {
          await this.engine.states.stop(stateId);
        }
      }
    }

    if (stopCurrent) return {};

    return {
      data: '',
      nextBlockId: this.getBlockConnections(id),
    };
  } catch (rawError) {
    const error = rawError as Error & { data?: Record<string, unknown> };
    error.data = error.data || {};
    console.error(error);

    throw error;
  }
}
