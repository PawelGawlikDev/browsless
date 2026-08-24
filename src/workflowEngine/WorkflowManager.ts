import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import type { Workflow, WorkflowNode } from '@/types/models';
import convertWorkflowData from '@/utils/convertWorkflowData';
import getBlockMessage from '@/utils/getBlockMessage';
import blocksHandler from './blocksHandler';
import WorkflowEngine from './WorkflowEngine';
import WorkflowEvent from './workflowEvent';
import WorkflowLogger from './WorkflowLogger';
import WorkflowState from './WorkflowState';

const workflowStateStorage = {
  get() {
    return BrowserAPIService.storage.local
      .get('workflowStates')
      .then(({ workflowStates }) => workflowStates || []);
  },
  set(key, value) {
    const states = Object.values(value);

    return BrowserAPIService.storage.local.set({ workflowStates: states });
  },
};

class WorkflowManager {
  static #_instance;

  static get instance() {
    if (!this.#_instance) this.#_instance = new WorkflowManager();

    return this.#_instance;
  }

  #state;
  #logger;

  constructor() {
    this.#logger = new WorkflowLogger();
    this.#state = new WorkflowState({ storage: workflowStateStorage });
  }

  execute(workflowData: Workflow, options?: Record<string, unknown>) {
    if (workflowData.testingMode) {
      for (const value of this.#state.states.values()) {
        if (value.workflowId === workflowData.id) return null;
      }
    }

    const convertedWorkflow = convertWorkflowData(workflowData);
    const engine = new WorkflowEngine(convertedWorkflow, {
      isPopup: true,
      options,
      states: this.#state,
      logger: this.#logger,
      blocksHandler: blocksHandler(),
    });

    engine.init();
    engine.on(
      'destroyed',
      ({ id, status, history, blockDetail, ...rest }: Record<string, any>) => {
        if (status !== 'stopped') {
          BrowserAPIService.permissions
            .contains({ permissions: ['notifications'] })
            .then((hasPermission) => {
              if (!hasPermission || !workflowData.settings.notification) return;

              const name = workflowData.name.slice(0, 32);

              BrowserAPIService.notifications.create(`logs:${id}`, {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icon-128.png'),
                title: status === 'success' ? 'Success' : 'Error',
                message: `${
                  status === 'success' ? 'Successfully' : 'Failed'
                } ran the "${name}" workflow`,
              });
            });
        }

        if (convertedWorkflow.settings?.events) {
          const workflowHistory = history.map((item) => {
            delete item.logId;
            delete item.prevBlockData;
            delete item.workerId;

            item.description = item.description || '';

            return item;
          });
          const workflowRefData = {
            status,
            startedAt: rest.startedTimestamp,
            endedAt: rest.endedTimestamp
              ? rest.endedTimestamp - rest.startedTimestamp
              : null,
            logs: workflowHistory,
            errorMessage: status === 'error' ? getBlockMessage(blockDetail) : null,
          };

          (convertedWorkflow.settings.events as Array<Record<string, any>>).forEach(
            (event: Record<string, any>) => {
              if (status === 'success' && !event.events.includes('finish:success'))
                return;
              if (status === 'error' && !event.events.includes('finish:failed')) return;

              WorkflowEvent.handle(event.action, {
                workflow: workflowRefData,
                variables: {
                  ...(engine as WorkflowEngine & { referenceData: any }).referenceData
                    .variables,
                },
                globalData: {
                  ...(engine as WorkflowEngine & { referenceData: any }).referenceData
                    .globalData,
                },
              });
            }
          );
        }
      }
    );

    return engine;
  }

  /**
   * Stop workflow execution
   * @param {string} stateId
   * @returns {Promise<void>}
   */
  stopExecution(stateId: string) {
    return this.#state.stop(stateId);
  }

  /**
   * Resume workflow execution
   * @param {string} id
   * @param {object} nextBlock
   * @returns {Promise<void>}
   */
  resumeExecution(id: string, nextBlock: WorkflowNode | Record<string, unknown>) {
    return this.#state.resume(id, nextBlock);
  }

  /**
   * Resume workflow execution
   * @param {string} id
   * @param {object} stateData
   * @returns {Promise<void>}
   */
  updateExecution(id: string, stateData: Record<string, unknown>) {
    return this.#state.update(id, stateData);
  }
}

export default WorkflowManager;
