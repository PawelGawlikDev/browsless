import findSelector from '@/lib/findSelector';
import { extensionStorage } from '@/lib/extensionStorage';
import { isXPath, toCamelCase } from '@/utils/helper';
import { sendMessage } from '@/utils/message';
import cloneDeep from 'lodash.clonedeep';
import { nanoid } from 'nanoid';
import { browser } from 'wxt/browser';
import blocksHandler from './blocksHandler';
import initCommandPalette from './commandPalette';
import handleSelector, { getDocumentCtx, queryElements } from './handleSelector';
import shortcutListener from './services/shortcutListener';
import showExecutedBlock from './showExecutedBlock';
// import elementObserver from './elementObserver';
import { elementSelectorInstance } from './utils';
const isMainFrame = window.self === window.top;
type BlockExecuteData = {
  name?: string;
  label?: string;
  executedBlockOnWeb?: boolean;
  data: Record<string, any> & {
    selector?: string;
    findBy?: string;
    $frameRect?: Record<string, number>;
    $frameSelector?: string;
  };
  frameSelector?: string | null;
};
const messageToFrame = (
  frameElement: HTMLIFrameElement,
  blockData: BlockExecuteData
): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const onMessage = ({ data }: MessageEvent) => {
      const messageData = data as {
        type?: string;
        result?: {
          $isError?: boolean;
          message?: string;
          data?: unknown;
        };
      };
      if (messageData.type !== 'browsless:block-execute-result') return;
      if (messageData.result?.$isError) {
        const error = new Error(messageData.result.message) as Error & {
          data?: unknown;
        };
        error.data = messageData.result.data;
        reject(error);
      } else {
        resolve(messageData.result);
      }
      window.removeEventListener('message', onMessage);
    };
    window.addEventListener('message', onMessage);
    const messageId = `message:${nanoid(4)}`;
    extensionStorage.local.set({ [messageId]: true }).then(() => {
      frameElement.contentWindow?.postMessage(
        {
          messageId,
          type: 'browsless:execute-block',
          blockData: { ...blockData, frameSelector: '' },
        },
        '*'
      );
    });
  });
};
const executeBlock = async (data: BlockExecuteData) => {
  const removeExecutedBlock = showExecutedBlock(data as never, data.executedBlockOnWeb);
  if (data.data?.selector?.includes('|>')) {
    const selectorsArr = (data.data.selector as string).split('|>');
    const selector = selectorsArr.pop();
    const frameSelector = selectorsArr.join('|>');
    const frameElSelector = selectorsArr.pop();
    let findBy = data?.data?.findBy;
    if (!findBy) {
      findBy = isXPath(frameSelector ?? '') ? 'xpath' : 'cssSelector';
    }
    const documentCtx = getDocumentCtx(selectorsArr.join('|>'));
    const frameElement = await queryElements(
      {
        findBy,
        multiple: false,
        waitForSelector: true,
        waitSelectorTimeout: 5000,
        selector: frameElSelector ?? '',
      },
      documentCtx ?? document
    );
    const frameError = (message: string) => {
      const error = new Error(message) as Error & {
        data?: unknown;
      };
      error.data = { selector: frameSelector };
      return error;
    };
    const firstFrameElement = (
      Array.isArray(frameElement)
        ? frameElement[0]
        : frameElement instanceof NodeList
          ? frameElement[0]
          : frameElement
    ) as HTMLIFrameElement | undefined;
    if (!firstFrameElement) throw frameError('iframe-not-found');
    const isFrameElement = ['IFRAME', 'FRAME'].includes(firstFrameElement.tagName);
    if (!isFrameElement) throw frameError('not-iframe');
    const { x, y } = firstFrameElement.getBoundingClientRect();
    const iframeDetails: Record<string, number> = { x, y };
    if (isMainFrame) {
      iframeDetails.windowWidth = window.innerWidth;
      iframeDetails.windowHeight = window.innerHeight;
    }
    data.data.selector = selector;
    data.data.$frameRect = iframeDetails;
    data.data.$frameSelector = frameSelector;
    if (firstFrameElement.contentDocument) {
      data.frameSelector = frameSelector;
    } else {
      const result = await messageToFrame(firstFrameElement, data);
      return result;
    }
  }
  const handlers = blocksHandler() as unknown as Record<
    string,
    ((...args: unknown[]) => unknown) | undefined
  >;
  const handler = handlers[toCamelCase(data.name || data.label)];
  if (handler) {
    const result = await handler(data, { handleSelector });
    removeExecutedBlock();
    return result;
  }
  const error = new Error(`"${data.label}" doesn't have a handler`);
  console.error(error);
  throw error;
};
type FrameMessage = {
  data: Record<string, any> & {
    type?: string;
    messageId?: string;
    blockData?: BlockExecuteData;
  };
  source: Window | null;
};
const messageListener = async ({ data, source }: MessageEvent | FrameMessage) => {
  try {
    const messageData = data as FrameMessage['data'];
    if (messageData.type === 'browsless:get-frame' && isMainFrame) {
      const sourceWindow = source as Window | null | undefined;
      let frameRect: DOMRect | Record<string, number> = { x: 0, y: 0 };
      document.querySelectorAll('iframe').forEach((iframe) => {
        if (iframe.contentWindow !== source) return;
        frameRect = iframe.getBoundingClientRect();
      });
      sourceWindow?.postMessage(
        {
          frameRect,
          type: 'browsless:the-frame-rect',
        },
        '*'
      );
      return;
    }
    if (messageData.type === 'browsless:execute-block') {
      const messageToken = (await extensionStorage.local.get([
        messageData.messageId ?? '',
      ])) as Record<string, boolean>;
      if (!messageData.messageId || !messageToken[messageData.messageId]) {
        window.top?.postMessage(
          {
            result: {
              $isError: true,
              message: 'Block id is empty',
              data: {},
            },
            type: 'browsless:block-execute-result',
          },
          '*'
        );
        return;
      }
      await extensionStorage.local.remove([messageData.messageId]);
      executeBlock(messageData.blockData as BlockExecuteData)
        .then((result) => {
          window.top?.postMessage(
            {
              result,
              type: 'browsless:block-execute-result',
            },
            '*'
          );
        })
        .catch((error) => {
          console.error(error);
          window.top?.postMessage(
            {
              result: {
                $isError: true,
                message: error.message,
                data:
                  (
                    error as Error & {
                      data?: unknown;
                    }
                  ).data || {},
              },
              type: 'browsless:block-execute-result',
            },
            '*'
          );
        });
    }
  } catch (error) {
    console.error(error);
  }
};
(() => {
  if (window.isBrowslessInjected) return;
  initCommandPalette();
  let contextElement: Element | null = null;
  let $ctxLink = '';
  let $ctxMediaUrl = '';
  let $ctxTextSelection = '';
  window.isBrowslessInjected = true;
  window.addEventListener('message', messageListener as EventListener);
  window.addEventListener(
    'contextmenu',
    ({ target }: MouseEvent) => {
      contextElement = target as Element;
      $ctxTextSelection = window.getSelection()?.toString() ?? '';
      const el = target as HTMLElement & HTMLAnchorElement & HTMLMediaElement;
      const tag = el.tagName;
      if (tag === 'A') {
        $ctxLink = el.href;
      } else {
        const closestUrl = el.closest('a');
        if (closestUrl) $ctxLink = (closestUrl as HTMLAnchorElement).href;
      }
      const getMediaSrc = (element: HTMLElement & HTMLMediaElement) => {
        let mediaSrc: string = element.src || '';
        if (!(mediaSrc as unknown as HTMLSourceElement).src) {
          const sourceEl = element.querySelector('source');
          if (sourceEl) mediaSrc = sourceEl.src;
        }
        return mediaSrc;
      };
      const mediaTags = ['AUDIO', 'VIDEO', 'IMG'];
      if (mediaTags.includes(tag)) {
        $ctxMediaUrl = getMediaSrc(el);
      } else {
        const closestMedia = el.closest('audio,video,img') as HTMLElement &
          HTMLMediaElement;
        if (closestMedia) $ctxMediaUrl = getMediaSrc(closestMedia);
      }
    },
    true
  );
  window.isBrowslessInjected = true;
  window.addEventListener('message', messageListener as EventListener);
  window.addEventListener('contextmenu', ({ target }: MouseEvent) => {
    contextElement = target as Element;
    $ctxTextSelection = window.getSelection()?.toString() ?? '';
  });
  if (isMainFrame) {
    shortcutListener();
  }
  browser.runtime.onMessage.addListener(async (data: Record<string, any>) => {
    const asyncExecuteBlock = async (block: Record<string, any>) => {
      try {
        const res = await executeBlock(block as BlockExecuteData);
        return res;
      } catch (rawError) {
        const error = rawError as Error;
        console.error(error);
        const elNotFound = error.message === 'element-not-found';
        const isLoopItem = block.data?.selector?.includes('browsless-loop');
        if (!elNotFound || !isLoopItem) return Promise.reject(error);
        const loopEls = (data.loopEls ?? []) as Array<{
          url?: string;
          selector?: string;
          findBy?: string;
          [key: string]: unknown;
        }>;
        const findLoopEl = loopEls.find(({ url }) =>
          url ? window.location.href.includes(url) : false
        );
        const blockData = { ...block.data, ...findLoopEl, multiple: true };
        const loopBlock = {
          ...block,
          onlyGenerate: true,
          data: blockData,
        };
        await (
          blocksHandler() as unknown as Record<
            string,
            ((...args: unknown[]) => unknown) | undefined
          >
        ).loopData?.(loopBlock);
        return executeBlock(block as BlockExecuteData);
      }
    };
    if (data.isBlock) {
      const res = await asyncExecuteBlock(data);
      return res;
    }
    switch (data.type) {
      case 'input-workflow-params':
        window.initPaletteParams?.(data.data);
        return Boolean(window.initPaletteParams);
      case 'content-script-exists':
        return true;
      case 'browsless-element-selector': {
        return elementSelectorInstance();
      }
      case 'context-element': {
        let $ctxElSelector = '';
        if (contextElement) {
          $ctxElSelector = findSelector(contextElement);
          contextElement = null;
        }
        if (!$ctxTextSelection) {
          $ctxTextSelection = window.getSelection()?.toString() ?? '';
        }
        const cloneContextData = cloneDeep({
          $ctxLink,
          $ctxMediaUrl,
          $ctxElSelector,
          $ctxTextSelection,
        });
        $ctxLink = '';
        $ctxMediaUrl = '';
        $ctxElSelector = '';
        $ctxTextSelection = '';
        return cloneContextData;
      }
      default:
        return null;
    }
  });
})();
window.addEventListener('__browsless-fetch__', ((event: CustomEvent) => {
  const { id, resource, type } = event.detail as {
    id: string;
    resource: string;
    type: string;
  };
  const sendResponse = (payload: Record<string, unknown>) => {
    window.dispatchEvent(
      new CustomEvent(`__browsless-fetch-response-${id}__`, {
        detail: { id, ...payload },
      })
    );
  };
  sendMessage('fetch', { type, resource }, 'background')
    .then((result) => {
      sendResponse({ isError: false, result });
    })
    .catch((error) => {
      sendResponse({ isError: true, result: (error as Error).message });
    });
}) as EventListener);
window.addEventListener('DOMContentLoaded', async () => {
  const link = window.location.pathname;
  const isBrowsLessWorkflow = /.+\.browsless\.json$/.test(link);
  if (!isBrowsLessWorkflow) return;
  const accept = window.confirm('Do you want to add this workflow into Browsless?');
  if (!accept) return;
  const workflow = JSON.parse(document.documentElement.innerText) as Record<string, any>;
  const storage = (await extensionStorage.local.get('workflows')) as {
    workflows?: Record<string, Record<string, any>> | Array<Record<string, any>>;
  };
  const workflowsStorage =
    storage.workflows ?? ([] as unknown as Record<string, Record<string, any>>);
  const workflowId = nanoid();
  const workflowData = {
    ...workflow,
    id: workflowId,
    dataColumns: [],
    createdAt: Date.now(),
    table: workflow.table || workflow.dataColumns,
  };
  if (Array.isArray(workflowsStorage)) {
    workflowsStorage.push(workflowData);
  } else {
    workflowsStorage[workflowId] = workflowData;
  }
  await extensionStorage.local.set({ workflows: workflowsStorage });
  alert('Workflow installed');
});
