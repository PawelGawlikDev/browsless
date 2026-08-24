import { nanoid } from 'nanoid/non-secure';
type SandboxFetchResource = RequestInfo | URL;
type JavascriptBlockPayload = {
  id: string;
  refData: Record<string, any>;
  preloadScripts: Array<{
    script: string;
  }>;
  blockData: {
    code: string;
    timeout: number;
  };
};
const handleJavascriptBlock = (data: JavascriptBlockPayload) => {
  let timeout: ReturnType<typeof setTimeout>;
  const instanceId = nanoid();
  const scriptId = `script${data.id}`;
  const propertyName = `browsless${data.id}`;
  const isScriptExists = document.querySelector(`#${scriptId}`);
  if (isScriptExists) {
    window.top.postMessage(
      {
        id: data.id,
        type: 'sandbox',
        result: {
          columns: {},
          variables: {},
        },
      },
      '*'
    );
    return;
  }
  const preloadScripts = data.preloadScripts.map((item) => {
    const scriptEl = document.createElement('script');
    scriptEl.textContent = item.script;
    (document.body || document.documentElement).appendChild(scriptEl);
    return scriptEl;
  });
  if (!data.blockData.code.includes('browslessNextBlock')) {
    data.blockData.code += '\n browslessNextBlock()';
  }
  const script = document.createElement('script');
  script.id = scriptId;
  script.textContent = `
    (() => {
      function browslessRefData(keyword, path = '') {
        if (!keyword) return null;
        if (!path) return ${propertyName}.refData[keyword];

        return window.$getNestedProperties(${propertyName}.refData, keyword + '.' + path);
      }
      function browslessSetVariable(name, value) {
        const variables = ${propertyName}.refData.variables;
        if (!variables) ${propertyName}.refData.variables = {}

        ${propertyName}.refData.variables[name] = value;
      }
      function browslessNextBlock(data = {}, insert = true) {
        ${propertyName}.nextBlock({ data, insert });
      }
      function browslessResetTimeout() {
        ${propertyName}.resetTimeout();
      }
      function browslessFetch(type, resource) {
        return ${propertyName}.fetch(type, resource);
      }

      try {
        ${data.blockData.code}
      } catch (error) {
        console.error(error);
        browslessNextBlock({ $error: true, message: error.message });
      }
    })();
  `;
  const cleanUp = () => {
    script.remove();
    preloadScripts.forEach((preloadScript) => {
      preloadScript.remove();
    });
    delete window[propertyName as keyof Window];
  };
  window[propertyName] = {
    refData: data.refData,
    nextBlock: (
      result: {
        data?: unknown;
        insert?: boolean;
      } = {}
    ) => {
      cleanUp();
      window.top.postMessage(
        {
          id: data.id,
          type: 'sandbox',
          result: {
            variables: data.refData?.variables,
            columns: {
              data: result.data,
              insert: result.insert,
            },
          },
        },
        '*'
      );
    },
    resetTimeout: () => {
      clearTimeout(timeout);
      timeout = setTimeout(cleanUp, data.blockData.timeout);
    },
    fetch: (type: string, resource: SandboxFetchResource) =>
      new Promise<unknown>((resolve, reject) => {
        const types = ['json', 'text'] as const;
        if (!type || !types.includes(type as (typeof types)[number])) {
          reject(new Error('The "type" must be "text" or "json"'));
          return;
        }
        window.top.postMessage(
          {
            type: 'browsless-fetch',
            data: { id: instanceId, type, resource },
          },
          '*'
        );
        const eventName = `browsless-fetch-response-${instanceId}`;
        const eventListener = ({
          detail,
        }: CustomEvent<{
          isError?: boolean;
          result?: unknown;
        }>) => {
          window.removeEventListener(eventName, eventListener as EventListener);
          if (detail.isError) {
            reject(new Error(String(detail.result)));
          } else {
            resolve(detail.result);
          }
        };
        window.addEventListener(eventName, eventListener as EventListener);
      }),
  };
  timeout = setTimeout(cleanUp, data.blockData.timeout);
  (document.body || document.documentElement).appendChild(script);
};
export default handleJavascriptBlock;
