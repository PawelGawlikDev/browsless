import objectPath from 'object-path';
import credentialUtil from '@/utils/credentialUtil';
import { parseJSON } from '@/utils/helper';
import templatingFunctions from './templatingFunctions';
type TemplatingData = Record<string, any> & {
  table?: unknown[];
  functions?: Record<string, (...args: any[]) => any>;
};
type ReplaceResult = {
  list: Record<string, string>;
  value: string;
};
type ReplacerOptions = {
  data: TemplatingData;
  regex: RegExp;
  tagLen: number;
  modifyPath?: (path: string) => string;
  checkExistence?: boolean;
  disableStringify?: boolean;
};
const refKeys = {
  table: 'table',
  dataColumn: 'table',
  dataColumns: 'table',
} as const;
export const extractStrFunction = (
  str: string
): {
  name: string;
  params: string[];
} | null => {
  const extractedStr = /^\$\s*(\w+)\s*\((.*)\)/.exec(str.trim().replace(/\r?\n|\r/g, ''));
  if (!extractedStr) return null;
  const { 1: name, 2: funcParams } = extractedStr;
  const params = funcParams
    .split(/,(?=(?:[^'"\\"\\']*['"][^'"]*['"\\"\\'])*[^'"]*$)/)
    .map((param) => param.trim().replace(/^['"]|['"]$/g, '') || '');
  return { name, params };
};
export const keyParser = (
  key: string,
  data: TemplatingData
): {
  dataKey: string;
  path: string;
} => {
  let [dataKey, path] = key.split(/[@.](.+)/);
  dataKey = refKeys[dataKey as keyof typeof refKeys] ?? dataKey;
  if (!path) return { dataKey, path: '' };
  if (dataKey !== 'table') {
    if (dataKey === 'loopData' && !path.endsWith('.$index')) {
      const pathArr = path.split('.');
      pathArr.splice(1, 0, 'data');
      path = pathArr.join('.');
    }
    return { dataKey, path };
  }
  const [firstPath, restPath] = path.split(/\.(.+)/);
  if (firstPath === '$last') {
    const lastIndex = (data.table?.length ?? 1) - 1;
    path = `${lastIndex}.${restPath || ''}`;
  } else if (!restPath) {
    path = `0.${firstPath}`;
  } else if (typeof +firstPath !== 'number' || Number.isNaN(+firstPath)) {
    path = `0.${firstPath}.${restPath}`;
  }
  return { dataKey: 'table', path: path.replace(/\.$/, '') };
};
const replacer = (
  str: string,
  {
    data,
    regex,
    tagLen,
    modifyPath,
    checkExistence = false,
    disableStringify = false,
  }: ReplacerOptions
): ReplaceResult => {
  const replaceResult: ReplaceResult = {
    list: {},
    value: str,
  };
  replaceResult.value = str.replace(regex, (match) => {
    let key = match.slice(tagLen, -tagLen).trim();
    if (!key) return '';
    let result: unknown = '';
    let stringify = false;
    const isFunction = extractStrFunction(key);
    const funcRef = isFunction && data.functions?.[isFunction.name];
    if (modifyPath && !funcRef) {
      key = modifyPath(key);
    }
    if (funcRef && isFunction) {
      const funcParams = isFunction.params.map((param) => {
        const nestedResult = replacer(param, {
          data,
          tagLen: 1,
          regex: /\[(.*?)\]/,
        });
        Object.assign(replaceResult.list, nestedResult.list);
        return parseJSON(nestedResult.value, nestedResult.value);
      });
      result = funcRef.apply({ refData: data }, funcParams);
    } else {
      let { dataKey, path } = keyParser(key, data);
      if (dataKey.startsWith('!')) {
        stringify = true;
        dataKey = dataKey.slice(1);
      }
      if (checkExistence) return String(objectPath.has(data[dataKey], path));
      result = objectPath.get(data[dataKey], path);
      if (typeof result === 'undefined') result = match;
      if (dataKey === 'secrets') {
        result = typeof result !== 'string' ? {} : credentialUtil.decrypt(result);
      }
    }
    const finalResult =
      disableStringify || (typeof result === 'string' && !stringify)
        ? result
        : JSON.stringify(result);
    const listedResult =
      typeof finalResult === 'string' ? finalResult : String(finalResult ?? '');
    replaceResult.list[match] = listedResult.slice(0, 512);
    return typeof finalResult === 'string' ? finalResult : String(finalResult ?? '');
  });
  return replaceResult;
};
export default function (
  str: string,
  refData: TemplatingData,
  options: Partial<Omit<ReplacerOptions, 'data' | 'regex' | 'tagLen'>> = {}
): ReplaceResult | '' {
  if (!str || typeof str !== 'string') return '';
  const data = { ...refData, functions: templatingFunctions };
  const replacedList: Record<string, string> = {};
  const replacedStr = replacer(`${str}`, {
    data,
    tagLen: 2,
    regex: /\{\{(.*?)\}\}/g,
    modifyPath: (path) => {
      const nestedResult = replacer(path, {
        data,
        tagLen: 1,
        regex: /\[(.*?)\]/g,
        ...options,
        checkExistence: false,
      });
      Object.assign(replacedList, nestedResult.list);
      return nestedResult.value;
    },
    ...options,
  });
  Object.assign(replacedStr.list, replacedList);
  return replacedStr;
}
