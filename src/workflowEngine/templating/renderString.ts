import { messageSandbox } from '../helper';
import mustacheReplacer from './mustacheReplacer';
export type RenderedStringResult = {
  list: Record<string, string>;
  value: unknown;
};
const renderString = async (
  str: string,
  data: Record<string, unknown>,
  options: Record<string, unknown> | boolean = {}
): Promise<RenderedStringResult | ''> => {
  if (!str || typeof str !== 'string') return '';
  const hasMustacheTag = /\{\{(.*?)\}\}/.test(str);
  if (!hasMustacheTag) {
    return {
      list: {},
      value: str,
    };
  }
  const evaluateJS = str.startsWith('!!');
  if (evaluateJS) {
    const refKeysRegex =
      /(variables|table|secrets|loopData|workflow|googleSheets|globalData)@/g;
    const strToRender = str.replace(refKeysRegex, '$1.');
    return messageSandbox<RenderedStringResult>('blockExpression', {
      str: strToRender,
      data,
    });
  }
  return mustacheReplacer(
    str,
    data,
    typeof options === 'object' ? options : {}
  ) as RenderedStringResult;
};
export default renderString;
