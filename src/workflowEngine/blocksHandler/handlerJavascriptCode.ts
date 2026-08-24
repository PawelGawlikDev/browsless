import { isObject, parseJSON } from '@/utils/helper';
import { MessageListener } from '@/utils/message';
import cloneDeep from 'lodash.clonedeep';
import { customAlphabet } from 'nanoid/non-secure';
import {
  browslessRefDataStr,
  checkCSPAndInject,
  messageSandbox,
  waitTabLoaded,
} from '../helper';
import { browslessFetchClient } from '../utils/javascriptBlockUtil';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerOptions,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
const nanoid = customAlphabet('1234567890abcdef', 5);
type PreloadScriptItem = {
  src: string;
  removeAfterExec?: boolean;
};
type FetchedPreloadScript = {
  script: string;
  id: string;
  removeAfterExec?: boolean;
};
type JavascriptCodeBlockData = {
  code: string;
  everyNewTab?: boolean;
  context?: string;
  timeout?: number;
  preloadScripts: PreloadScriptItem[];
};
type JavascriptCodeResult = {
  columns: {
    insert?: unknown;
    data?: unknown;
  };
  variables?: Record<string, unknown>;
};
const getWorkflowRuntimeScript = ({
  varName,
  refData,
  everyNewTab,
  isEval = false,
}: {
  varName: string;
  refData: unknown;
  everyNewTab: boolean;
  isEval?: boolean;
}) => {
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
    $browslessResolve({
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
${browslessFetchClient.toString()}

function browslessFetch(type, resource) {
  return browslessFetchClient('${varName}', { type, resource });
}
  `;
  if (everyNewTab) str = browslessRefDataStr(varName);
  return str;
};
const executeInWebpage = async (
  args: unknown[],
  target: {
    tabId?: number | null;
    frameIds?: number[];
  },
  worker: WorkflowHandlerContext
) => {
  if (!target.tabId) {
    throw new Error('no-tab');
  }
  const { debugMode } = worker.engine.workflow?.settings ?? {};
  const serializedBlockData = JSON.stringify(args[0]);
  const serializedPreloadScripts = JSON.stringify(args[1]);
  const serializedVarName = JSON.stringify(args[3]);
  const callbackFunction = `
    function() {
      try {
        const _blockData = ${serializedBlockData};
        const _preloadScripts = ${serializedPreloadScripts};
        const _varName = ${serializedVarName};

        const _browslessScript = (function(_varName, _refData, _everyNewTab, _isEval) {
          const _browslessRefDataStr = function(_varName) {
            return \`
              function findData(obj, path) {
                const paths = path.split('.');
                const isWhitespace = paths.length === 1 && !/\\\\S/.test(paths[0]);
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
                const data = \${_varName}[keyword];
                if (!data) return;
                return findData(data, path);
              }
            \`;
          };

          let _str = \`
            const \${_varName} = \${JSON.stringify(_refData)};
            \${_browslessRefDataStr(_varName)}
            function browslessSetVariable(name, value) {
              const variables = \${_varName}.variables;
              if (!variables) \${_varName}.variables = {}
              \${_varName}.variables[name] = value;
            }
            function browslessNextBlock(data, insert = true) {
              if (\${_isEval}) {
                $browslessResolve({
                  columns: {
                    data,
                    insert,
                  },
                  variables: \${_varName}.variables,
                });
              } else{
                document.body.dispatchEvent(new CustomEvent('__browsless-next-block__', { detail: { data, insert, refData: \${_varName} } }));
              }
            }
            function browslessResetTimeout() {
              if (\${_isEval}) {
                clearTimeout($browslessTimeout);
                $browslessTimeout = setTimeout(() => {
                  resolve();
                }, $browslessTimeoutMs);
              } else{
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
                const eventName = \\\`__browsless-fetch-response-\\\${id}__\\\`;
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
                  new CustomEvent(\\\`__browsless-fetch__\\\`, {
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
              return browslessFetchClient('\${_varName}', { type, resource });
            }
          \`;

          if (_everyNewTab) _str = _browslessRefDataStr(_varName);

          return _str;
        })(_varName, _blockData.refData, _blockData.data.everyNewTab, true);

        const _jsCode = (function(_blockData, _browslessScript, _preloadScripts) {
          const _preloadScriptsStr = _preloadScripts
            .map(function(item) { return item.script; })
            .join('\\n');

          return \`(() => {
            \${_preloadScriptsStr}
            return new Promise(($browslessResolve) => {
              const $browslessTimeoutMs = \${_blockData.data.timeout};
              let $browslessTimeout = setTimeout(() => {
                $browslessResolve();
              }, $browslessTimeoutMs);
              \${_browslessScript}
              try {
                \${_blockData.data.code}
                \${
                  _blockData.data.code.includes('browslessNextBlock')
                    ? ''
                    : 'browslessNextBlock()'
                }
              } catch (error) {
                return { columns: { data: { $error: true, message: error.message } } };
              }
            }).catch((error) => {
              return { columns: { data: { $error: true, message: error.message } } };
            });
          })();\`;
        })(_blockData, _browslessScript, _preloadScripts);

        return _jsCode;
      } catch (error) {
        console.error('回调函数内部错误:', error);
        throw error;
      }
    }
  `;
  const cspResult = await checkCSPAndInject(
    {
      target: target as unknown as Parameters<typeof checkCSPAndInject>[0]['target'],
      debugMode,
    },
    callbackFunction
  );
  if (cspResult.isBlocked) {
    return cspResult.value;
  }
  const [blockData, preloadScripts, , varName] = args as [
    Record<string, unknown>,
    FetchedPreloadScript[],
    unknown,
    string,
  ];
  const responses = (await MessageListener.sendMessage(
    'script:execute',
    {
      target,
      blockData,
      preloadScripts,
      varName,
    },
    'background'
  )) as Array<{
    result?: JavascriptCodeResult | null;
  }>;
  const [firstResponse] = responses;
  const result = firstResponse?.result ?? null;
  if (result && typeof result.columns?.data === 'string') {
    result.columns.data = parseJSON(result.columns.data, {});
  }
  return result;
};
export async function javascriptCode(
  this: WorkflowHandlerContext,
  { data, ...block }: WorkflowHandlerBlock<JavascriptCodeBlockData>,
  { refData }: WorkflowHandlerOptions
) {
  let nextBlockId = this.getBlockConnections(block.id);
  if (data.everyNewTab) {
    const isScriptExist = (
      this.preloadScripts as Array<{
        id: string;
      }>
    ).some(({ id }) => id === block.id);
    if (!isScriptExist) this.preloadScripts.push({ id: block.id, data: cloneDeep(data) });
    if (!this.activeTab.id) return { data: '', nextBlockId };
  } else if (!this.activeTab.id && data.context !== 'background') {
    throw new Error('no-tab');
  }
  const payload = {
    ...block,
    data,
    refData: { variables: {} } as Record<string, unknown>,
    frameSelector: this.frameSelector,
  };
  if (data.code.includes('browslessRefData')) {
    const newRefData: Record<string, unknown> = {};
    Object.keys(refData).forEach((keyword) => {
      if (!data.code.includes(keyword)) return;
      newRefData[keyword] = refData[keyword];
    });
    payload.refData = { ...newRefData, secrets: {} };
  }
  const preloadScriptsPromise = await Promise.allSettled(
    data.preloadScripts.map(async (script): Promise<FetchedPreloadScript | null> => {
      const { protocol } = new URL(script.src);
      const isValidUrl = /https?/.test(protocol);
      if (!isValidUrl) return null;
      const response = await fetch(script.src);
      if (!response.ok) throw new Error(response.statusText);
      const result = await response.text();
      return {
        script: result,
        id: `browsless-script-${nanoid()}`,
        removeAfterExec: script.removeAfterExec,
      };
    })
  );
  const preloadScripts = preloadScriptsPromise.reduce<FetchedPreloadScript[]>(
    (acc, item) => {
      if (item.status === 'fulfilled' && item.value) acc.push(item.value);
      return acc;
    },
    []
  );
  const instanceId = `browsless${nanoid()}`;
  const browslessScript =
    data.everyNewTab && (!data.context || data.context !== 'background')
      ? ''
      : getWorkflowRuntimeScript({
          varName: instanceId,
          refData: payload.refData,
          everyNewTab: Boolean(data.everyNewTab),
        });
  if (data.context !== 'background') {
    await waitTabLoaded({
      tabId: this.activeTab.id as number,
      ms: this.settings?.tabLoadTimeout ?? 30000,
    });
  }
  const inSandbox = Boolean(this.engine.isPopup) && data.context === 'background';
  const rawResult = await (inSandbox
    ? messageSandbox<JavascriptCodeResult>('javascriptBlock', {
        instanceId,
        preloadScripts,
        refData: payload.refData,
        blockData: cloneDeep(payload.data),
      })
    : executeInWebpage(
        [payload, preloadScripts, browslessScript, instanceId],
        {
          tabId: this.activeTab.id,
          frameIds: [this.activeTab.frameId || 0],
        },
        this
      ));
  const result = rawResult as JavascriptCodeResult | null | undefined;
  if (result) {
    const columnDataContainer = result.columns as {
      data?:
        | {
            $error?: boolean;
            message?: string;
          }
        | string
        | unknown;
      insert?: unknown;
    };
    if (
      typeof columnDataContainer.data === 'object' &&
      columnDataContainer.data !== null &&
      (
        columnDataContainer.data as {
          $error?: boolean;
        }
      ).$error
    ) {
      throw new Error(
        (
          columnDataContainer.data as {
            message?: string;
          }
        ).message ?? 'javascript-code-error'
      );
    }
    if (result.variables) {
      await Promise.allSettled(
        Object.keys(result.variables).map(async (varName) => {
          await this.setVariable(varName, result.variables?.[varName]);
        })
      );
    }
    let insert = true;
    let replaceTable = false;
    if (isObject(columnDataContainer.insert)) {
      const {
        insert: insertData,
        nextBlockId: inputNextBlockId,
        replaceTable: replaceTableParam,
      } = columnDataContainer.insert as {
        insert?: unknown;
        nextBlockId?: string;
        replaceTable?: unknown;
      };
      replaceTable = Boolean(replaceTableParam);
      insert = typeof insertData === 'boolean' ? insertData : true;
      if (inputNextBlockId) {
        let customNextBlockId = this.getBlockConnections(inputNextBlockId);
        const nextBlock = this.engine.blocks[inputNextBlockId];
        if (!customNextBlockId && nextBlock) {
          customNextBlockId = [
            {
              id: inputNextBlockId,
              blockId: inputNextBlockId,
              connections: new Map([]),
            } as never,
          ];
        }
        if (!customNextBlockId)
          throw new Error(`Can't find block with "${inputNextBlockId}" id`);
        nextBlockId = customNextBlockId;
      }
    } else {
      insert = Boolean(columnDataContainer.insert);
    }
    const columnData = columnDataContainer.data;
    if (insert && columnData) {
      const columnDataObj =
        typeof columnData === 'string'
          ? parseJSON<Record<string, unknown>>(columnData, null)
          : columnData;
      if (columnDataObj) {
        const params = Array.isArray(columnDataObj)
          ? (columnDataObj as Record<string, unknown>[])
          : [columnDataObj as Record<string, unknown>];
        if (replaceTable) {
          this.engine.referenceData.table = [];
          Object.keys(this.engine.columns).forEach((key) => {
            this.engine.columns[key].index = 0;
          });
        }
        this.addDataToColumn(params);
      }
    }
  }
  return {
    nextBlockId,
    data: result?.columns.data || {},
  };
}
export default javascriptCode;
