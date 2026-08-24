import objectPath from 'object-path';
import cloneDeep from 'lodash.clonedeep';
import renderString from './renderString';
type TemplateBlock = {
  data: Record<string, unknown>;
  replacedValue?: Record<string, string>;
  [key: string]: unknown;
};
const applyTemplating = async ({
  block,
  refKeys,
  data,
  isPopup,
}: {
  block: TemplateBlock;
  refKeys?: string[] | null;
  data: Record<string, unknown>;
  isPopup?: boolean;
}): Promise<TemplateBlock> => {
  if (!refKeys || refKeys.length === 0) return block;
  const copyBlock = cloneDeep(block) as TemplateBlock;
  const addReplacedValue = (value: Record<string, string>) => {
    if (!copyBlock.replacedValue) copyBlock.replacedValue = {};
    copyBlock.replacedValue = { ...copyBlock.replacedValue, ...value };
  };
  for (const blockDataKey of refKeys) {
    const currentData = objectPath.get(copyBlock.data, blockDataKey) as unknown;
    if (!currentData) continue;
    if (Array.isArray(currentData)) {
      for (let index = 0; index < currentData.length; index += 1) {
        const value = currentData[index];
        if (typeof value !== 'string') continue;
        const renderedValue = await renderString(value, data, isPopup);
        if (!renderedValue) continue;
        addReplacedValue(renderedValue.list);
        objectPath.set(copyBlock.data, `${blockDataKey}.${index}`, renderedValue.value);
      }
      continue;
    }
    if (typeof currentData !== 'string') continue;
    const renderedValue = await renderString(currentData, data, isPopup);
    if (!renderedValue) continue;
    addReplacedValue(renderedValue.list);
    objectPath.set(copyBlock.data, blockDataKey, renderedValue.value);
  }
  return copyBlock;
};
export default applyTemplating;
