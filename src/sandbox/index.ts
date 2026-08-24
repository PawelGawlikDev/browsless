import objectPath from 'object-path';
import handleConditionCode from './utils/handleConditionCode';
import handleJavascriptBlock from './utils/handleJavascriptBlock';
import handleBlockExpression from './utils/handleBlockExpression';

const fetchResponse = ({ id, data }: { id: string; data: unknown }) => {
  window.dispatchEvent(
    new CustomEvent(`browsless-fetch-response-${id}`, {
      detail: data,
    })
  );
};

const eventHandlers = {
  fetchResponse,
  conditionCode: handleConditionCode,
  blockExpression: handleBlockExpression,
  javascriptBlock: handleJavascriptBlock,
};
type SandboxMessagePayload = {
  id?: string;
  type?: keyof typeof eventHandlers;
  data?: unknown;
  [key: string]: unknown;
};
type SandboxResponsePayload = {
  list?: Record<string, string>;
  value?: unknown;
  result?: unknown;
};

window.$getNestedProperties = objectPath.get;

window.addEventListener('message', ({ data }: MessageEvent<SandboxMessagePayload>) => {
  if (!data?.id || !data.type || !eventHandlers[data.type]) return;
  const sendResponse = (payload: SandboxResponsePayload) => {
    window.top.postMessage(
      {
        id: data.id,
        type: 'sandbox',
        result: payload,
      },
      '*'
    );
  };
  eventHandlers[data.type](data as never, sendResponse as never);
});
