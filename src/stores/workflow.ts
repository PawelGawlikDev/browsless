import { extensionStorage } from '@/lib/extensionStorage';
import type {
  DeepPartial,
  Workflow,
  WorkflowMap,
  WorkflowNode,
  WorkflowSettings,
  WorkflowStateEntry,
} from '@/types/models';
import firstWorkflows from '@/utils/firstWorkflows';
import { tasks } from '@/utils/shared';
import { cleanWorkflowTriggers, registerWorkflowTrigger } from '@/utils/workflowTrigger';
import dayjs from 'dayjs';
import defu from 'defu';
import deepmerge from 'lodash.merge';
import { nanoid } from 'nanoid';
import { defineStore } from 'pinia';
import { getExtensionManifest } from '@/utils/extensionManifest';
const STARTER_WORKFLOWS_VERSION = 2;
const legacyStarterWorkflowNames = new Set([
  'Twitter Trends to Google Sheets',
  'Google search',
  'Generate lorem ipsum',
  'Search in ProductHunt',
  'Google Keyword Research',
]);
const createDefaultWorkflowSettings = (): WorkflowSettings => {
  return {
    publicId: '',
    aipowerToken: '',
    blockDelay: 0,
    saveLog: true,
    debugMode: false,
    restartTimes: 3,
    notification: true,
    execContext: 'popup',
    reuseLastState: false,
    inputAutocomplete: true,
    onError: 'stop-workflow',
    executedBlockOnWeb: false,
    insertDefaultColumn: false,
    defaultColumnName: 'column',
  };
};
const defaultWorkflow = (
  data: DeepPartial<Workflow> | null = null,
  options: {
    duplicateId?: boolean;
  } = {}
): Workflow => {
  let workflowData: Workflow = {
    id: nanoid(),
    name: '',
    icon: 'riGlobalLine',
    folderId: null,
    content: null,
    connectedTable: null,
    drawflow: {
      edges: [],
      zoom: 1.3,
      nodes: [
        {
          position: {
            x: 100,
            y: window.innerHeight / 2,
          },
          id: nanoid(),
          label: 'trigger',
          data: tasks.trigger.data as Record<string, unknown>,
          type: tasks.trigger.component as string,
        },
      ],
    },
    table: [],
    dataColumns: [],
    description: '',
    trigger: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDisabled: false,
    settings: createDefaultWorkflowSettings(),
    version: getExtensionManifest().version,
    globalData: '{\n\t"key": "value"\n}',
  };
  if (data) {
    if (options.duplicateId && data.id) {
      delete workflowData.id;
    }
    if (data.drawflow?.nodes?.length) {
      workflowData.drawflow.nodes = [];
    }
    workflowData = defu(data, workflowData) as Workflow;
  }
  return workflowData;
};
const cloneStarterWorkflows = (): Workflow[] => {
  return (firstWorkflows as DeepPartial<Workflow>[]).map((workflow) =>
    defaultWorkflow(workflow)
  );
};
const shouldMigrateLegacyStarterWorkflows = (
  workflows: Workflow[] | WorkflowMap
): boolean => {
  const items = Array.isArray(workflows) ? workflows : Object.values(workflows || {});
  return (
    items.length === legacyStarterWorkflowNames.size &&
    items.every((workflow) => legacyStarterWorkflowNames.has(workflow.name))
  );
};
const convertWorkflowsToObject = (workflows: Workflow[] | WorkflowMap): WorkflowMap => {
  if (Array.isArray(workflows)) {
    return workflows.reduce<WorkflowMap>((acc, workflow) => {
      acc[workflow.id] = workflow;
      return acc;
    }, {});
  }
  return workflows;
};
type WorkflowMatcher = string | ((workflow: Workflow) => boolean);
export const useWorkflowStore = defineStore('workflow', {
  storageMap: {
    workflows: 'workflows',
  },
  state: () => ({
    states: [] as WorkflowStateEntry[],
    workflows: {} as WorkflowMap,
    popupStates: [] as WorkflowStateEntry[],
    retrieved: false,
    isFirstTime: false,
  }),
  getters: {
    getAllStates: (state) => [...state.popupStates, ...state.states],
    getById: (state) => (id: string) => state.workflows[id],
    getWorkflows: (state) => Object.values(state.workflows),
    getWorkflowStates: (state) => (id: string) =>
      [...state.states, ...state.popupStates].filter(
        ({ workflowId }) => workflowId === id
      ),
  },
  actions: {
    async loadData() {
      const { workflows, isFirstTime, starterWorkflowsVersion } =
        await extensionStorage.local.get([
          'workflows',
          'isFirstTime',
          'starterWorkflowsVersion',
        ]);
      let localWorkflows =
        (workflows as WorkflowMap | Workflow[] | null | undefined) || {};
      if (isFirstTime) {
        localWorkflows = cloneStarterWorkflows();
        await extensionStorage.local.set({
          isFirstTime: false,
          workflows: localWorkflows,
          starterWorkflowsVersion: STARTER_WORKFLOWS_VERSION,
        });
      } else if (
        starterWorkflowsVersion !== STARTER_WORKFLOWS_VERSION &&
        shouldMigrateLegacyStarterWorkflows(localWorkflows)
      ) {
        localWorkflows = cloneStarterWorkflows();
        await extensionStorage.local.set({
          workflows: localWorkflows,
          starterWorkflowsVersion: STARTER_WORKFLOWS_VERSION,
        });
      }
      this.isFirstTime = Boolean(isFirstTime);
      this.workflows = convertWorkflowsToObject(localWorkflows);
      this.retrieved = true;
    },
    updateStates(newStates: WorkflowStateEntry[]) {
      this.states = newStates;
    },
    async insert(
      data: DeepPartial<Workflow> | DeepPartial<Workflow>[] = {},
      options: {
        duplicateId?: boolean;
      } = {}
    ) {
      const insertedWorkflows: WorkflowMap = {};
      if (Array.isArray(data)) {
        data.forEach((item) => {
          if (!options.duplicateId) {
            delete item.id;
          }
          const workflow = defaultWorkflow(item, options);
          this.workflows[workflow.id] = workflow;
          insertedWorkflows[workflow.id] = workflow;
        });
      } else {
        if (!options.duplicateId) {
          delete data.id;
        }
        const workflow = defaultWorkflow(data, options);
        this.workflows[workflow.id] = workflow;
        insertedWorkflows[workflow.id] = workflow;
      }
      await this.saveToStorage('workflows');
      return insertedWorkflows;
    },
    async update({
      id,
      data = {},
      deep = false,
    }: {
      id: WorkflowMatcher;
      data?: Partial<Workflow>;
      deep?: boolean;
    }) {
      const isFunction = typeof id === 'function';
      if (!isFunction && !this.workflows[id]) return null;
      const updatedWorkflows: WorkflowMap = {};
      const updateData = { ...data, updatedAt: Date.now() } as Partial<Workflow>;
      const workflowUpdater = (workflowId: string) => {
        if (deep) {
          this.workflows[workflowId] = deepmerge(
            this.workflows[workflowId],
            updateData
          ) as Workflow;
        } else {
          Object.assign(this.workflows[workflowId], updateData);
        }
        this.workflows[workflowId].updatedAt = Date.now();
        updatedWorkflows[workflowId] = this.workflows[workflowId];
        if (!('isDisabled' in data)) return;
        if (data.isDisabled) {
          cleanWorkflowTriggers(workflowId, undefined);
        } else {
          const triggerBlock = this.workflows[workflowId].drawflow.nodes?.find(
            (node: WorkflowNode) => node.label === 'trigger'
          );
          if (triggerBlock) {
            registerWorkflowTrigger(workflowId, triggerBlock);
          }
        }
      };
      if (isFunction) {
        this.getWorkflows.forEach((workflow) => {
          const isMatch = id(workflow) ?? false;
          if (isMatch) workflowUpdater(workflow.id);
        });
      } else {
        workflowUpdater(id);
      }
      await this.saveToStorage('workflows');
      return updatedWorkflows;
    },
    async insertOrUpdate(
      data: DeepPartial<Workflow>[] = [],
      { checkUpdateDate = false, duplicateId = false } = {}
    ) {
      const insertedData: WorkflowMap = {};
      data.forEach((item) => {
        if (!item.id) return;
        const currentWorkflow = this.workflows[item.id];
        if (currentWorkflow) {
          let insert = true;
          if (checkUpdateDate && currentWorkflow.createdAt && item.updatedAt) {
            insert = dayjs(currentWorkflow.updatedAt).isBefore(item.updatedAt);
          }
          if (insert) {
            const mergedData = deepmerge(this.workflows[item.id], item) as Workflow;
            this.workflows[item.id] = mergedData;
            insertedData[item.id] = mergedData;
          }
        } else {
          const workflow = defaultWorkflow(item, { duplicateId });
          this.workflows[workflow.id] = workflow;
          insertedData[workflow.id] = workflow;
        }
      });
      await this.saveToStorage('workflows');
      return insertedData;
    },
    async delete(id: string | string[]) {
      const ids = Array.isArray(id) ? id : [id];
      ids.forEach((workflowId) => {
        delete this.workflows[workflowId];
      });
      await Promise.all(
        ids.map((workflowId) => cleanWorkflowTriggers(workflowId, undefined))
      );
      await extensionStorage.local.remove(
        ids.flatMap((workflowId) => [`state:${workflowId}`, `draft:${workflowId}`])
      );
      await this.saveToStorage('workflows');
      const { pinnedWorkflows } = await extensionStorage.local.get('pinnedWorkflows');
      const pinned = (pinnedWorkflows as string[] | null | undefined) || [];
      const nextPinned = pinned.filter((workflowId) => !ids.includes(workflowId));
      if (nextPinned.length !== pinned.length) {
        await extensionStorage.local.set({ pinnedWorkflows: nextPinned });
      }
      return id;
    },
  },
});
