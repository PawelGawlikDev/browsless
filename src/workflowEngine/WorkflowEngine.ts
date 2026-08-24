import dbStorage from '@/db/storage';
import type {
  Workflow,
  WorkflowDataColumn,
  WorkflowEdge,
  WorkflowNode,
} from '@/types/models';
import type { SharedBlocksMap } from '@/types/shared-data';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import { getBlocks } from '@/utils/getSharedData';
import { clearCache, isObject, parseJSON, sleep } from '@/utils/helper';
import cloneDeep from 'lodash.clonedeep';
import { nanoid } from 'nanoid';
import WorkflowWorker from './WorkflowWorker';

let blocks = getBlocks() as SharedBlocksMap;
const workflowDb = dbStorage as any;

type WorkflowVariableMap = Record<string, unknown>;
type WorkflowTableRow = Record<string, unknown>;
type WorkflowReferenceSnapshotKey = 'loopData' | 'variables';

type WorkflowReferenceData = {
  variables: WorkflowVariableMap;
  table: WorkflowTableRow[];
  secrets: Record<string, unknown>;
  loopData: Record<string, unknown>;
  workflow: Record<
    string,
    { table?: WorkflowTableRow[]; variables?: WorkflowVariableMap }
  >;
  googleSheets: Record<string, unknown>;
  globalData: unknown;
};

type WorkflowColumnState = {
  index: number;
  type: string;
  name: string;
};

type WorkflowExecutionState = {
  status?: string;
  isDestroyed?: boolean;
  [key: string]: unknown;
};

type WorkflowStates = {
  on: (name: string, listener: (params: any) => void) => void;
  off: (name: string, listener: (params: any) => void) => void;
  add: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  get: (
    stateId?: string | ((state: WorkflowExecutionState) => boolean)
  ) => Promise<unknown>;
  update: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
  stop: (id: string) => Promise<unknown>;
};

type WorkflowLogger = {
  add: (payload: Record<string, unknown>) => Promise<unknown>;
};

type WorkflowEngineOptions = {
  parentWorkflow?: string | null;
  data?: {
    globalData?: string;
    variables?: Record<string, unknown>;
  };
  blockId?: string;
  checkParams?: boolean;
  tabId?: number | null;
};

type WorkflowBlock = WorkflowNode & {
  data: Record<string, any>;
};

type WorkflowConnection = {
  id: string;
  targetHandle?: string;
  sourceHandle?: string;
};

type WorkflowDebugEventListener = (params: unknown) => void;
type WorkflowEventListeners = Record<string, WorkflowDebugEventListener[]>;

class WorkflowEngine {
  id: string | null;
  state?: unknown;
  childWorkflowId?: string | null;
  states: WorkflowStates;
  logger: WorkflowLogger;
  workflow: Workflow;
  isPopup: boolean;
  blocksHandler: Record<string, any>;
  isTestingMode: boolean;
  parentWorkflow?: string | null;
  saveLog: boolean;
  workerId: number;
  workers: Map<string, WorkflowWorker>;
  packagesCache: Record<string, unknown>;
  extractedGroup: Record<string, unknown>;
  connectionsMap: Record<string, Map<string, WorkflowConnection>>;
  waitConnections: Record<string, unknown>;
  isDestroyed: boolean;
  isUsingProxy: boolean;
  isInBreakpoint: boolean;
  triggerBlockId: string | null;
  blocks: Record<string, WorkflowBlock>;
  history: Array<Record<string, any>>;
  columnsId: Record<string, string>;
  historyCtxData: Record<string, unknown>;
  eventListeners: WorkflowEventListeners;
  preloadScripts: unknown[];
  columns: Record<string, WorkflowColumnState>;
  rowData: Record<string, unknown>;
  logsLimit: number;
  logHistoryId: number;
  options?: WorkflowEngineOptions;
  refDataSnapshots: Record<string, unknown>;
  refDataSnapshotsKeys: Record<
    WorkflowReferenceSnapshotKey,
    { index: number; key: string }
  >;
  referenceData: WorkflowReferenceData;
  startedTimestamp?: number;
  restartWorkersCount: Record<string, number>;
  onDebugEvent: (
    source: { tabId?: number | null },
    method: string,
    params: unknown
  ) => void;
  onWorkflowStopped: (id: string) => void;
  onResumeExecution: (params: { id: string; nextBlock: unknown }) => void;

