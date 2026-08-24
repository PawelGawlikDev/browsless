import type { Workflow, WorkflowNode } from '@/types/models';
import type { BrowserApiMessagePayload } from '@/types/runtime';
import type { WorkflowReferenceData } from '@/types/workflow-engine';
import { extensionStorage } from '@/lib/extensionStorage';
import BrowserAPIEventHandler from '@/service/browser-api/BrowserAPIEventHandler';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import getFile, { readFileAsBase64 } from '@/utils/getFile';
import { sleep } from '@/utils/helper';
import { MessageListener } from '@/utils/message';
import { browslessRefDataStr } from '@/workflowEngine/helper';
import { browser } from 'wxt/browser';
import { registerWorkflowTrigger } from '../utils/workflowTrigger';
import BackgroundEventsListeners from './BackgroundEventsListeners';
import BackgroundOffscreen from './BackgroundOffscreen';
import BackgroundUtils from './BackgroundUtils';
import BackgroundWorkflowUtils from './BackgroundWorkflowUtils';
type FetchResponseType = 'text' | 'json' | 'blob' | 'arrayBuffer' | 'base64' | 'formData';
interface FetchMessagePayload {
  type: FetchResponseType;
  resource: RequestInit & {
    url: string;
  };
}
interface WorkflowExecutePayload extends Workflow {
  includeTabId?: boolean;
  options?: Record<string, unknown> & {
    tabId?: number;
  };
}
interface WorkflowAddedPayload {
  workflowId: string;
  workflowData: unknown;
  source?: string;
}
interface WorkflowResumePayload {
  id?: string;
  nextBlock: WorkflowNode | Record<string, unknown>;
}
interface CheckCspPayload {
  target: chrome.scripting.InjectionTarget;
  debugMode?: boolean;
  callback?: string | (() => string);
  options?: Record<string, unknown>;
  injectOptions?: Omit<chrome.scripting.ScriptInjection<[], unknown>, 'target' | 'func'>;
}
interface WorkflowRuntimeScriptOptions {
  varName: string;
  refData: WorkflowReferenceData;
  everyNewTab?: boolean;
  isEval?: boolean;
}
interface PreloadScript {
  id: string;
  script: string;
  removeAfterExec?: boolean;
}
interface ScriptExecutePayload {
  target: chrome.scripting.InjectionTarget;
  blockData: {
    id: string;
    refData: WorkflowReferenceData;
    data: {
      code: string;
      timeout: number;
      everyNewTab?: boolean;
    };
  };
  varName: string;
  preloadScripts: PreloadScript[];
}
interface ScriptExecuteCallbackPayload {
  target: chrome.scripting.InjectionTarget;
  callback: string;
}
interface DownloadSuggestion {
  filename?: string;
  onConflict?: 'uniquify' | 'overwrite' | 'prompt' | string;
  waitForDownload?: boolean;
}
interface DownloadInfoState {
  downloadId: number;
  state: string | null;
  filename: string | null;
}
interface PendingDownloadRequest {
  downloadData: DownloadSuggestion;
  tabId?: number;
  callback: ((response: DownloadInfoState) => void) | null;
}
interface DownloadListenersState {
  registered: boolean;
  changedCallbacks: Map<number, (response: DownloadInfoState) => void>;
  pendingRequests: PendingDownloadRequest[];
  downloadDataCache: Map<number, DownloadSuggestion>;
  handledFilenameCallbacks: Set<string>;
  suggestCalled: Set<string>;
  downloadInfo: Map<number, DownloadInfoState>;
  handledFilenameCallbacksTimestamp: number | null;
}
interface DebuggerEvaluateResult {
  result?: {
    subtype?: string;
    description?: string;
    value?: unknown;
  };
  exceptionDetails?: unknown;
}
interface DownloadsWatchCreatedPayload {
  downloadData: DownloadSuggestion;
  tabId?: number;
  onComplete?: (response: DownloadInfoState) => void;
}
interface DownloadsWatchChangedPayload {
  downloadId?: number;
  onComplete?: (response: DownloadInfoState) => void;
}
const initBackground = () => {
  BackgroundOffscreen.instance.sendMessage('halo');
  browser.alarms.onAlarm.addListener(BackgroundEventsListeners.onAlarms);
  browser.commands.onCommand.addListener(BackgroundEventsListeners.onCommand);
  browser.action.onClicked.addListener(BackgroundEventsListeners.onActionClicked);
  browser.runtime.onStartup.addListener(BackgroundEventsListeners.onRuntimeStartup);
  browser.runtime.onInstalled.addListener(BackgroundEventsListeners.onRuntimeInstalled);
  browser.webNavigation.onCompleted.addListener(
    BackgroundEventsListeners.onWebNavigationCompleted
  );
  browser.webNavigation.onHistoryStateUpdated.addListener(
    BackgroundEventsListeners.onHistoryStateUpdated
  );
  const contextMenu = browser.contextMenus;
  if (contextMenu && contextMenu.onClicked) {
    contextMenu.onClicked.addListener(BackgroundEventsListeners.onContextMenuClicked);
  }
  if (browser.notifications && browser.notifications.onClicked) {
    browser.notifications.onClicked.addListener(
      BackgroundEventsListeners.onNotificationClicked
    );
  }
  const message = new MessageListener('background');
  message.on('browser-api', (payload: BrowserApiMessagePayload) => {
    return BrowserAPIService.runtimeMessageHandler(payload);
  });
  message.on(BrowserAPIEventHandler.RuntimeEvents.TOGGLE, (data) =>
    BrowserAPIEventHandler.instance.onToggleBrowserEventListener(data)
  );
  message.on('fetch', async ({ type, resource }: FetchMessagePayload) => {
    const response = await fetch(resource.url, resource);
    if (!response.ok) throw new Error(response.statusText);
    let result = null;
    if (type === 'base64') {
      const blob = await response.blob();
      const base64 = await readFileAsBase64(blob);
      result = base64;
    } else {
      result = await response[type]();
    }
    return result;
  });
  message.on('fetch:text', (url: string) => {
    return fetch(url).then((response) => response.text());
  });
  message.on('open:dashboard', (url: string) => BackgroundUtils.openDashboard(url));
  message.on('set:active-tab', (tabId: number) => {
    return browser.tabs.update(tabId, { active: true });
  });
  message.on('debugger:send-command', ({ tabId, method, params }) => {
    return new Promise<object | undefined>((resolve) => {
      chrome.debugger.sendCommand({ tabId }, method, params, resolve);
    });
  });
  message.on('debugger:type', ({ tabId, commands, delay }) => {
    return new Promise<void>((resolve) => {
      let index = 0;
      const executeCommands = async () => {
        const command = commands[index];
        if (!command) {
          resolve(undefined);
          return;
        }
        chrome.debugger.sendCommand(
          { tabId },
          'Input.dispatchKeyEvent',
          command,
          async () => {
            if (delay > 0) await sleep(delay);
            index += 1;
            executeCommands();
          }
        );
      };
      executeCommands();
    });
  });
  message.on('get:sender', (_, sender) => sender);
  message.on('get:file', (path: string) => getFile(path));
  message.on('get:tab-screenshot', (options, sender) => {
    if (typeof sender.tab?.windowId !== 'number') {
      throw new Error('Sender tab window is missing');
    }
    return browser.tabs.captureVisibleTab(sender.tab.windowId, options);
  });
  message.on('dashboard:refresh-packages', async () => {
    const tabs = await browser.tabs.query({
      url: browser.runtime.getURL('/dashboard.html'),
    });
    tabs.forEach((tab) => {
      if (typeof tab.id !== 'number') return;
      browser.tabs.sendMessage(tab.id, {
        type: 'refresh-packages',
      });
    });
  });
  message.on('workflow:stop', (stateId: string) =>
    BackgroundWorkflowUtils.instance.stopExecution(stateId)
  );
  message.on('workflow:execute', async (workflowData: WorkflowExecutePayload, sender) => {
    if (workflowData.includeTabId && typeof sender.tab?.id === 'number') {
      if (!workflowData.options) workflowData.options = {};
      workflowData.options.tabId = sender.tab.id;
    }
    BackgroundWorkflowUtils.instance.executeWorkflow(
      workflowData,
      workflowData?.options || {}
    );
  });
  message.on(
    'workflow:added',
    ({ workflowId, workflowData, source = 'community' }: WorkflowAddedPayload) => {
      let path = `/workflows/${workflowId}`;
      browser.tabs
        .query({ url: browser.runtime.getURL('/dashboard.html') })
        .then((tabs) => {
          if (tabs.length >= 1) {
            const lastTab = tabs.at(-1);
            if (!lastTab || typeof lastTab.id !== 'number') return;
            tabs.forEach((tab) => {
              if (typeof tab.id !== 'number') return;
              browser.tabs.sendMessage(tab.id, {
                data: { workflowId, source, workflowData },
                type: 'workflow:added',
              });
            });
            browser.tabs.update(lastTab.id, {
              active: true,
            });
            browser.windows.update(lastTab.windowId, { focused: true });
          } else {
            BackgroundUtils.openDashboard(`${path}?permission=true`);
          }
        });
    }
  );
  message.on(
    'workflow:register',
    ({
      triggerBlock,
      workflowId,
    }: {
      triggerBlock: WorkflowNode;
      workflowId: string;
    }) => {
      registerWorkflowTrigger(workflowId, triggerBlock);
    }
  );
  message.on('recording:stop', async () => {
    try {
      await BackgroundUtils.openDashboard('', false);
      await BackgroundUtils.sendMessageToDashboard('recording:stop', undefined);
    } catch (error) {
      console.error(error);
    }
  });
  message.on('workflow:resume', ({ id, nextBlock }: WorkflowResumePayload) => {
    if (!id) return;
    BackgroundWorkflowUtils.instance.resumeExecution(id, nextBlock);
  });
  message.on('workflow:breakpoint', (id: string | undefined) => {
    if (!id) return;
    BackgroundWorkflowUtils.instance.updateExecutionState(id, {
      status: 'breakpoint',
    });
  });
  message.on(
    'check-csp-and-inject',
    async ({ target, debugMode, callback, options, injectOptions }: CheckCspPayload) => {
      try {
        const [isBlockedByCSP] = (await browser.scripting.executeScript({
          target,
          func: function () {
            return new Promise<boolean>((resolve) => {
              const escapePolicy = (script: string) => {
                const trustedTypes = (
                  window as Window & {
                    trustedTypes?: {
                      createPolicy: (
                        name: string,
                        rules: {
                          createHTML: (value: string) => string;
                          createScript: (value: string) => string;
                        }
                      ) => {
                        createScript: (value: string) => string;
                      };
                    };
                  }
                ).trustedTypes;
                if (trustedTypes?.createPolicy) {
                  try {
                    const policyNames = ['default', 'dompurify', 'jSecure', 'forceInner'];
                    let escapeElPolicy = null;
                    for (const policyName of policyNames) {
                      try {
                        escapeElPolicy = trustedTypes.createPolicy(policyName, {
                          createHTML: (to_escape) => to_escape,
                          createScript: (to_escape) => to_escape,
                        });
                        break;
                      } catch {
                        return;
                      }
                    }
                    if (escapeElPolicy) {
                      return escapeElPolicy.createScript(script);
                    }
                    return script;
                  } catch {
                    return script;
                  }
                }
                return script;
              };
              const eventListener = ({
                srcElement,
              }: Event & {
                srcElement?: HTMLElement;
              }) => {
                if (!srcElement || srcElement.id !== 'browsless-csp') return;
                srcElement.remove();
                resolve(true);
              };
              document.addEventListener('securitypolicyviolation', eventListener);
              const script = document.createElement('script');
              script.id = 'browsless-csp';
              script.innerText = escapePolicy('console.log("...")');
              setTimeout(() => {
                document.removeEventListener('securitypolicyviolation', eventListener);
                resolve(false);
              }, 500);
              document.body.appendChild(script);
            });
          },
          world: 'MAIN',
          ...injectOptions,
        } as any)) as Array<{
          result: boolean;
        }>;
        // CSP blocked
        if (isBlockedByCSP.result) {
          await new Promise<void>((resolve) => {
            chrome.debugger.attach({ tabId: target.tabId }, '1.3', resolve);
          });
          const callbackString =
            typeof callback === 'function' ? callback.toString() : callback;
          if (!callbackString) {
            throw new Error('Callback is missing or invalid');
          }
          const wrappedCallback = `
          (function() {
            try {
              const fn = ${callbackString};
              return fn();
            } catch (err) {
              console.error("Error in callback execution:", err);
              return JSON.stringify({ error: err.message });
            }
          })()
        `;
          const jsCodeResult = (await chrome.debugger.sendCommand(
            { tabId: target.tabId },
            'Runtime.evaluate',
            {
              expression: wrappedCallback,
              userGesture: true,
              returnByValue: true,
              ...options,
            }
          )) as DebuggerEvaluateResult;
          if (!jsCodeResult || !jsCodeResult.result) {
            console.error('无法获取JavaScript代码，结果为空');
            throw new Error('Unable to get JavaScript code');
          }
          if (jsCodeResult.result.subtype === 'error' || jsCodeResult.exceptionDetails) {
            console.error(
              '执行回调函数时出错:',
              jsCodeResult.result.description || jsCodeResult.exceptionDetails
            );
            throw new Error(
              jsCodeResult.result.description || 'Error executing callback'
            );
          }
          if (typeof jsCodeResult.result.value !== 'string') {
            console.error('回调函数返回的不是JavaScript代码字符串');
            throw new Error('Callback did not return JavaScript code string');
          }
          const jsCode = jsCodeResult.result.value;
          const execResult = (await chrome.debugger.sendCommand(
            { tabId: target.tabId },
            'Runtime.evaluate',
            {
              expression: jsCode,
              userGesture: true,
              awaitPromise: true,
              returnByValue: true,
              ...options,
            }
          )) as DebuggerEvaluateResult;
          if (!debugMode) {
            await chrome.debugger.detach({ tabId: target.tabId });
          }
          if (!execResult || !execResult.result) {
            console.error('无法执行代码，结果为空');
            throw new Error('Unable execute code');
          }
          if (execResult.result.subtype === 'error' || execResult.exceptionDetails) {
            console.error(
              '执行JavaScript代码时出错:',
              execResult.result.description || execResult.exceptionDetails
            );
            throw new Error(
              execResult.result.description || 'Error executing JavaScript code'
            );
          }
          return {
            isBlocked: true,
            value: execResult.result.value || null,
          };
        }
        return { isBlocked: false };
      } catch (error) {
        console.error(error);
        return { isBlocked: false, error: error.message };
      }
    }
  );
  const getWorkflowRuntimeScript = ({
    varName,
    refData,
    everyNewTab,
    isEval = false,
  }: WorkflowRuntimeScriptOptions) => {
    let str = `
const ${varName} = ${JSON.stringify(refData)};
${browslessRefDataStr(varName)}
function browslessSetVariable(name, value) {
  const variables = ${varName}.variables;
  if (!variables) ${varName}.variables = {}

  ${varName}.variables[name] = value;
}
function browslessNextBlock(data, insert = true) {
  if (${isEval}) {
    Promise.resolve({
      columns: {
        data,
        insert,
      },
      variables: ${varName}.variables,
    });
  } else{
    document.body.dispatchEvent(new CustomEvent('__browsless-next-block__', { detail: { data, insert, refData: ${varName} } }));
  }
}
function browslessResetTimeout() {
  if (${isEval}) {
    clearTimeout($browslessTimeout);
    $browslessTimeout = setTimeout(() => {
      resolve();
    }, $browslessTimeoutMs);
  } else {
    document.body.dispatchEvent(new CustomEvent('__browsless-reset-timeout__'));
  }
}

function browslessFetchClient(id, { type, resource }) {
  return new Promise((resolve, reject) => {
    const validType = ['text', 'json', 'base64'];
    if (!type || !validType.includes(type)) {
      reject(new Error('The "type" must be "text" or "json"'));
      return;
    }

    const eventName = \`__browsless-fetch-response-\${id}__\`;
    const eventListener = ({ detail }) => {
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
      new CustomEvent(\`__browsless-fetch__\`, {
        detail: {
          id,
          type,
          resource,
        },
      })
    );
  });
}

function browslessFetch(type, resource) {
  return browslessFetchClient('${varName}', { type, resource });
}
  `;
    if (everyNewTab) str = browslessRefDataStr(varName);
    return str;
  };
  message.on(
    'script:execute',
    async ({ target, blockData, varName, preloadScripts }: ScriptExecutePayload) => {
      try {
        const browslessScript = getWorkflowRuntimeScript({
          varName,
          isEval: false,
          refData: blockData.refData,
          everyNewTab: blockData.data.everyNewTab,
        });
        const result = (await browser.scripting.executeScript({
          target,
          func: (
            $blockData: ScriptExecutePayload['blockData'],
            $preloadScripts: PreloadScript[],
            $browslessScript: string
          ) => {
            return new Promise<unknown>((resolve, reject) => {
              try {
                const $documentCtx = document;
                const scriptAttr = `block--${$blockData.id}`;
                const isScriptExists = $documentCtx.querySelector(
                  `.browsless-custom-js[${scriptAttr}]`
                );
                if (isScriptExists) {
                  resolve('');
                  return;
                }
                const script = $documentCtx.createElement('script');
                script.setAttribute(scriptAttr, '');
                script.classList.add('browsless-custom-js');
                script.textContent = `
                (() => {

                  // Setup context
                  ${$browslessScript}

                  // Execute user code
                  try {
                    ${$blockData.data.code}
                    ${
                      $blockData.data.everyNewTab ||
                      $blockData.data.code.includes('browslessNextBlock')
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
                })();
              `;
                const preloadScriptsEl = $preloadScripts.map((item) => {
                  const scriptEl = $documentCtx.createElement('script');
                  scriptEl.id = item.id;
                  scriptEl.textContent = item.script;
                  return {
                    element: scriptEl,
                    removeAfterExec: item.removeAfterExec,
                  };
                });
                if (!$blockData.data.everyNewTab) {
                  let timeout: ReturnType<typeof setTimeout>;
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
                    $documentCtx.body.removeEventListener(
                      '__browsless-next-block__',
                      onNextBlock
                    );
                  };
                  onNextBlock = ((event: Event) => {
                    const detail = (event as CustomEvent).detail;
                    cleanUp();
                    if (!detail) {
                      resolve({ columns: {}, variables: {} });
                      return;
                    }
                    const payload = {
                      insert: detail.insert,
                      data: detail.data?.$error
                        ? detail.data
                        : JSON.stringify(detail?.data ?? {}),
                    };
                    resolve({
                      columns: payload,
                      variables: detail.refData?.variables,
                    });
                  }) as EventListener;
                  onResetTimeout = () => {
                    clearTimeout(timeout);
                    timeout = setTimeout(cleanUp, $blockData.data.timeout);
                  };
                  $documentCtx.body.addEventListener(
                    '__browsless-next-block__',
                    onNextBlock
                  );
                  $documentCtx.body.addEventListener(
                    '__browsless-reset-timeout__',
                    onResetTimeout
                  );
                  timeout = setTimeout(cleanUp, $blockData.data.timeout);
                } else {
                  resolve(undefined);
                }
                // Inject scripts in the correct order
                preloadScriptsEl.forEach((item) => {
                  $documentCtx.head.appendChild(item.element);
                });
                $documentCtx.head.appendChild(script);
              } catch (error) {
                console.error('javascriptBlockUtil error', error);
                reject(error);
              }
            });
          },
          world: 'MAIN',
          args: [blockData, preloadScripts, browslessScript],
        } as any)) as Array<{
          result: unknown;
        }>;
        return [{ result: result[0]?.result }];
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        return { result: null, msg: error.message, error };
      }
    }
  );
  message.on(
    'script:execute-callback',
    async ({ target, callback }: ScriptExecuteCallbackPayload) => {
      try {
        const result = (await browser.scripting.executeScript({
          target,
          func: ($callbackFn: string) => {
            try {
              const script = document.createElement('script');
              script.textContent = `
          (() => {
            ${$callbackFn}
          })()
          `;
              document.body.appendChild(script);
              return { success: true };
            } catch (error) {
              console.error('执行脚本时出错:', error);
              return { success: false, error: error.message };
            }
          },
          world: 'MAIN',
          args: [callback],
        } as any)) as Array<{
          result?: {
            success?: boolean;
          };
        }>;
        const executionResult = result[0]?.result;
        if (executionResult && executionResult.success) {
          return true;
        }
        await new Promise<void>((resolve) => {
          chrome.debugger.attach({ tabId: target.tabId }, '1.3', resolve);
        });
        const execResult = (await chrome.debugger.sendCommand(
          { tabId: target.tabId },
          'Runtime.evaluate',
          {
            expression: `(() => { ${callback} })()`,
            userGesture: true,
            awaitPromise: false,
            returnByValue: true,
          }
        )) as DebuggerEvaluateResult;
        await chrome.debugger.detach({ tabId: target.tabId });
        if (!execResult || !execResult.result) {
          console.error('使用debugger API执行脚本失败');
          return false;
        }
        return true;
      } catch (error) {
        console.error('执行script:execute-callback时出错:', error);
        return false;
      }
    }
  );
  const DOWNLOADS_STORAGE_KEY = 'browsless-rename-downloaded-files';
  const getFileExtension = (str: string) => /(?:\.([^.]+))?$/.exec(str)?.[1];
  const downloadListeners: DownloadListenersState = {
    registered: false,
    changedCallbacks: new Map(),
    pendingRequests: [],
    downloadDataCache: new Map(),
    handledFilenameCallbacks: new Set(),
    suggestCalled: new Set(),
    downloadInfo: new Map(),
    handledFilenameCallbacksTimestamp: null,
  };
  const determineFilenameListener = (
    item: chrome.downloads.DownloadItem,
    suggest: (suggestion: chrome.downloads.FilenameSuggestion) => void
  ): true => {
    const downloadKey = `download-${item.id}`;
    if (downloadListeners.suggestCalled.has(downloadKey)) {
      return true;
    }
    downloadListeners.suggestCalled.add(downloadKey);
    setTimeout(async () => {
      try {
        let suggestion: DownloadSuggestion | null | undefined = null;
        if (downloadListeners.downloadDataCache.has(item.id)) {
          suggestion = downloadListeners.downloadDataCache.get(item.id);
        } else {
          const result = await extensionStorage.session.get(DOWNLOADS_STORAGE_KEY);
          const filesData = (result[DOWNLOADS_STORAGE_KEY] || {}) as Record<
            number,
            DownloadSuggestion
          >;
          suggestion = filesData[item.id];
        }
        if (!suggestion) {
          // we should not call suggest again, because Chrome expects us to handle it
          return;
        }
        if (!suggestion.filename || suggestion.filename.trim() === '') {
          return;
        }
        const hasFileExt = getFileExtension(suggestion.filename);
        if (!hasFileExt) {
          const fileExtension = getFileExtension(item.filename);
          suggestion.filename += `.${fileExtension}`;
        }
        let conflictAction: DownloadSuggestion['onConflict'] = 'uniquify';
        const validActions = ['uniquify', 'overwrite', 'prompt'];
        if (suggestion.onConflict && validActions.includes(suggestion.onConflict)) {
          conflictAction = suggestion.onConflict;
        }
        if (!suggestion.waitForDownload) {
          downloadListeners.downloadDataCache.delete(item.id);
          const result = await extensionStorage.session.get(DOWNLOADS_STORAGE_KEY);
          const filesData = (result[DOWNLOADS_STORAGE_KEY] || {}) as Record<
            number,
            DownloadSuggestion
          >;
          delete filesData[item.id];
          await extensionStorage.session.set({
            [DOWNLOADS_STORAGE_KEY]: filesData,
          });
        }
        downloadListeners.handledFilenameCallbacks.add(downloadKey);
        try {
          suggest({
            filename: suggestion.filename,
            conflictAction:
              conflictAction as chrome.downloads.FilenameSuggestion['conflictAction'],
          });
        } catch (callbackError) {
          console.error('❌ failed to call suggest callback:', callbackError);
        }
      } catch (error) {
        console.error('❌ failed to handle download filename:', error);
      }
    }, 0);
    // important: we use async processing, so we must return true
    return true;
  };
  const handleDownloadChanged = (downloadDelta: chrome.downloads.DownloadDelta): void => {
    const { id, state, filename } = downloadDelta;
    if (!id || !downloadListeners.changedCallbacks.has(id)) return;
    if (!downloadListeners.downloadInfo.has(id)) {
      downloadListeners.downloadInfo.set(id, {
        downloadId: id,
        state: null,
        filename: null,
      });
    }
    const downloadInfo = downloadListeners.downloadInfo.get(id);
    if (!downloadInfo) return;
    if (state) {
      downloadInfo.state = state.current;
    }
    if (filename) {
      downloadInfo.filename = filename.current;
    }
    if (downloadInfo.state && ['complete', 'interrupted'].includes(downloadInfo.state)) {
      const callback = downloadListeners.changedCallbacks.get(id);
      if (!callback) return;
      const completeInfo = {
        ...downloadInfo,
        filename:
          downloadInfo.filename ||
          (downloadListeners.downloadDataCache.has(id)
            ? downloadListeners.downloadDataCache.get(id).filename
            : null),
      };
      try {
        callback(completeInfo);
      } catch (callbackError) {
        console.error('❌ failed to call download changed callback:', callbackError);
      }
      downloadListeners.changedCallbacks.delete(id);
      downloadListeners.downloadDataCache.delete(id);
      downloadListeners.downloadInfo.delete(id);
      const downloadKey = `download-${id}`;
      downloadListeners.handledFilenameCallbacks.delete(downloadKey);
      downloadListeners.suggestCalled.delete(downloadKey);
    }
  };
  const handleDownloadCreated = async (
    downloadItem: chrome.downloads.DownloadItem
  ): Promise<void> => {
    try {
      let isHandled = false;
      const pendingDownloads = downloadListeners.pendingRequests || [];
      if (pendingDownloads.length > 0) {
        const pendingRequest = pendingDownloads.shift();
        if (!pendingRequest) return;
        const { downloadData, callback } = pendingRequest;
        // save to memory cache immediately to avoid race condition
        downloadListeners.downloadDataCache.set(downloadItem.id, downloadData);
        // save to storage
        const result = await extensionStorage.session.get(DOWNLOADS_STORAGE_KEY);
        const filesData = (result[DOWNLOADS_STORAGE_KEY] || {}) as Record<
          number,
          DownloadSuggestion
        >;
        filesData[downloadItem.id] = downloadData;
        await extensionStorage.session.set({ [DOWNLOADS_STORAGE_KEY]: filesData });
        if (downloadData.waitForDownload && callback) {
          downloadListeners.changedCallbacks.set(downloadItem.id, callback);
        }
        isHandled = true;
      }
      if (!isHandled) {
        const result = await extensionStorage.session.get(DOWNLOADS_STORAGE_KEY);
        const filesData = (result[DOWNLOADS_STORAGE_KEY] || {}) as Record<
          number,
          DownloadSuggestion
        >;
        if (filesData[downloadItem.id]) {
          downloadListeners.downloadDataCache.set(
            downloadItem.id,
            filesData[downloadItem.id]
          );
        }
      }
    } catch (error) {
      console.error('❌ failed to handle download created:', error);
    }
  };
  const cleanupDownloadListeners = () => {
    const MAX_AGE = 60 * 60 * 1000; // 1 hour
    const now = Date.now();
    if (downloadListeners.handledFilenameCallbacksTimestamp) {
      if (now - downloadListeners.handledFilenameCallbacksTimestamp > MAX_AGE) {
        downloadListeners.handledFilenameCallbacks.clear();
      }
    }
    downloadListeners.handledFilenameCallbacksTimestamp = now;
  };
  setInterval(cleanupDownloadListeners, 60 * 60 * 1000);
  const registerBackgroundDownloadListeners = async () => {
    try {
      if (browser.downloads.onCreated.hasListener(handleDownloadCreated)) {
        browser.downloads.onCreated.removeListener(handleDownloadCreated);
      }
      if (
        browser.downloads.onDeterminingFilename &&
        browser.downloads.onDeterminingFilename.hasListener(determineFilenameListener)
      ) {
        browser.downloads.onDeterminingFilename.removeListener(determineFilenameListener);
      }
      if (browser.downloads.onChanged.hasListener(handleDownloadChanged)) {
        browser.downloads.onChanged.removeListener(handleDownloadChanged);
      }
      downloadListeners.handledFilenameCallbacks.clear();
      downloadListeners.suggestCalled.clear();
      downloadListeners.downloadInfo.clear();
      if (downloadListeners.registered) {
        downloadListeners.registered = false;
      }
    } catch (cleanupError) {
      console.warn('⚠️ failed to cleanup existing listeners:', cleanupError);
    }
    if (downloadListeners.registered) return;
    try {
      const hasPermission = await browser.permissions.contains({
        permissions: ['downloads'],
      });
      if (!hasPermission) {
        console.error('❌ no download permission, cannot register listeners');
        return;
      }
      browser.downloads.onCreated.addListener(handleDownloadCreated);
      if (browser.downloads.onDeterminingFilename) {
        browser.downloads.onDeterminingFilename.addListener(determineFilenameListener);
      }
      browser.downloads.onChanged.addListener(handleDownloadChanged);
      downloadListeners.registered = true;
      downloadListeners.pendingRequests = [];
      downloadListeners.handledFilenameCallbacksTimestamp = Date.now();
    } catch (error) {
      console.error('❌ failed to register download listeners:', error);
    }
  };
  message.on('downloads:register-listeners', async () => {
    await registerBackgroundDownloadListeners();
    return true;
  });
  message.on('downloads:watch-created', async (data: DownloadsWatchCreatedPayload) => {
    await registerBackgroundDownloadListeners();
    // save pending download requests
    downloadListeners.pendingRequests = downloadListeners.pendingRequests || [];
    // safe callback
    let safeCallback: PendingDownloadRequest['callback'] = null;
    if (typeof data.onComplete === 'function') {
      safeCallback = (response) => {
        try {
          data.onComplete(response);
        } catch (callbackError) {
          console.error('❌ failed to call download complete callback:', callbackError);
        }
      };
    }
    downloadListeners.pendingRequests.push({
      downloadData: data.downloadData,
      tabId: data.tabId,
      callback: safeCallback,
    });
    return true;
  });
  message.on(
    'downloads:watch-changed',
    async ({ downloadId, onComplete }: DownloadsWatchChangedPayload) => {
      await registerBackgroundDownloadListeners();
      if (downloadId && typeof onComplete === 'function') {
        const safeCallback = (response: DownloadInfoState) => {
          try {
            onComplete(response);
          } catch (callbackError) {
            console.error('❌ failed to call download changed callback:', callbackError);
          }
        };
        downloadListeners.changedCallbacks.set(downloadId, safeCallback);
      }
      return true;
    }
  );
  browser.runtime.onMessage.addListener(message.listener);
};
export default initBackground;
