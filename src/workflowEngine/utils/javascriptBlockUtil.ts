import { getDocumentCtx } from '@/content/handleSelector';
type BrowslessFetchType = string;
export const browslessFetchClient = (
  id: string,
  {
    type,
    resource,
  }: {
    type: BrowslessFetchType;
    resource: unknown;
  }
) => {
  return new Promise((resolve, reject) => {
    const validType = ['text', 'json', 'base64'];
    if (!type || !validType.includes(type)) {
      reject(new Error('The "type" must be "text" or "json"'));
      return;
    }
    const eventName = `__browsless-fetch-response-${id}__`;
    const eventListener = ({ detail }: CustomEvent) => {
      if (detail.id !== id) return;
      window.removeEventListener(eventName, eventListener);
      if (detail.isError) {
        reject(new Error(detail.result));
      } else {
        resolve(detail.result);
      }
    };
    window.addEventListener(eventName, eventListener);
    window.dispatchEvent(
      new CustomEvent(`__browsless-fetch__`, {
        detail: {
          id,
          type,
          resource,
        },
      })
    );
  });
};
type JsBlockData = {
  id?: string;
  frameSelector?: string;
  data: {
    timeout?: number;
    code?: string;
    everyNewTab?: boolean;
  };
};
type PreloadScript = {
  id: string;
  script: string;
  removeAfterExec?: boolean;
};
export const jsContentHandlerEval = ({
  blockData,
  browslessScript,
  preloadScripts,
}: {
  blockData: {
    data: JsBlockData['data'];
  };
  browslessScript: string;
  preloadScripts: Array<{
    script: string;
  }>;
}) => {
  const preloadScriptsStr = preloadScripts.map(({ script }) => script).join('\n');
  return `(() => {
      ${preloadScriptsStr}

    return new Promise(($browslessResolve) => {
      const $browslessTimeoutMs = ${blockData.data.timeout};
      let $browslessTimeout = setTimeout(() => {
        $browslessResolve();
      }, $browslessTimeoutMs);

      ${browslessScript}

      try {
        ${blockData.data.code}

        ${(blockData.data.code ?? '').includes('browslessNextBlock') ? '' : 'browslessNextBlock()'}
      } catch (error) {
        return { columns: { data: { $error: true, message: error.message } } };
      }
    }).catch((error) => {
      return { columns: { data: { $error: true, message: error.message } } };
    });
  })();`;
};
export const jsContentHandler = (
  $blockData: JsBlockData,
  $preloadScripts: PreloadScript[],
  $browslessScript: string
) => {
  return new Promise((resolve, reject) => {
    try {
      let $documentCtx: Document = document;
      if ($blockData.frameSelector) {
        const iframeCtx = getDocumentCtx($blockData.frameSelector);
        if (!iframeCtx) {
          reject(new Error('iframe-not-found'));
          return;
        }
        $documentCtx = iframeCtx;
      }
      const scriptAttr = `block--${$blockData.id}`;
      const isScriptExists = $documentCtx.querySelector(
        `.browsless-custom-js[${scriptAttr}]`
      );
      if (isScriptExists) {
        resolve('');
        return;
      }
      const script = document.createElement('script');
      script.setAttribute(scriptAttr, '');
      script.classList.add('browsless-custom-js');
      script.textContent = `(() => {
        ${$browslessScript}

        try {
          ${$blockData.data.code}
          ${
            $blockData.data.everyNewTab ||
            ($blockData.data.code ?? '').includes('browslessNextBlock')
              ? ''
              : 'browslessNextBlock()'
          }
        } catch (error) {
          console.error(error);
          ${
            $blockData.data.everyNewTab
              ? ''
              : 'browslessNextBlock({ $error: true, message: error.message })'
          }
        }
      })()`;
      const preloadScriptsEl = $preloadScripts.map((item) => {
        const scriptEl = document.createElement('script');
        scriptEl.id = item.id;
        scriptEl.textContent = item.script;
        $documentCtx.head.appendChild(scriptEl);
        return { element: scriptEl, removeAfterExec: item.removeAfterExec };
      });
      if (!$blockData.data.everyNewTab) {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        let onNextBlock: EventListener;
        let onResetTimeout: EventListener;
        const cleanUp = () => {
          script.remove();
          preloadScriptsEl.forEach((item) => {
            if (item.removeAfterExec) item.element.remove();
          });
          clearTimeout(timeout);
          $documentCtx.body.removeEventListener(
            '__browsless-reset-timeout__',
            onResetTimeout
          );
          $documentCtx.body.removeEventListener('__browsless-next-block__', onNextBlock);
        };
        onNextBlock = (({ detail }: CustomEvent) => {
          cleanUp();
          if (!detail) {
            resolve({ columns: {}, variables: {} });
            return;
          }
          const payload = {
            insert: detail.insert,
            data: detail.data?.$error ? detail.data : JSON.stringify(detail?.data ?? {}),
          };
          resolve({
            columns: payload,
            variables: detail.refData?.variables,
          });
        }) as EventListener;
        onResetTimeout = (() => {
          clearTimeout(timeout);
          timeout = setTimeout(cleanUp, $blockData.data.timeout);
        }) as EventListener;
        $documentCtx.body.addEventListener('__browsless-next-block__', onNextBlock);
        $documentCtx.body.addEventListener('__browsless-reset-timeout__', onResetTimeout);
        timeout = setTimeout(cleanUp, $blockData.data.timeout);
      } else {
        resolve(undefined);
      }
      $documentCtx.head.appendChild(script);
    } catch (error) {
      console.error(error);
    }
  });
};