  constructor(
    workflow: Workflow,
    {
      states,
      logger,
      blocksHandler,
      isPopup,
      options,
    }: {
      states: WorkflowStates;
      logger: WorkflowLogger;
      blocksHandler: Record<string, any>;
      isPopup?: boolean;
      options?: WorkflowEngineOptions;
    }
  ) {
    this.id = nanoid();
    this.states = states;
    this.logger = logger;
    this.workflow = workflow;
    this.isPopup = isPopup ?? true;
    this.blocksHandler = blocksHandler;
    this.isTestingMode = Boolean(workflow.testingMode);
    this.parentWorkflow = options?.parentWorkflow;
    this.saveLog = workflow.settings?.saveLog ?? true;

    this.workerId = 0;
    this.workers = new Map();

    this.packagesCache = {};
    this.extractedGroup = {};
    this.connectionsMap = {};
    this.waitConnections = {};
    this.restartWorkersCount = {};

    this.isDestroyed = false;
    this.isUsingProxy = false;
    this.isInBreakpoint = false;

    this.triggerBlockId = null;

    this.blocks = {};
    this.history = [];
    this.columnsId = {};
    this.historyCtxData = {};
    this.eventListeners = {};
    this.preloadScripts = [];

    this.columns = {
      column: {
        index: 0,
        type: 'any',
        name: this.workflow.settings?.defaultColumnName || 'column',
      },
    };
    this.rowData = {};

    this.logsLimit = 1001;
    this.logHistoryId = 0;

    let variables: WorkflowVariableMap = {};
    let { globalData } = workflow;
    if (options?.data) {
      globalData = options.data.globalData || globalData;
      variables = isObject(options.data.variables) ? options.data.variables : {};

      options.data = { globalData, variables };
    }
    this.options = options;

    this.refDataSnapshots = {};
    this.refDataSnapshotsKeys = {
      loopData: {
        index: 0,
        key: '##loopData0',
      },
      variables: {
        index: 0,
        key: '##variables0',
      },
    };
    this.referenceData = {
      variables,
      table: [],
      secrets: {},
      loopData: {},
      workflow: {},
      googleSheets: {},
      globalData: parseJSON(globalData, globalData),
    };

    this.onDebugEvent = ({ tabId }, method, params) => {
      let isActiveTabEvent = false;
      this.workers.forEach((worker) => {
        if (isActiveTabEvent) return;

        isActiveTabEvent = worker.activeTab.id === tabId;
      });

      if (!isActiveTabEvent) return;

      (this.eventListeners[method] || []).forEach((listener) => {
        listener(params);
      });
    };
    this.onWorkflowStopped = (id) => {
      if (this.id !== id || this.isDestroyed) return;
      this.stop();
    };
    this.onResumeExecution = ({ id, nextBlock }) => {
      if (this.id !== id || this.isDestroyed) return;

      this.workers.forEach((worker) => {
        worker.resume(nextBlock);
      });
    };
  }

