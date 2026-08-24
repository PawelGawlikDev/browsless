import cloneDeep from 'lodash.clonedeep';
import { parseJSON } from '@/utils/helper';
import { conditionBuilder } from '@/utils/shared';
import renderString from '../templating/renderString';
export type TestConditionData = Record<string, unknown>;
export type TestConditionItem = {
  category?: string;
  type: string;
  data: TestConditionData;
};
export type TestConditionsArr = Array<{
  conditions: Array<{
    items: TestConditionItem[];
  }>;
}>;
export type TestConditionWorkflowData = {
  refData: Record<string, unknown>;
  isPopup?: boolean;
  sendMessage: (payload: Record<string, unknown>) => Promise<unknown>;
  checkCodeCondition: (payload: Record<string, unknown>) => Promise<unknown>;
};
const isBoolStr = (str: unknown) => {
  if (str === 'true') return true;
  if (str === 'false') return false;
  return str;
};
const isNumStr = (str: unknown) =>
  Number.isNaN(+(str as string)) ? str : +(str as string);
type ComparisonFn = (a?: any, b?: any) => boolean;
const comparisons: Record<string, ComparisonFn> = {
  eq: (a, b) => a === b,
  eqi: (a, b) => a?.toLocaleLowerCase() === b?.toLocaleLowerCase(),
  nq: (a, b) => a !== b,
  gt: (a, b) => isNumStr(a) > isNumStr(b),
  gte: (a, b) => isNumStr(a) >= isNumStr(b),
  lt: (a, b) => isNumStr(a) < isNumStr(b),
  lte: (a, b) => isNumStr(a) <= isNumStr(b),
  cnt: (a, b) => a?.includes?.(b) ?? false,
  cni: (a, b) => a?.toLocaleLowerCase().includes(b?.toLocaleLowerCase()) ?? false,
  nct: (a, b) => !comparisons.cnt(a, b),
  nci: (a, b) => !comparisons.cni(a, b),
  stw: (a, b) => a?.startsWith?.(b) ?? false,
  enw: (a, b) => a?.endsWith?.(b) ?? false,
  rgx: (a, b) => {
    const match = (b as string).match(/^\/(.*?)\/([gimy]*)$/);
    const regex = match ? new RegExp(match[1], match[2]) : new RegExp(b as string);
    return regex.test(a);
  },
  itr: (a) => Boolean(isBoolStr(a)),
  ifl: (a) => !isBoolStr(a),
};
const convertDataType: Record<string, (val: unknown) => unknown> = {
  string: (val) => `${val}`,
  number: (val) => +(val as number),
  json: (val) => parseJSON(val as string, null),
  boolean: (val) => Boolean(isBoolStr(val)),
};
export default async function (
  conditionsArr: TestConditionsArr,
  workflowData: TestConditionWorkflowData
) {
  const result = {
    isMatch: false,
    replacedValue: {} as Record<string, unknown>,
  };
  const getConditionItemValue = async ({
    type,
    data,
  }: {
    type: string;
    data: TestConditionData;
  }) => {
    if (type.startsWith('data')) {
      let dataPath = String(data.dataPath).trim().replace('@', '.');
      const isInsideBrackets = dataPath.startsWith('{{') && dataPath.endsWith('}}');
      if (!isInsideBrackets) {
        dataPath = `{{${dataPath}}}`;
      }
      let dataExists: unknown = await renderString(
        dataPath,
        workflowData.refData,
        Boolean(workflowData.isPopup)
      );
      // It return string for some reason
      const renderedValue =
        dataExists === ''
          ? ''
          : (
              dataExists as {
                value: unknown;
              }
            ).value;
      dataExists = Boolean(parseJSON(renderedValue as string, false));
      return dataExists;
    }
    const copyData = cloneDeep(data) as TestConditionData;
    for (const key of Object.keys(data)) {
      const rendered = await renderString(
        copyData[key] as string,
        workflowData.refData,
        Boolean(workflowData.isPopup)
      );
      const value = rendered === '' ? '' : rendered.value;
      const list = rendered === '' ? {} : rendered.list;
      copyData[key] = value ?? '';
      Object.assign(result.replacedValue, list);
    }
    if (type === 'value') {
      const regex = /^(json|string|number|boolean)::/;
      if (regex.test(copyData.value as string)) {
        const [dataType, value] = (copyData.value as string).split(/::(.*)/s);
        return convertDataType[dataType](value);
      }
      return copyData.value;
    }
    if (type.startsWith('code')) {
      let conditionValue: unknown;
      const newRefData: Record<string, unknown> = {};
      Object.keys(workflowData.refData).forEach((keyword) => {
        if (!String(copyData.code).includes(keyword)) return;
        newRefData[keyword] = workflowData.refData[keyword];
      });
      conditionValue = await workflowData.checkCodeCondition({
        data: copyData,
        refData: newRefData,
        isPopup: workflowData.isPopup,
      });
      return conditionValue;
    }
    if (type.startsWith('element')) {
      const conditionValue = await workflowData.sendMessage({
        type: 'condition-builder',
        data: {
          type,
          data: copyData,
        },
      });
      return conditionValue;
    }
    return '';
  };
  const checkConditions = async (items: TestConditionItem[]) => {
    let conditionResult: unknown = true;
    const condition = {
      value: '' as unknown,
      operator: '',
    };
    for (const { category, data, type } of items) {
      if (!conditionResult) return conditionResult;
      if (category === 'compare') {
        const compareType = conditionBuilder.compareTypes.find(
          ({ id }: { id: string }) => id === type
        );
        if (!(compareType && compareType.needValue)) {
          conditionResult = comparisons[type](condition.value);
          return conditionResult;
        }
        condition.operator = type;
      } else if (category === 'value') {
        const conditionValue = await getConditionItemValue({ data, type });
        const valueType = conditionBuilder.valueTypes.find(
          ({ id }: { id: string }) => id === type
        );
        if (!(valueType && valueType.compareable)) {
          conditionResult = conditionValue;
        } else if (condition.operator) {
          conditionResult = comparisons[condition.operator](
            condition.value,
            conditionValue
          );
          condition.operator = '';
        }
        condition.value = conditionValue;
      }
    }
    return conditionResult;
  };
  for (const { conditions } of conditionsArr) {
    if (result.isMatch) return result;
    let isAllMatch = false;
    for (const { items } of conditions) {
      isAllMatch = Boolean(await checkConditions(items));
      if (!isAllMatch) break;
    }
    result.isMatch = isAllMatch;
  }
  return result;
}
