import { MessageListener } from '@/utils/message';
import type { BrowserApiMessagePayload, SerializedValue } from '@/types/runtime';
import { deserializeFunctions, serializeFunctions } from '@/utils/serialization';
import objectPath from 'object-path';
import { browser as Browser } from 'wxt/browser';
import BrowserAPIEventHandler from './BrowserAPIEventHandler';
import { browserAPIMap } from './browser-api-map';
/**
 * @typedef {Object} ScriptInjectTarget
 * @property {number} tabId
 * @property {number=} frameId
 * @property {boolean=} allFrames
 */
// Maybe there's a better way?
export const IS_BROWSER_API_AVAILABLE = 'tabs' in Browser;
const bindBrowserMethod = (path: string, value: unknown) => {
  if (typeof value !== 'function') return value;
  const pathParts = path.split('.');
  const methodName = pathParts.at(-1);
  const ownerPath = pathParts.slice(0, -1).join('.');
  let owner = objectPath.get(Browser, ownerPath);
  if (!owner && ownerPath === 'browserAction') {
    owner = Browser.action || Browser.browserAction;
  }
  if (!owner && ownerPath === 'debugger') {
    owner = chrome.debugger;
  }
  if (!owner || !methodName || typeof owner[methodName] !== 'function') {
    return value;
  }
  return owner[methodName].bind(owner);
};
const sendBrowserApiMessage = (name: string, ...args: unknown[]) => {
  const serializedArgs = serializeFunctions(args);
  return MessageListener.sendMessage(
    'browser-api',
    {
      name,
      args: serializedArgs as unknown as SerializedValue[],
    },
    'background'
  );
};
class BrowserContentScript {
  /**
   * Check if content script injected
   * @param {ScriptInjectTarget} target
   * @param {string=} messageId
   */
  static async isContentScriptInjected(target, messageId) {
    if (!IS_BROWSER_API_AVAILABLE) {
      return sendBrowserApiMessage('contentScript.isContentScriptInjected', ...arguments);
    }
    try {
      await Browser.tabs.sendMessage(
        target.tabId,
        { type: messageId || 'content-script-exists' },
        {
          frameId: target.allFrames ? undefined : target.frameId,
        }
      );
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Inject content script into targeted tab
   * @param {Object} script
   * @param {ScriptInjectTarget} script.target
   * @param {string} script.file
   * @param {boolean=} script.injectImmediately
   * @param {(boolean|{timeoutMs?: number, maxTry?: number, messageId?: string})=} script.waitUntilInjected
   * @returns {Promise<boolean>}
   */
  static async inject({
    file,
    target,
    injectImmediately,
    waitUntilInjected,
  }: {
    file: string;
    target: {
      tabId: number;
      frameId?: number;
      allFrames?: boolean;
    };
    injectImmediately?: boolean;
    waitUntilInjected?:
      | boolean
      | {
          timeoutMs?: number;
          maxTry?: number;
          messageId?: string;
        };
  }) {
    if (!IS_BROWSER_API_AVAILABLE) {
      return sendBrowserApiMessage('contentScript.inject', ...arguments);
    }
    const frameId =
      Object.hasOwn(target, 'frameId') && !target.allFrames ? target.frameId : undefined;
    // Legacy executeScript fallback.
    if (
      (
        Browser.tabs as typeof Browser.tabs & {
          injectContentScript?: unknown;
        }
      ).injectContentScript
    ) {
      await Browser.tabs.executeScript(target.tabId, {
        file,
        frameId,
        allFrames: target.allFrames,
      });
    } else {
      // MV3 chrome
      const scriptingApi = Browser.scripting as typeof Browser.scripting & {
        executeScript: (payload: unknown) => Promise<unknown>;
      };
      await scriptingApi.executeScript({
        target: {
          tabId: target.tabId,
          allFrames: target.allFrames,
          frameIds: typeof frameId === 'number' ? [frameId] : undefined,
        },
        files: [file],
        injectImmediately,
      });
    }
    if (!waitUntilInjected) return true;
    const waitOptions = typeof waitUntilInjected === 'boolean' ? {} : waitUntilInjected;
    const maxTryCount = waitOptions.maxTry ?? 3;
    const timeoutMs = waitOptions.timeoutMs ?? 1000;
    let tryCount = 0;
    return new Promise((resolve) => {
      const checkIfInjected = async () => {
        try {
          if (tryCount > maxTryCount) {
            resolve(false);
            return;
          }
          tryCount += 1;
          const isInjected = await BrowserContentScript.isContentScriptInjected(
            target,
            waitOptions.messageId
          );
          if (isInjected) {
            resolve(true);
            return;
          }
          setTimeout(() => checkIfInjected(), timeoutMs);
        } catch (error) {
          console.error(error);
          setTimeout(() => checkIfInjected(), timeoutMs);
        }
      };
      checkIfInjected();
    });
  }
  /**
   * Check if content script injected
   * @param {ScriptInjectTarget} target
   * @param {string=} messageId
   */
  static async isInjected(
    {
      tabId,
      allFrames,
      frameId,
    }: {
      tabId: number;
      allFrames?: boolean;
      frameId?: number;
    },
    messageId?: string
  ) {
    if (!IS_BROWSER_API_AVAILABLE) {
      return sendBrowserApiMessage('contentScript.isInjected', ...arguments);
    }
    try {
      await Browser.tabs.sendMessage(
        tabId,
        { type: messageId || 'content-script-exists' },
        { frameId: allFrames ? undefined : frameId }
      );
      return true;
    } catch {
      return false;
    }
  }
}
class BrowserAPIService {
  /**
   * Handle runtime message that send by BrowserAPIService when API is not available
   * @param {{ name: string; args: any[] }} payload;
   */
  static runtimeMessageHandler({ args, name }: BrowserApiMessagePayload) {
    const deserializedArgs = deserializeFunctions<unknown[]>(
      args as unknown as SerializedValue[]
    );
    const apiHandler = objectPath.get(this, name);
    if (!apiHandler) throw new Error(`"${name}" is invalid method`);
    return deserializedArgs ? apiHandler(...deserializedArgs) : apiHandler();
  }
  static runtime = Browser.runtime;
  /** @type {typeof Browser.tabs} */
  static tabs;
  /** @type {typeof Browser.proxy} */
  static proxy;
  /** @type {typeof Browser.storage} */
  static storage;
  /** @type {typeof Browser.windows} */
  static windows;
  /** @type {typeof chrome.debugger} */
  static debugger;
  /** @type {typeof Browser.webNavigation} */
  static webNavigation;
  /** @type {typeof Browser.permissions} */
  static permissions;
  /** @type {typeof Browser.downloads} */
  static downloads;
  /** @type {typeof Browser.cookies} */
  static cookies;
  /** @type {typeof Browser.notifications} */
  static notifications;
  /** @type {typeof Browser.browserAction} */
  static browserAction;
  /** @type {typeof Browser.extension} */
  static extension;
  static contentScript = BrowserContentScript;
}
(() => {
  browserAPIMap.forEach((item) => {
    let value;
    if (IS_BROWSER_API_AVAILABLE) {
      value = bindBrowserMethod(item.path, item.api());
    } else {
      value = item.isEvent
        ? BrowserAPIEventHandler.instance.createEventListener(item.path)
        : (...args) => sendBrowserApiMessage(item.path, ...args);
    }
    objectPath.set(BrowserAPIService, item.path, value);
  });
})();
export default BrowserAPIService;