  async init() {
    try {
      if (this.workflow.isDisabled) return;

      if (!this.states) {
        console.error(`"${this.workflow.name}" workflow doesn't have states`);
        this.destroy('error');
        return;
      }

      const { nodes, edges } = this.workflow.drawflow;
      if (!nodes || nodes.length === 0) {
        console.error(`${this.workflow.name} doesn't have blocks`);
        return;
      }

      const triggerBlock = (nodes as WorkflowBlock[]).find((node) => {
        if (this.options?.blockId) return node.id === this.options.blockId;

        return node.label === 'trigger';
      });
      if (!triggerBlock) {
        console.error(`${this.workflow.name} doesn't have a trigger block`);
        return;
      }

      if (!this.workflow.settings) {
        this.workflow.settings = {} as Workflow['settings'];
      }

      blocks = getBlocks() as SharedBlocksMap;

      const checkParams = this.options?.checkParams ?? true;
      const hasParams =
        checkParams &&
        ((triggerBlock.data?.parameters as unknown[] | undefined)?.length || 0) > 0;
      if (hasParams) {
        this.eventListeners = {};

        if (triggerBlock.data.preferParamsInTab) {
          const [activeTab] = (await BrowserAPIService.tabs.query({
            active: true,
            url: '*://*/*',
            lastFocusedWindow: true,
          })) as Array<{ id: number; url?: string }>;
          if (activeTab) {
            const result = await BrowserAPIService.tabs.sendMessage(activeTab.id, {
              type: 'input-workflow-params',
              data: {
                workflow: this.workflow,
                params: triggerBlock.data.parameters,
              },
            });

            if (result) return;
          }
        }

        const paramUrl = BrowserAPIService.runtime.getURL('/params.html');
        const tabs = (await BrowserAPIService.tabs.query({})) as Array<{
          id: number;
          url?: string;
          windowId: number;
        }>;
        const paramTab = tabs.find((tab) => tab.url?.includes(paramUrl));

        if (paramTab) {
          await BrowserAPIService.tabs.sendMessage(paramTab.id, {
            name: 'workflow:params',
            data: this.workflow,
          });
          await BrowserAPIService.windows.update(paramTab.windowId, {
            focused: true,
          });
        } else {
          BrowserAPIService.windows.create({
            type: 'popup',
            width: 480,
            height: 700,
            url: BrowserAPIService.runtime.getURL(
              `/params.html?workflowId=${this.workflow.id}`
            ),
          });
        }
        return;
      }

      this.triggerBlockId = triggerBlock.id;

      this.blocks = (nodes as WorkflowBlock[]).reduce<Record<string, WorkflowBlock>>(
        (acc, node) => {
          acc[node.id] = node;

          return acc;
        },
        {}
      );
      this.connectionsMap = (edges as WorkflowEdge[]).reduce<
        Record<string, Map<string, WorkflowConnection>>
      >((acc, { sourceHandle, target, targetHandle }) => {
        if (!sourceHandle) return acc;

        if (!acc[sourceHandle]) acc[sourceHandle] = new Map();
        acc[sourceHandle].set(target, {
          id: target,
          targetHandle: typeof targetHandle === 'string' ? targetHandle : undefined,
          sourceHandle,
        });

        return acc;
      }, {});

      const workflowTable = this.workflow.table || this.workflow.dataColumns || [];
      let columns = Array.isArray(workflowTable)
        ? workflowTable
        : (Object.values(workflowTable) as WorkflowDataColumn[]);

      if (this.workflow.connectedTable) {
        const connectedTable = await workflowDb.tablesItems
          .where('id')
          .equals(this.workflow.connectedTable)
          .first();
        const connectedTableData = await workflowDb.tablesData
          .where('tableId')
          .equals(connectedTable?.id)
          .first();
        if (connectedTable && connectedTableData) {
          columns = Object.values(connectedTable.columns) as WorkflowDataColumn[];
          Object.assign(
            this.columns,
            (connectedTableData.columnsIndex as Record<string, WorkflowColumnState>) || {}
          );
          this.referenceData.table =
            (connectedTableData.items as WorkflowReferenceData['table']) || [];
        } else {
          this.workflow.connectedTable = null;
        }
      }

      columns.forEach(({ name, type, id }) => {
        const columnId = id || name;

        this.rowData[name] = null;

        this.columnsId[name] = columnId;
        if (!this.columns[columnId]) this.columns[columnId] = { index: 0, name, type };
      });

      if (this.workflow.settings.debugMode) {
        BrowserAPIService.debugger.onEvent.addListener(this.onDebugEvent);
      }
      if (this.workflow.settings.reuseLastState && !this.workflow.connectedTable) {
        const lastStateKey = `state:${this.workflow.id}`;
        const value = (await BrowserAPIService.storage.local.get(lastStateKey)) as Record<
          string,
          {
            columns?: Record<string, WorkflowColumnState>;
            referenceData?: Partial<WorkflowReferenceData>;
          }
        >;
        const lastState = value[lastStateKey];

        if (lastState) {
          Object.assign(this.columns, lastState.columns);
          Object.assign(this.referenceData, lastState.referenceData);
        }
      }

      const { settings: userSettings = {} } =
        ((await BrowserAPIService.storage.local.get('settings')) as {
          settings?: { logsLimit?: number };
        }) || {};
      this.logsLimit = userSettings?.logsLimit || 1001;

      this.workflow.table = columns;
      this.startedTimestamp = Date.now();

      this.states.on('stop', this.onWorkflowStopped);
      this.states.on('resume', this.onResumeExecution);

      const credentials = (await workflowDb.credentials.toArray()) as Array<{
        name: string;
        value: unknown;
      }>;
      credentials.forEach(({ name, value }) => {
        this.referenceData.secrets[name] = value;
      });

      const variables = (await workflowDb.variables.toArray()) as Array<{
        name: string;
        value: unknown;
      }>;
      variables.forEach(({ name, value }) => {
        this.referenceData.variables[`$$${name}`] = value;
      });

      this.addRefDataSnapshot('variables');

      await this.states.add(this.id, {
        id: this.id,
        status: 'running',
        state: this.state,
        workflowId: this.workflow.id,
        parentState: this.parentWorkflow,
      });
      this.addWorker({ blockId: triggerBlock.id });
    } catch (error) {
      console.error('WorkflowEngine init error:', error);
    }
  }

