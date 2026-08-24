import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import { MessageListener } from '@/utils/message';
import type { Dictionary } from '@/types/models';
import { customAlphabet } from 'nanoid/non-secure';
import { browser } from 'wxt/browser';
type TrustedTypePolicyLike = {
  createScript: (value: string) => string | unknown;
};
type SandboxMessage = {
  id?: string;
  type?: string;
  result?: unknown;
};
export const escapeElementPolicy = (script: string) => {
  const trustedTypesApi = (
    window as Window & {
      trustedTypes?: {
        createPolicy?: (...args: any[]) => TrustedTypePolicyLike;
      };
    }
  ).trustedTypes;
  if (trustedTypesApi?.createPolicy) {
    try {
      const policyNames = ['default', 'dompurify', 'jSecure', 'forceInner'];
      let escapePolicy: TrustedTypePolicyLike | null = null;
      for (const policyName of policyNames) {
        try {
          escapePolicy = trustedTypesApi.createPolicy(policyName, {
            createHTML: (to_escape) => to_escape,
            createScript: (to_escape) => to_escape,
          });
          break;
        } catch {
          console.debug(`Policy name ${policyName} failed, trying next one`);
        }
      }
      if (escapePolicy) {
        return escapePolicy.createScript(script);
      }
      console.debug(
        'All trusted policy creation attempts failed, falling back to raw script'
      );
      return script;
    } catch (e) {
      console.debug('Error creating trusted policy:', e);
      return script;
    }
  }
  return script;
};
export const messageSandbox = <T = unknown>(
  type: string,
  data: Record<string, unknown> = {}
) => {
  const nanoid = customAlphabet('1234567890abcdef', 5);
  return new Promise<T>((resolve) => {
    const messageId = nanoid();
    const iframeEl = document.getElementById('sandbox') as HTMLIFrameElement | null;
    iframeEl?.contentWindow?.postMessage({ id: messageId, type, ...data }, '*');
    const messageListener = ({ data: messageData }: MessageEvent<SandboxMessage>) => {
      if (messageData?.type !== 'sandbox' || messageData?.id !== messageId) return;
      window.removeEventListener('message', messageListener);
      resolve(messageData.result as T);
    };
    window.addEventListener('message', messageListener);
  });
};
export const getFrames = async (tabId: number) => {
  try {
    const frames = await BrowserAPIService.webNavigation.getAllFrames({
      tabId,
    });
    const framesObj = (
      frames as Array<{
        frameId: number;
        url?: string;
      }>
    ).reduce<Record<string, number>>((acc, { frameId, url }) => {
      const key = url === 'about:blank' ? '' : url;
      acc[key] = frameId;
      return acc;
    }, {});
    return framesObj;
  } catch (error) {
    console.error(error);
    return {};
  }
};
export const sendDebugCommand = (
  tabId: number,
  method: string,
  params: Dictionary = {}
) => {
  return new Promise<unknown>((resolve) => {
    BrowserAPIService.debugger.sendCommand({ tabId }, method, params, resolve);
  });
};
export const attachDebugger = async (tabId: number, prevTab?: number | null) => {
  try {
    if (prevTab && tabId !== prevTab) {
      await BrowserAPIService.debugger.detach({ tabId: prevTab });
    }
    // first attach
    await BrowserAPIService.debugger.attach({ tabId }, '1.3');
    // and then Page.enable
    await BrowserAPIService.debugger.sendCommand({ tabId }, 'Page.enable');
    return true;
  } catch (error) {
    console.error('Failed to attach debugger:', error);
    return false;
  }
};
export const waitTabLoaded = ({
  tabId,
  listenError = false,
  ms = 10000,
}: {
  tabId: number;
  listenError?: boolean;
  ms?: number;
}) => {
  return new Promise<void>((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const excludeErrors = ['net::ERR_BLOCKED_BY_CLIENT', 'net::ERR_ABORTED'];
    const onErrorOccurred = (
      details: chrome.webNavigation.WebNavigationFramedErrorCallbackDetails
    ) => {
      if (
        details.tabId !== tabId ||
        details.frameId !== 0 ||
        excludeErrors.includes(details.error)
      )
        return;
      clearTimeout(timeout);
      BrowserAPIService.webNavigation.onErrorOccurred.removeListener(onErrorOccurred);
      reject(new Error(details.error));
    };
    if (ms > 0) {
      timeout = setTimeout(() => {
        BrowserAPIService.webNavigation.onErrorOccurred.removeListener(onErrorOccurred);
        reject(new Error('Timeout'));
      }, ms);
    }
    if (listenError)
      BrowserAPIService.webNavigation.onErrorOccurred.addListener(onErrorOccurred);
    const activeTabStatus = () => {
      BrowserAPIService.tabs.get(tabId).then((tab) => {
        if (!tab) {
          reject(new Error('no-tab'));
          return;
        }
        if (tab.status === 'loading') {
          setTimeout(() => {
            activeTabStatus();
          }, 1000);
          return;
        }
        clearTimeout(timeout);
        BrowserAPIService.webNavigation.onErrorOccurred.removeListener(onErrorOccurred);
        resolve();
      });
    };
    activeTabStatus();
  });
};
export const convertData = (data: unknown, type: string) => {
  if (type === 'any') return data;
  let result = data;
  switch (type) {
    case 'integer':
      result = typeof data !== 'number' ? +String(data ?? '').replace(/\D+/g, '') : data;
      break;
    case 'boolean':
      result = Boolean(data);
      break;
    case 'array':
      result = Array.from((data as Iterable<unknown> | ArrayLike<unknown>) ?? []);
      break;
    case 'string':
      result = String(data);
      break;
    default:
  }
  return result;
};
export const browslessRefDataStr = (varName) => {
  return `
function findData(obj, path) {
  const paths = path.split('.');
  const isWhitespace = paths.length === 1 && !/\\S/.test(paths[0]);

  if (path.startsWith('$last') && Array.isArray(obj)) {
    paths[0] = obj.length - 1;
  }

  if (paths.length === 0 || isWhitespace) return obj;
  else if (paths.length === 1) return obj[paths[0]];

  let result = obj;

  for (let i = 0; i < paths.length; i++) {
    if (result[paths[i]] == undefined) {
      return undefined;
    } else {
      result = result[paths[i]];
    }
  }

  return result;
}
function browslessRefData(keyword, path = '') {
  const data = ${varName}[keyword];

  if (!data) return;

  return findData(data, path);
}
  `;
};
export const injectPreloadScript = ({
  target,
  scripts,
  frameSelector,
}: {
  target: chrome.scripting.InjectionTarget;
  scripts: Array<{
    id: string;
    data: {
      code: string;
    };
  }>;
  frameSelector?: string | null;
}) => {
  return browser.scripting.executeScript({
    target,
    world: 'MAIN',
    args: [scripts, frameSelector || null],
    func: (
      preloadScripts: Array<{
        id: string;
        data: {
          code: string;
        };
      }>,
      frame: string | null
    ) => {
      let $documentCtx = document;
      if (frame) {
        const iframeCtx = (document.querySelector(frame) as HTMLIFrameElement | null)
          ?.contentDocument;
        if (!iframeCtx) return;
        $documentCtx = iframeCtx;
      }
      preloadScripts.forEach((script) => {
        const scriptAttr = `block--${script.id}`;
        const isScriptExists = $documentCtx.querySelector(
          `.browsless-custom-js[${scriptAttr}]`
        );
        if (isScriptExists) return;
        const scriptEl = $documentCtx.createElement('script');
        scriptEl.textContent = script.data.code;
        scriptEl.setAttribute(scriptAttr, '');
        scriptEl.classList.add('browsless-custom-js');
        $documentCtx.documentElement.appendChild(scriptEl);
      });
    },
  });
};
export const checkCSPAndInject = async (
  {
    target,
    debugMode,
    options = {},
    injectOptions = {},
  }: {
    target: chrome.scripting.InjectionTarget;
    debugMode?: boolean;
    options?: Record<string, unknown>;
    injectOptions?: Record<string, unknown>;
  },
  callback?: string | (() => unknown)
): Promise<{
  isBlocked: boolean;
  value: unknown;
}> => {
  let _callback = '';
  if (typeof callback === 'function') {
    _callback = callback.toString();
  } else if (typeof callback === 'string') {
    _callback = callback;
  }
  try {
    const result = await MessageListener.sendMessage(
      'check-csp-and-inject',
      {
        target,
        debugMode,
        callback: _callback,
        options,
        injectOptions,
      },
      'background'
    );
    return result as {
      isBlocked: boolean;
      value: unknown;
    };
  } catch (error) {
    console.error('CSP check error:', error);
    return { isBlocked: false, value: null };
  }
};
const fallbackCopyTextToClipboard = (text: string) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  // Avoid scrolling to bottom
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }
  document.body.removeChild(textArea);
};
export const copyTextToClipboard = (text: string) => {
  return new Promise<boolean>((resolve, reject) => {
    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(text);
      resolve(true);
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => {
        resolve(true);
      })
      .catch((error) => {
        reject(error);
      });
  });
};
