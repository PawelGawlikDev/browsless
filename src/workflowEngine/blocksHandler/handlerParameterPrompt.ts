import { nanoid } from 'nanoid/non-secure';
import { sleep } from '@/utils/helper';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import renderString from '../templating/renderString';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerOptions,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
type ParameterPromptParam = {
  name?: string;
  defaultValue?: unknown;
  description?: unknown;
  placeholder?: unknown;
};
type ParameterPromptBlockData = {
  timeout: number;
  parameters: ParameterPromptParam[];
};
type PromptResult = Record<
  string,
  {
    $isError?: boolean;
    message?: string;
  } & Record<string, unknown>
>;
type StorageChangedEvent = Record<
  string,
  | {
      newValue?: PromptResult[string];
    }
  | undefined
>;
const getInputtedParams = (promptId: string, ms = 10000) => {
  return new Promise<PromptResult>((resolve, reject) => {
    const storageListener = (event: StorageChangedEvent) => {
      if (!event[promptId]) return;
      BrowserAPIService.storage.onChanged.removeListener(storageListener);
      BrowserAPIService.storage.local.remove(promptId);
      const { newValue } = event[promptId] as {
        newValue: PromptResult[string];
      };
      if (newValue.$isError) {
        reject(new Error(newValue.message));
        return;
      }
      resolve(newValue as PromptResult);
    };
    if (ms > 0) {
      setTimeout(() => {
        BrowserAPIService.storage.onChanged.removeListener(storageListener);
        resolve({});
      }, ms);
    }
    BrowserAPIService.storage.onChanged.addListener(storageListener);
  });
};
const renderParamValue = async (
  param: ParameterPromptParam,
  refData: Record<string, unknown>,
  isPopup?: boolean
) => {
  const renderedVals: Partial<ParameterPromptParam> = {};
  const keys = ['defaultValue', 'description', 'placeholder'] as const;
  await Promise.allSettled(
    keys.map(async (key) => {
      if (!param[key]) return;
      const rendered = await renderString(
        param[key] as string,
        refData,
        Boolean(isPopup)
      );
      renderedVals[key] = rendered === '' ? '' : rendered.value;
    })
  );
  return { ...param, ...renderedVals };
};
export default async function (
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<ParameterPromptBlockData>,
  { refData }: WorkflowHandlerOptions
) {
  const paramURL = BrowserAPIService.runtime.getURL('/params.html');
  let tab = (await BrowserAPIService.tabs.query({})).find((item) =>
    item.url?.includes(paramURL)
  );
  if (!tab) {
    const createdWindow = await BrowserAPIService.windows.create({
      type: 'popup',
      width: 480,
      height: 600,
      url: BrowserAPIService.runtime.getURL('/params.html'),
    });
    [tab] = createdWindow.tabs ?? [];
    await sleep(1000);
  } else {
    await BrowserAPIService.tabs.update(tab.id as number, {
      active: true,
    });
    await BrowserAPIService.windows.update(tab.windowId, { focused: true });
  }
  if (!tab?.id) throw new Error('no-tab');
  const promptId = `params-prompt:${nanoid(4)}__${id}`;
  const { timeout } = data;
  const workflow = this.engine.workflow ?? {};
  const params = await Promise.all(
    data.parameters.map((item) => renderParamValue(item, refData, this.engine.isPopup))
  );
  await BrowserAPIService.tabs.sendMessage(tab.id, {
    name: 'workflow:params-block',
    data: {
      params,
      promptId,
      blockId: id,
      timeoutMs: timeout,
      execId: this.engine.id,
      timeout: Date.now() + timeout,
      name: workflow.name,
      icon: workflow.icon,
      description: workflow.description,
    },
  });
  const result = await getInputtedParams(promptId, timeout);
  await Promise.allSettled(
    Object.entries(result).map(async ([varName, varValue]) =>
      this.setVariable(varName, varValue)
    )
  );
  return {
    data: '',
    nextBlockId: this.getBlockConnections(id),
  };
}