  addRefDataSnapshot(key: WorkflowReferenceSnapshotKey) {
    this.refDataSnapshotsKeys[key].index += 1;
    this.refDataSnapshotsKeys[key].key = key;

    const keyName = this.refDataSnapshotsKeys[key].key;
    this.refDataSnapshots[keyName] = cloneDeep(this.referenceData[key]);
  }

  addWorker(detail: {
    blockId: string;
    execParam?: Record<string, unknown>;
    state?: Record<string, unknown>;
  }) {
    this.workerId += 1;

    const workerId = `worker-${this.workerId}`;
    const worker = new WorkflowWorker(workerId, this, { blocksDetail: blocks });
    worker.init(detail);

    this.workers.set(worker.id, worker);
  }

  addLogHistory(detail: Record<string, any>) {
    if (detail.name === 'blocks-group') return;

    const isLimit = this.history.length >= this.logsLimit;
    const notErrorLog = detail.type !== 'error';

    if ((isLimit || !this.saveLog) && notErrorLog) return;

    this.logHistoryId += 1;
    detail.id = this.logHistoryId;

    if (
      detail.name !== 'delay' ||
      detail.replacedValue ||
      detail.name === 'javascript-code' ||
      (blocks[detail.name]?.refDataKeys && this.saveLog)
    ) {
      const { variables, loopData } = this.refDataSnapshotsKeys;

      this.historyCtxData[this.logHistoryId] = {
        referenceData: {
          loopData: loopData.key,
          variables: variables.key,
          activeTabUrl: detail.activeTabUrl,
          prevBlockData: detail.prevBlockData || '',
        },
        replacedValue: cloneDeep(detail.replacedValue),
        ...(detail.ctxData || {}),
      };

      delete detail.replacedValue;
    }

    this.history.push(detail);
  }

  async stop() {
    try {
      if (this.childWorkflowId) {
        await this.states.stop(this.childWorkflowId);
      }

      await this.destroy('stopped');
    } catch (error) {
      console.error(error);
    }
  }

  async executeQueue() {
    const { workflowQueue } = ((await BrowserAPIService.storage.local.get(
      'workflowQueue'
    )) as {
      workflowQueue?: string[];
    }) || { workflowQueue: [] };
    const queueIndex = (workflowQueue || []).indexOf(this.workflow?.id);

    if (!workflowQueue || queueIndex === -1) return;

    const engine = new WorkflowEngine(this.workflow, {
      logger: this.logger,
      states: this.states,
      blocksHandler: this.blocksHandler,
    });
    engine.init();

    workflowQueue.splice(queueIndex, 1);

    await BrowserAPIService.storage.localSet({ workflowQueue });
  }

  async destroyWorker(workerId: string) {
    if (this.workers.size === 1 && this.workers.has(workerId)) {
      this.addLogHistory({
        type: 'finish',
        name: 'finish',
      });
      this.dispatchEvent('finish');
      await this.destroy('success');
    }

    this.workers.delete(workerId);

    if (this.workers.size === 0) {
      this.destroy('success');
    }
  }

