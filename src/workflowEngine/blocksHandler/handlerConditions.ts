import compareBlockValue from '@/utils/compareBlockValue';
import testConditions, { type TestConditionsArr } from '../utils/testConditions';
import renderString from '../templating/renderString';
import checkCodeCondition from '../utils/conditionCode';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerOptions,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
type ConditionItem = {
  id?: string;
  type?: string;
  value: unknown;
  compareValue?: unknown;
  conditions?: TestConditionsArr;
};
type ConditionsBlockData = {
  conditions: ConditionItem[];
  retryConditions?: boolean;
  retryCount?: number;
  retryTimeout?: number;
};
type CheckConditionsResult = {
  match: boolean;
  index?: number;
  replacedValue: Record<string, unknown>;
};
const checkConditions = (
  data: ConditionsBlockData,
  conditionOptions: Record<string, unknown>
) => {
  return new Promise<CheckConditionsResult>((resolve, reject) => {
    let retryCount = 1;
    const replacedValue: Record<string, unknown> = {};
    const testAllConditions = async () => {
      try {
        for (let index = 0; index < data.conditions.length; index += 1) {
          const result = await testConditions(
            (data.conditions[index].conditions ?? []) as unknown as TestConditionsArr,
            conditionOptions as Parameters<typeof testConditions>[1]
          );
          Object.assign(replacedValue, result?.replacedValue || {});
          if (result.isMatch) {
            resolve({ match: true, index, replacedValue });
            return;
          }
        }
        if (data.retryConditions && retryCount <= (data.retryCount ?? 0)) {
          retryCount += 1;
          setTimeout(() => {
            testAllConditions();
          }, data.retryTimeout);
        } else {
          resolve({ match: false, replacedValue });
        }
      } catch (error) {
        reject(error);
      }
    };
    testAllConditions();
  });
};
async function conditions(
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<ConditionsBlockData>,
  { prevBlockData, refData }: WorkflowHandlerOptions
) {
  if (data.conditions.length === 0) {
    throw new Error('conditions-empty');
  }
  let resultData: unknown = '';
  let isConditionMet = false;
  let outputId: number | string = 'fallback';
  const replacedValue: Record<string, unknown> = {};
  const condition = data.conditions[0];
  const prevData = Array.isArray(prevBlockData) ? prevBlockData[0] : prevBlockData;
  const { debugMode } = this.engine.workflow?.settings || {};
  if (condition && condition.conditions) {
    const conditionPayload = {
      refData,
      isPopup: this.engine.isPopup,
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
    const conditionsResult = await checkConditions(data, conditionPayload);
    if (conditionsResult.replacedValue) {
      Object.assign(replacedValue, conditionsResult.replacedValue);
    }
    if (conditionsResult.match && conditionsResult.index != null) {
      isConditionMet = true;
      outputId = data.conditions[conditionsResult.index].id ?? 1;
    }
  } else {
    for (const { type, value, compareValue, id: itemId } of data.conditions) {
      if (isConditionMet) break;
      const firstRaw = (compareValue ?? prevData ?? '') as string;
      const renderedFirstValue = await renderString(
        firstRaw,
        refData as unknown as Record<string, unknown>,
        this.engine.isPopup
      );
      const firstValue = {
        value: renderedFirstValue === '' ? '' : renderedFirstValue.value,
        list: renderedFirstValue === '' ? {} : renderedFirstValue.list,
      };
      const secondRaw = value as string;
      const renderedSecondValue = await renderString(
        secondRaw,
        refData as unknown as Record<string, unknown>,
        this.engine.isPopup
      );
      const secondValue = {
        value: renderedSecondValue === '' ? '' : renderedSecondValue.value,
        list: renderedSecondValue === '' ? {} : renderedSecondValue.list,
      };
      Object.assign(replacedValue, firstValue.list, secondValue.list);
      const isMatch = compareBlockValue(type ?? '', firstValue.value, secondValue.value);
      if (isMatch) {
        outputId = itemId ?? 'fallback';
        resultData = value;
        isConditionMet = true;
      }
    }
  }
  return {
    replacedValue,
    data: resultData,
    nextBlockId: this.getBlockConnections(id, outputId),
  };
}
export default conditions;
