import { isWhitespace, parseJSON } from '@/utils/helper';
import decryptFlow, { getWorkflowPass } from '@/utils/decryptFlow';
import convertWorkflowData from '@/utils/convertWorkflowData';
import { nanoid } from 'nanoid';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import WorkflowEngine from '../WorkflowEngine';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerOptions,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
import type { Workflow } from '@/types/models';
type ExecuteWorkflowBlockData = {
  workflowId: string;
  executeId?: string;
  insertAllGlobalData?: boolean;
  globalData?: string;
  insertAllVars?: boolean;
  insertVars?: string;
};
type WorkflowEngineCtorOptions = ConstructorParameters<typeof WorkflowEngine>[1] & {
  events?: {
    onInit: (engine: { id: string }) => void;
    onDestroyed: (engine: { id: string; referenceData: Record<string, unknown> }) => void;
  };
};
const workflowListener = (workflow: Workflow, options: WorkflowEngineCtorOptions) => {
  return new Promise<{
    id?: string;
    status?: string;
    message?: string;
  }>((resolve, reject) => {
    if (workflow.isProtected) {
      const flow = parseJSON<unknown>(workflow.drawflow as unknown as string, null);
      if (!flow) {
        const pass = getWorkflowPass(workflow.pass as string);
        workflow.drawflow = decryptFlow(workflow as never, pass);
      }
    }
    const engine = new WorkflowEngine(workflow, options);
    engine.init();
    engine.on(
      'destroyed',
      ({ id, status, message }: { id?: string; status?: string; message?: string }) => {
        options.events?.onDestroyed(engine as never);
        if (status === 'error') {
          const error = Object.assign(new Error(message), {
            data: { logId: id },
          });
          reject(error);
          return;
        }
        resolve({ id, status, message });
      }
    );
    options.events?.onInit(engine);
  });
};
const findWorkflow = (
  workflows: unknown,
  workflowId: string
): Record<string, unknown> | undefined => {
  const workflow = Array.isArray(workflows)
    ? (
        workflows as Array<
          {
            id: string;
          } & Record<string, unknown>
        >
      ).find(({ id }) => id === workflowId)
    : (workflows as Record<string, Record<string, unknown>>)?.[workflowId];
  return workflow;
};
async function executeWorkflow(
  this: WorkflowHandlerContext,
  { id: blockId, data }: WorkflowHandlerBlock<ExecuteWorkflowBlockData>,
  { refData }: WorkflowHandlerOptions
) {
  if (data.workflowId === '') throw new Error('empty-workflow');
  const { workflows } = await BrowserAPIService.storage.local.get(['workflows']);
  let workflow = findWorkflow(workflows, data.workflowId);
  if (!workflow) {
    const errorInstance = Object.assign(new Error('no-workflow'), {
      data: { workflowId: data.workflowId },
    });
    throw errorInstance;
  }
  workflow = convertWorkflowData(
    workflow as Parameters<typeof convertWorkflowData>[0]
  ) as typeof workflow;
  const optionsParams: Record<string, unknown> = { variables: {} };
  if ((workflow as Record<string, unknown>).testingMode)
    (workflow as Record<string, unknown>).testingMode = false;
  if (data.insertAllGlobalData) {
    optionsParams.globalData = refData.globalData;
  }
  if (!isWhitespace(data.globalData ?? '')) {
    // shallow copy
    optionsParams.globalData = {
      ...(optionsParams.globalData as Record<string, unknown> | undefined),
      ...JSON.parse(data.globalData as string),
    };
  }
  if (data.insertAllVars) {
    optionsParams.variables = JSON.parse(
      JSON.stringify(this.engine.referenceData.variables)
    );
  } else if (data.insertVars) {
    const varsName = data.insertVars.split(',');
    varsName.forEach((name) => {
      const varName = name.trim();
      const value = this.engine.referenceData.variables[varName];
      if (!value && typeof value !== 'boolean') return;
      (optionsParams.variables as Record<string, unknown>)[varName] = value;
    });
  }
  const options = {
    options: {
      data: optionsParams,
      parentWorkflow: {
        id: this.engine.id,
        name: this.engine.workflow?.name,
      },
    },
    events: {
      onInit: (engine: { id: string }) => {
        this.childWorkflowId = engine.id;
      },
      onDestroyed: (engine: {
        id: string;
        referenceData: {
          variables: unknown;
          table: unknown;
        };
      }) => {
        const { variables, table } = engine.referenceData;
        (this.engine.referenceData.workflow as Record<string, unknown>)[
          data.executeId || `${engine.id}-${nanoid(8)}`
        ] = {
          table,
          variables,
        };
      },
    },
    states: this.engine.states,
    logger: this.engine.logger,
    blocksHandler: this.engine.blocksHandler,
  };
  const drawflowNodes = ((
    workflow.drawflow as {
      nodes?: Array<{
        label: string;
        data?: Record<string, unknown>;
      }>;
    }
  )?.nodes ?? []) as Array<{
    label: string;
    data?: Record<string, unknown>;
  }>;
  const isWorkflowIncluded = drawflowNodes.some(
    (node) =>
      node.label === 'execute-workflow' &&
      node.data?.workflowId ===
        (
          this.engine.workflow as
            | {
                id?: string;
              }
            | undefined
        )?.id
  );
  if (isWorkflowIncluded) {
    throw new Error('workflow-infinite-loop');
  }
  const result = await workflowListener(
    workflow as Workflow,
    options as unknown as WorkflowEngineCtorOptions
  );
  return {
    data: '',
    logId: result.id,
    nextBlockId: this.getBlockConnections(blockId),
  };
}
export default executeWorkflow;