  async destroy(status: string, message?: string, blockDetail?: Record<string, unknown>) {
    const cleanUp = () => {
      this.id = null;
      this.states = null as unknown as WorkflowStates;
      this.logger = null as unknown as WorkflowLogger;
      this.saveLog = null as unknown as boolean;
      this.workflow = null as unknown as Workflow;
      this.blocksHandler = null as unknown as Record<string, any>;
      this.parentWorkflow = null;

      this.isDestroyed = true;
      this.referenceData = null as unknown as WorkflowReferenceData;
      this.eventListeners = null as unknown as WorkflowEventListeners;
      this.packagesCache = null as unknown as Record<string, unknown>;
      this.extractedGroup = null as unknown as Record<string, unknown>;
      this.connectionsMap = null as unknown as Record<
        string,
        Map<string, WorkflowConnection>
      >;
      this.waitConnections = null as unknown as Record<string, unknown>;
      this.blocks = null as unknown as Record<string, WorkflowBlock>;
      this.history = null as unknown as Array<Record<string, any>>;
      this.columnsId = null as unknown as Record<string, string>;
      this.historyCtxData = null as unknown as Record<string, unknown>;
      this.preloadScripts = null as unknown as unknown[];
    };

    try {
      if (this.isDestroyed) return;
      if (this.isUsingProxy) BrowserAPIService.proxy.clearSettings({});
      if (this.workflow.settings.debugMode) {
        BrowserAPIService.debugger.onEvent.removeListener(this.onDebugEvent);

        await sleep(1000);

        this.workers.forEach((worker) => {
          if (!worker.debugAttached || !worker.activeTab.id) return;

          BrowserAPIService.debugger.detach({ tabId: worker.activeTab.id });
        });
      }

      const endedTimestamp = Date.now();
      this.workers.clear();
      this.executeQueue();

      this.states.off('stop', this.onWorkflowStopped);
      await this.states.delete(this.id);

      this.dispatchEvent('destroyed', {
        status,
        message,
        blockDetail,
        id: this.id,
        endedTimestamp,
        history: this.history,
        startedTimestamp: this.startedTimestamp,
      });

      if (this.workflow.settings.reuseLastState) {
        const workflowState = {
          [`state:${this.workflow.id}`]: {
            columns: this.columns,
            referenceData: {
              table: this.referenceData.table,
              variables: this.referenceData.variables,
            },
          },
        };

        BrowserAPIService.storage.localSet(workflowState);
      } else if (status === 'success') {
        clearCache(this.workflow);
      }

      const { table, variables } = this.referenceData;
      const tableId = this.workflow.connectedTable;

      Object.values(this.referenceData.workflow).forEach((data) => {
        Object.assign(table, data.table);
        Object.assign(variables, data.variables);
      });

      await workflowDb.transaction(
        'rw',
        workflowDb.tablesItems,
        workflowDb.tablesData,
        async () => {
          if (!tableId) return;

          await workflowDb.tablesItems.update(tableId, {
            modifiedAt: Date.now(),
            rowsCount: table.length,
          });
          await workflowDb.tablesData.where('tableId').equals(tableId).modify({
            items: table,
            columnsIndex: this.columns,
          });
        }
      );

      if (!this.workflow?.isTesting) {
        const { name, id } = this.workflow;

        await this.logger.add({
          detail: {
            name,
            status,
            message,
            id: this.id,
            workflowId: id,
            saveLog: this.saveLog,
            endedAt: endedTimestamp,
            parentLog: this.parentWorkflow,
            startedAt: this.startedTimestamp,
          },
          history: {
            logId: this.id,
            data: this.saveLog ? this.history : [],
          },
          ctxData: {
            logId: this.id,
            data: {
              ctxData: this.historyCtxData,
              dataSnapshot: this.refDataSnapshots,
            },
          },
          data: {
            logId: this.id,
            data: {
              table: [...this.referenceData.table],
              variables: { ...this.referenceData.variables },
            },
          },
        });
      }

      cleanUp();
    } catch {
      cleanUp();
    }
  }

  async updateState(data: Record<string, unknown>) {
    const state = {
      ...data,
      tabIds: [] as Array<number | null>,
      currentBlock: [] as Array<{ id: string; name: string; startedAt?: number }>,
      name: this.workflow.name,
      logs: this.history,
      ctxData: {
        ctxData: this.historyCtxData,
        dataSnapshot: this.refDataSnapshots,
      },
      startedTimestamp: this.startedTimestamp,
    };

    this.workers.forEach((worker) => {
      const { id, label, startedAt } = worker.currentBlock || {};
      if (!id || !label) return;

      state.currentBlock.push({ id, name: label, startedAt });
      state.tabIds.push(worker.activeTab.id);
    });

    await this.states.update(this.id, { state });
    this.dispatchEvent('update', { state });
  }

  dispatchEvent(name: string, params?: unknown) {
    const listeners = this.eventListeners[name];

    if (!listeners) return;

    listeners.forEach((callback) => {
      callback(params);
    });
  }

  on(name: string, listener: WorkflowDebugEventListener) {
    (this.eventListeners[name] = this.eventListeners[name] || []).push(listener);
  }
}

export default WorkflowEngine;
