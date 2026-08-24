import dbStorage from '@/db/storage';
import type { WorkflowNode } from '@/types/models';
import type { SharedBlocksMap } from '@/types/shared-data';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import { isObject, objectHasKey, parseJSON, sleep, toCamelCase } from '@/utils/helper';
import cloneDeep from 'lodash.clonedeep';
import type WorkflowEngine from './WorkflowEngine';
import { convertData, waitTabLoaded } from './helper';
import templating from './templating';
import renderString from './templating/renderString';
const workflowDb = dbStorage as any;
type WorkflowBlock = WorkflowNode & {
  data: Record<string, any>;
};
type WorkflowConnection = {
  id: string;
  targetHandle?: string;
  sourceHandle?: string;
};
type WorkflowWorkerState = {
  windowId: number | null;
  loopList: Record<string, unknown>;
  activeTab: WorkflowActiveTab;
  currentBlock: WorkflowBlockRun | null;
  repeatedTasks: Record<string, unknown>;
  preloadScripts: unknown[];
  debugAttached: boolean;
};
type WorkflowBlockRun = WorkflowBlock & {
  startedAt?: number;
};
type WorkflowActiveTab = {
  url: string;
  frameId: number;
  frames: Record<string, unknown>;
  groupId: number | null;
  id: number | null;
};
type WorkflowExecParam = {
  prevBlockData?: unknown;
  targetHandle?: string;
  sourceHandle?: string;
  nextBlockBreakpointCount?: number | null;
  resume?: boolean;
  [key: string]: unknown;
};
type WorkflowBlockResult = {
  data?: unknown;
  nextBlockId?: Array<string | WorkflowConnection> | null;
  destroyWorker?: boolean;
  replacedValue?: unknown;
  status?: string;
  logId?: string | number;
  ctxData?: Record<string, unknown>;
};
type WorkflowErrorHandling = {
  enable?: boolean;
  retry?: boolean;
  retryTimes?: number;
  retryInterval?: number;
  insertData?: boolean;
  dataToInsert?: Array<{
    value: string;
    type: string;
    name: string;
  }>;
  toDo?: string;
  errorMessage?: string;
};
type WorkflowBlockHandler = (
  block: WorkflowBlock,
  context: Record<string, unknown>
) => Promise<WorkflowBlockResult>;
const blockExecutionWrapper = (
  blockHandler: () => Promise<WorkflowBlockResult>,
  blockData: Record<string, any>
) => {
  return new Promise<WorkflowBlockResult>((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const timeoutMs = blockData?.settings?.blockTimeout as number | undefined;
    if (timeoutMs && timeoutMs > 0) {
      timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, timeoutMs);
    }
    blockHandler()
      .then((result) => {
        resolve(result);
      })
      .catch((error: unknown) => {
        reject(error);
      })
      .finally(() => {
        if (timeout) clearTimeout(timeout);
      });
  });
};
class WorkflowWorker {
  id: string;
  engine: WorkflowEngine;
  settings: Record<string, any>;
  blocksDetail: SharedBlocksMap;
  loopEls: unknown[];
  loopList: Record<string, unknown>;
  repeatedTasks: Record<string, unknown>;
  preloadScripts: unknown[];
  breakpointState: {
    block: WorkflowBlock;
    execParam: WorkflowExecParam;
    isRetry: boolean;
  } | null;
  windowId: number | null;
  currentBlock: WorkflowBlockRun | null;
  childWorkflowId: string | null;
  debugAttached: boolean;
  activeTab: WorkflowActiveTab;
  parentWorkflow?: unknown;
  options?: {
    tabId?: number | null;
  };
  frameSelector?: string;
  constructor(
    id: string,
    engine: WorkflowEngine,
    options: {
      blocksDetail?: SharedBlocksMap;
    } = {}
  ) {
    this.id = id;
    this.engine = engine;
    this.settings = engine.workflow.settings;
    this.blocksDetail = options.blocksDetail || {};
    this.loopEls = [];
    this.loopList = {};
    this.repeatedTasks = {};
    this.preloadScripts = [];
    this.breakpointState = null;
    this.windowId = null;
    this.currentBlock = null;
    this.childWorkflowId = null;
    this.debugAttached = false;
    this.activeTab = {
      url: '',
      frameId: 0,
      frames: {},
      groupId: null,
      id: engine.options?.tabId ?? null,
    };
  }
  init({
    blockId,
    execParam,
    state,
  }: {
    blockId: string;
    execParam?: WorkflowExecParam;
    state?: Record<string, unknown>;
  }) {
    if (state) {
      Object.keys(state).forEach((key) => {
        (this as unknown as Record<string, unknown>)[key] = state[key];
      });
    }
    const block = this.engine.blocks[blockId];
    this.executeBlock(block, execParam);
  }
  addDataToColumn(key: string | Record<string, unknown>[], value: unknown) {
    if (Array.isArray(key)) {
      key.forEach((item) => {
        if (!isObject(item)) return;
        Object.entries(item).forEach(([itemKey, itemValue]) => {
          this.addDataToColumn(itemKey, itemValue);
        });
      });
      return;
    }
    const insertDefault = this.settings.insertDefaultColumn ?? true;
    const columnId =
      (this.engine.columns[key] ? key : this.engine.columnsId[key]) || 'column';
    if (columnId === 'column' && !insertDefault) return;
    const currentColumn = this.engine.columns[columnId];
    const columnName = currentColumn.name || 'column';
    const convertedValue = convertData(value, currentColumn.type);
    if (objectHasKey(this.engine.referenceData.table, currentColumn.index)) {
      this.engine.referenceData.table[currentColumn.index][columnName] = convertedValue;
    } else {
      this.engine.referenceData.table.push({
        [columnName]: convertedValue,
      });
    }
    currentColumn.index += 1;
  }
  async setVariable(name: string, value: unknown) {
    let variableName = name;
    const vars = this.engine.referenceData.variables;
    if (name.startsWith('$push:')) {
      const { 1: varName } = name.split('$push:');
      if (!objectHasKey(vars, varName)) vars[varName] = [];
      else if (!Array.isArray(vars[varName])) vars[varName] = [vars[varName]];
      (vars[varName] as unknown[]).push(value);
      variableName = varName;
    } else {
      vars[name] = value;
    }
    if (variableName.startsWith('$$')) {
      variableName = variableName.slice(2);
      const findStorageVar = await workflowDb.variables.get({
        name: variableName,
      });
      if (findStorageVar) await workflowDb.variables.update(findStorageVar.id, { value });
      else await workflowDb.variables.add({ name: variableName, value });
    }
    this.engine.addRefDataSnapshot('variables');
  }
  getBlockConnections(blockId: string, outputIndex: number | string = 1) {
    if (this.engine.isDestroyed) return null;
    const outputId = `${blockId}-output-${outputIndex}`;
    const connections = this.engine.connectionsMap[outputId];
    if (!connections) return null;
    return [...connections.values()];
  }
  executeNextBlocks(
    connections: Array<string | WorkflowConnection>,
    prevBlockData: unknown,
    nextBlockBreakpointCount: number | null = null
  ) {
    for (const connection of connections) {
      const id = typeof connection === 'string' ? connection : connection.id;
      const block = this.engine.blocks[id];
      if (!block) {
        console.error(`Block ${id} doesn't exist`);
        this.engine.destroy('stopped');
        return;
      }
      if (block.data.disableBlock) continue;
      if (block.data?.$breakpoint) {
        nextBlockBreakpointCount = 0;
      }
    }
    connections.forEach((connection, index) => {
      const { id, targetHandle, sourceHandle } =
        typeof connection === 'string'
          ? { id: connection, targetHandle: '', sourceHandle: '' }
          : connection;
      const execParam: WorkflowExecParam = {
        prevBlockData,
        targetHandle,
        sourceHandle,
        nextBlockBreakpointCount,
      };
      if (index === 0) {
        this.executeBlock(this.engine.blocks[id], {
          prevBlockData,
          ...execParam,
        });
      } else {
        const state = cloneDeep({
          windowId: this.windowId,
          loopList: this.loopList,
          activeTab: this.activeTab,
          currentBlock: this.currentBlock,
          repeatedTasks: this.repeatedTasks,
          preloadScripts: this.preloadScripts,
          debugAttached: this.debugAttached,
        }) as WorkflowWorkerState;
        this.engine.addWorker({
          state,
          execParam,
          blockId: id,
        });
      }
    });
  }
  resume(nextBlock: unknown) {
    if (!this.breakpointState) return;
    const { block, execParam, isRetry } = this.breakpointState;
    const payload: WorkflowExecParam = { ...execParam, resume: true };
    payload.nextBlockBreakpointCount = nextBlock ? 1 : null;
    this.executeBlock(block, payload, isRetry);
    this.breakpointState = null;
  }
  async executeBlock(
    block: WorkflowBlock,
    execParam: WorkflowExecParam = {},
    isRetry = false
  ) {
    const currentState = (await this.engine.states.get(this.engine.id)) as
      | {
          status?: string;
          isDestroyed?: boolean;
        }
      | undefined;
    if (!currentState || currentState.isDestroyed) {
      if (this.engine.isDestroyed) return;
      await this.engine.destroy('stopped');
      return;
    }
    const startExecuteTime = Date.now();
    const prevBlock = this.currentBlock;
    this.currentBlock = { ...block, startedAt: startExecuteTime };
    const isInBreakpoint =
      this.engine.isTestingMode &&
      ((block.data?.$breakpoint && !execParam.resume) ||
        execParam.nextBlockBreakpointCount === 0);
    if (!isRetry) {
      const payload: Record<string, unknown> = {
        activeTabUrl: this.activeTab.url,
        childWorkflowId: this.childWorkflowId,
        nextBlockBreakpoint: Boolean(execParam.nextBlockBreakpointCount),
      };
      if (isInBreakpoint && currentState.status !== 'breakpoint') {
        payload.status = 'breakpoint';
      }
      await this.engine.updateState(payload);
    }
    if (execParam.nextBlockBreakpointCount) {
      execParam.nextBlockBreakpointCount -= 1;
    }
    if (isInBreakpoint || currentState.status === 'breakpoint') {
      this.engine.isInBreakpoint = true;
      this.breakpointState = { block, execParam, isRetry };
      return;
    }
    const blockHandler = this.engine.blocksHandler[toCamelCase(block.label)] as
      WorkflowBlockHandler | undefined;
    const handler =
      !blockHandler && this.blocksDetail[block.label]?.category === 'interaction'
        ? (this.engine.blocksHandler.interactionBlock as WorkflowBlockHandler | undefined)
        : blockHandler;
    if (!handler) {
      console.error(`${block.label} doesn't have handler`);
      this.engine.destroy('stopped');
      return;
    }
    const { prevBlockData } = execParam;
    const refData = {
      prevBlockData,
      ...this.engine.referenceData,
      activeTabUrl: this.activeTab.url,
    };
    const replacedBlock = (await templating({
      block,
      data: refData,
      isPopup: this.engine.isPopup,
      refKeys:
        isRetry || block.data.disableBlock
          ? null
          : this.blocksDetail[block.label]?.refDataKeys,
    })) as WorkflowBlock & {
      replacedValue?: unknown;
    };
    const blockDelay = (this.settings?.blockDelay as number) || 0;
    const addBlockLog = (status: string, obj: Record<string, unknown> = {}) => {
      let { description } = block.data;
      if (block.label === 'loop-breakpoint') description = block.data.loopId;
      else if (block.label === 'block-package') description = block.data.name;
      this.engine.addLogHistory({
        description,
        prevBlockData,
        type: status,
        name: block.label,
        blockId: block.id,
        workerId: this.id,
        timestamp: startExecuteTime,
        activeTabUrl: this.activeTab?.url,
        replacedValue: replacedBlock.replacedValue,
        duration: Math.round(Date.now() - startExecuteTime),
        ...obj,
      });
    };
    const executeBlocks = (blocks: Array<string | WorkflowConnection>, data: unknown) => {
      return this.executeNextBlocks(
        blocks,
        data,
        execParam.nextBlockBreakpointCount ?? null
      );
    };
    try {
      let result: WorkflowBlockResult;
      if (block.data.disableBlock) {
        result = {
          data: '',
          nextBlockId: this.getBlockConnections(block.id),
        };
      } else {
        const bindedHandler = handler.bind(this, replacedBlock, {
          refData,
          prevBlock,
          ...(execParam || {}),
        }) as () => Promise<WorkflowBlockResult>;
        result = await blockExecutionWrapper(bindedHandler, block.data);
        if (this.engine.isDestroyed) return;
        if (result.replacedValue) {
          replacedBlock.replacedValue = result.replacedValue;
        }
        addBlockLog(result.status || 'success', {
          logId: result.logId,
          ctxData: result.ctxData,
        });
      }
      if (result.nextBlockId && !result.destroyWorker) {
        if (blockDelay > 0) {
          setTimeout(() => {
            executeBlocks(result.nextBlockId || [], result.data);
          }, blockDelay);
        } else {
          executeBlocks(result.nextBlockId, result.data);
        }
      } else {
        this.engine.destroyWorker(this.id);
      }
    } catch (rawError) {
      console.error(rawError);
      const error = rawError as Error & {
        data?: Record<string, unknown>;
        ctxData?: Record<string, unknown>;
      };
      const errorLogData: Record<string, unknown> = {
        message: error.message,
        ...(error.data || {}),
        ...(error.ctxData || {}),
      };
      const blockOnError = replacedBlock.data.onError as
        WorkflowErrorHandling | undefined;
      if (blockOnError && blockOnError.enable) {
        if (blockOnError.retry && blockOnError.retryTimes) {
          await sleep((blockOnError.retryInterval || 0) * 1000);
          blockOnError.retryTimes -= 1;
          await this.executeBlock(replacedBlock, execParam, true);
          return;
        }
        if (blockOnError.insertData) {
          for (const item of blockOnError.dataToInsert || []) {
            let value = (
              (await renderString(item.value, refData, this.engine.isPopup)) as
                | {
                    value?: unknown;
                  }
                | undefined
            )?.value;
            value = parseJSON(value, value);
            if (item.type === 'variable') {
              await this.setVariable(item.name, value);
            } else {
              this.addDataToColumn(item.name, value);
            }
          }
        }
        const nextBlocks = this.getBlockConnections(
          block.id,
          blockOnError.toDo === 'continue' ? 1 : 'fallback'
        );
        if (blockOnError.toDo !== 'error' && nextBlocks) {
          addBlockLog('error', errorLogData);
          executeBlocks(nextBlocks, prevBlockData);
          return;
        }
        if (blockOnError.toDo === 'error' && blockOnError.errorMessage?.trim()) {
          errorLogData.message = blockOnError.errorMessage;
          error.message = blockOnError.errorMessage;
        }
      }
      const errorLogItem = errorLogData;
      addBlockLog('error', errorLogItem);
      errorLogItem.blockId = block.id;
      const { onError } = this.settings;
      const nodeConnections = this.getBlockConnections(block.id);
      if (onError === 'keep-running' && nodeConnections) {
        setTimeout(() => {
          executeBlocks(nodeConnections, error.data || '');
        }, blockDelay);
      } else if (onError === 'restart-workflow' && !this.parentWorkflow) {
        const restartCount = this.engine.restartWorkersCount[this.id] || 0;
        const maxRestart = this.settings.restartTimes ?? 3;
        if (restartCount >= maxRestart) {
          delete this.engine.restartWorkersCount[this.id];
          this.engine.destroy('error', error.message, errorLogItem);
          return;
        }
        this.reset();
        const triggerBlock = this.engine.blocks[this.engine.triggerBlockId as string];
        if (triggerBlock) this.executeBlock(triggerBlock, execParam);
        this.engine.restartWorkersCount[this.id] = restartCount + 1;
      } else {
        this.engine.destroy('error', error.message, errorLogItem);
      }
    }
  }
  reset() {
    this.loopList = {};
    this.repeatedTasks = {};
    this.windowId = null;
    this.currentBlock = null;
    this.childWorkflowId = null;
    this.engine.history = [];
    this.engine.preloadScripts = [];
    this.engine.columns = {
      column: {
        index: 0,
        type: 'any',
        name: this.settings?.defaultColumnName || 'column',
      },
    };
    this.activeTab = {
      url: '',
      frameId: 0,
      frames: {},
      groupId: null,
      id: this.options?.tabId ?? null,
    };
    this.engine.referenceData = {
      table: [],
      loopData: {},
      workflow: {},
      googleSheets: {},
      variables: this.engine.options?.data?.variables || {},
      globalData: this.engine.referenceData.globalData,
      secrets: this.engine.referenceData.secrets || {},
    };
  }
  async _sendMessageToTab(
    payload: Record<string, unknown>,
    options: Record<string, unknown> = {},
    runBeforeLoad = false
  ) {
    try {
      if (!this.activeTab.id) {
        const error = new Error('no-tab') as Error & {
          workflowId?: string;
        };
        error.workflowId = this.id;
        throw error;
      }
      if (!runBeforeLoad) {
        await waitTabLoaded({
          tabId: this.activeTab.id,
          ms: this.settings?.tabLoadTimeout ?? 30000,
        });
      }
      const { executedBlockOnWeb, debugMode } = this.settings;
      const messagePayload = {
        isBlock: true,
        debugMode,
        executedBlockOnWeb,
        loopEls: this.loopEls,
        activeTabId: this.activeTab.id,
        frameSelector: this.frameSelector,
        ...payload,
      };
      const data = await BrowserAPIService.tabs.sendMessage(
        this.activeTab.id,
        messagePayload,
        { frameId: this.activeTab.frameId, ...options }
      );
      return data;
    } catch (rawError) {
      console.error(rawError);
      const error = rawError as Error;
      const noConnection = error.message?.includes('Could not establish connection');
      const channelClosed = error.message?.includes('message channel closed');
      if (noConnection || channelClosed) {
        const isScriptInjected = await BrowserAPIService.contentScript.inject({
          file: './contentScript.js',
          target: {
            tabId: this.activeTab.id,
            frameId: this.activeTab.frameId,
          },
          waitUntilInjected: true,
        });
        if (isScriptInjected) {
          const result = await this._sendMessageToTab(payload, options, runBeforeLoad);
          return result;
        }
        error.message = 'Could not establish connection to the active tab';
      } else if (error.message?.startsWith('No tab')) {
        error.message = 'active-tab-removed';
      }
      throw error;
    }
  }
}
export default WorkflowWorker;
