import testConditions, { type TestConditionsArr } from '../utils/testConditions';
import checkCodeCondition from '../utils/conditionCode';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerOptions,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type WhileLoopBlockData = {
  conditions?: TestConditionsArr;
};

async function whileLoop(
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<WhileLoopBlockData>,
  { refData }: WorkflowHandlerOptions
) {
  const { debugMode } = this.engine.workflow?.settings || {};
  const conditionPayload = {
    refData,
    isPopup: this.engine.isPopup,
    activeTab: this.activeTab.id,
    checkCodeCondition: (payload: Record<string, unknown>) => {
      payload.debugMode = debugMode;
      return checkCodeCondition(
        this.activeTab,
        payload as unknown as Parameters<typeof checkCodeCondition>[1]
      );
    },
    sendMessage: (payload: { data?: Record<string, unknown> }) =>
      this._sendMessageToTab({ ...payload.data, label: 'conditions', id }),
  };
  const result = await testConditions(data.conditions ?? [], conditionPayload);
  const nextBlockId = this.getBlockConnections(id, result.isMatch ? 1 : 'fallback');

  return {
    data: '',
    nextBlockId,
    replacedValue: result?.replacedValue || {},
  };
}

export default whileLoop;
