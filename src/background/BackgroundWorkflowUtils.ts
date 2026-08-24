import { extensionStorage } from '@/lib/extensionStorage';
import type { Workflow, WorkflowMap, WorkflowNode } from '@/types/models';
import BackgroundOffscreen from './BackgroundOffscreen';
type WorkflowLookup = Workflow[] | WorkflowMap | null | undefined;
const findWorkflowById = (
  workflows: WorkflowLookup,
  workflowId: string
): Workflow | null => {
  if (Array.isArray(workflows)) {
    return workflows.find((item): item is Workflow => item?.id === workflowId) ?? null;
  }
  if (workflows && typeof workflows === 'object') {
    return workflows[workflowId] ?? null;
  }
  return null;
};
class BackgroundWorkflowUtils {
  static #_instance: BackgroundWorkflowUtils | undefined;
  /**
   * BackgroundWorkflowUtils singleton
   * @type {BackgroundWorkflowUtils}
   */
  static get instance() {
    if (!this.#_instance) this.#_instance = new BackgroundWorkflowUtils();
    return this.#_instance;
  }
  static async getWorkflow(
    workflowId: string | null | undefined
  ): Promise<Workflow | null> {
    if (!workflowId) return null;
    const { workflows } = await extensionStorage.local.get(['workflows']);
    return findWorkflowById(workflows as WorkflowLookup, workflowId);
  }
  /**
   * Stop workflow execution
   * @param {string} stateId
   * @returns {Promise<void>}
   */
  async stopExecution(stateId: string): Promise<void> {
    await BackgroundOffscreen.instance.sendMessage('workflow:stop', stateId);
  }
  /**
   * Resume workflow execution
   * @param {string} stateId
   * @param {object} nextBlock
   * @returns {Promise<void>}
   */
  async resumeExecution(
    stateId: string,
    nextBlock: WorkflowNode | Record<string, unknown>
  ): Promise<void> {
    await BackgroundOffscreen.instance.sendMessage('workflow:resume', {
      id: stateId,
      nextBlock,
    });
  }
  /**
   * Update workflow execution state
   * @param {string} stateId
   * @param {object} data
   * @returns {Promise<void>}
   */
  async updateExecutionState(
    stateId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await BackgroundOffscreen.instance.sendMessage('workflow:update', {
      data,
      id: stateId,
    });
  }
  async executeWorkflow(
    workflowData: Record<string, unknown> & {
      isDisabled?: boolean;
    },
    options: Record<string, unknown> = {}
  ): Promise<void> {
    if (workflowData.isDisabled) return;
    await BackgroundOffscreen.instance.sendMessage('workflow:execute', {
      workflow: workflowData,
      options,
    });
  }
}
export default BackgroundWorkflowUtils;
