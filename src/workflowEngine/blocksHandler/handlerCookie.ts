import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import { parseJSON } from '@/utils/helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
type CookieBlockData = {
  type: 'get' | 'set' | 'remove';
  getAll?: boolean;
  useJson?: boolean;
  jsonCode?: string;
  name?: string;
  url?: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  expirationDate?: number | string;
  sameSite?: chrome.cookies.SameSiteStatus;
  value?: string;
  httpOnly?: boolean;
  assignVariable?: boolean;
  variableName?: string;
  saveData?: boolean;
  dataColumn?: string;
};
type CookieAction = 'get' | 'remove' | 'getAll' | 'set';
const getValues = (data: CookieBlockData, keys: string[]) => {
  const values: Record<string, unknown> = {};
  keys.forEach((key) => {
    const value = data[key as keyof CookieBlockData];
    if (!value) return;
    values[key] = value;
  });
  return values;
};
const keys: Record<CookieAction, string[]> = {
  get: ['name', 'url'],
  remove: ['name', 'url'],
  getAll: ['domain', 'name', 'path', 'secure', 'url'],
  set: [
    'name',
    'url',
    'expirationDate',
    'domain',
    'path',
    'sameSite',
    'secure',
    'url',
    'value',
    'httpOnly',
  ],
};
async function cookie(
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<CookieBlockData>
) {
  const hasPermission = await BrowserAPIService.permissions.contains({
    permissions: ['cookies'],
  });
  if (!hasPermission) {
    const error = new Error('no-permission') as Error & {
      data?: Record<string, unknown>;
    };
    error.data = { permission: 'cookies' };
    throw error;
  }
  let key: CookieAction = data.type;
  if (key === 'get' && data.getAll) key = 'getAll';
  let result: unknown = null;
  if (data.useJson) {
    const obj = parseJSON<Record<string, unknown>>(data.jsonCode ?? '', null);
    if (!obj) throw new Error('Invalid JSON format');
    result = await (
      BrowserAPIService.cookies[key] as (
        details: Record<string, unknown>
      ) => Promise<unknown>
    )(obj);
  } else {
    const values = getValues(data, keys[key]);
    if (values.expirationDate) {
      values.expirationDate = Date.now() / 1000 + Number(values.expirationDate);
    }
    if (data.type === 'remove' && !data.name) {
      const cookies = await BrowserAPIService.cookies.getAll({
        url: data.url,
      });
      const removePromise = cookies.map(({ name }) =>
        BrowserAPIService.cookies.remove({ name, url: data.url })
      );
      await Promise.allSettled(removePromise);
      result = cookies;
    } else {
      result = await (
        BrowserAPIService.cookies[key] as (
          details: Record<string, unknown>
        ) => Promise<unknown>
      )(values);
    }
  }
  if (data.type === 'get') {
    if (data.assignVariable && data.variableName) {
      await this.setVariable(data.variableName, result);
    }
    if (data.saveData && data.dataColumn) {
      this.addDataToColumn(data.dataColumn, result);
    }
  }
  return {
    data: result,
    nextBlockId: this.getBlockConnections(id),
  };
}
export default cookie;
