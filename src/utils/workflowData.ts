import { browser } from 'wxt/browser';
import { getExtensionManifest } from '@/utils/extensionManifest';
import { useWorkflowStore } from '@/stores/workflow';
import type { DeepPartial, DrawflowData, Workflow, WorkflowNode } from '@/types/models';
import type { TriggerBlockData } from '@/types/runtime';
import { registerWorkflowTrigger } from './workflowTrigger';
import { parseJSON, fileSaver, openFilePicker, findTriggerBlock } from './helper';
const contextMenuPermission = 'contextMenus';
const checkPermission = (permissions: string[]) =>
  browser.permissions.contains({
    permissions: permissions as chrome.runtime.ManifestPermission[],
  });
const requiredPermissions = {
  trigger: {
    name: contextMenuPermission,
    hasPermission({ data }: WorkflowNode) {
      const permissions: string[] = [];
      const triggerData = data as TriggerBlockData;
      if (triggerData.triggers) {
        triggerData.triggers.forEach((trigger) => {
          if (trigger.type !== 'context-menu') return;
          permissions.push(contextMenuPermission);
        });
      } else if (triggerData.type === 'context-menu') {
        permissions.push(contextMenuPermission);
      }
      return checkPermission(permissions);
    },
  },
  clipboard: {
    name: 'clipboardRead',
    hasPermission() {
      return checkPermission(['clipboardRead']);
    },
  },
  notification: {
    name: 'notifications',
    hasPermission() {
      return checkPermission(['notifications']);
    },
  },
  'handle-download': {
    name: 'downloads',
    hasPermission() {
      return checkPermission(['downloads']);
    },
  },
  'save-assets': {
    name: 'downloads',
    hasPermission() {
      return checkPermission(['downloads']);
    },
  },
  cookie: {
    name: 'cookies',
    hasPermission() {
      return checkPermission(['cookies']);
    },
  },
};
export const getWorkflowPermissions = async (drawflow: string | DrawflowData) => {
  let blocks: WorkflowNode[] = [];
  const permissions: string[] = [];
  const drawflowData =
    typeof drawflow === 'string'
      ? parseJSON<DrawflowData>(drawflow, {} as DrawflowData)
      : drawflow;
  if (drawflowData.nodes) {
    blocks = drawflowData.nodes;
  } else {
    blocks = Object.values(
      (
        drawflowData as {
          drawflow?: {
            Home?: {
              data?: Record<string, WorkflowNode>;
            };
          };
        }
      ).drawflow?.Home?.data || {}
    );
  }
  for (const block of blocks) {
    const name = String(block.label || (block as Record<string, unknown>).name || '');
    const permission = requiredPermissions[name as keyof typeof requiredPermissions];
    if (permission && !permissions.includes(permission.name)) {
      const hasPermission = await permission.hasPermission(block);
      if (!hasPermission) permissions.push(permission.name);
    }
  }
  return permissions;
};
export const importWorkflow = (attrs: Record<string, unknown> = {}) => {
  return new Promise<Record<string, Workflow>>((resolve, reject) => {
    openFilePicker(['application/json'], attrs)
      .then((files) => {
        const handleOnLoadReader = ({ target }: ProgressEvent<FileReader>) => {
          const workflow = JSON.parse(
            String(target?.result || '{}')
          ) as DeepPartial<Workflow> & {
            includedWorkflows?: Record<string, DeepPartial<Workflow>>;
            dataColumns?: Workflow['table'];
          };
          const workflowStore = useWorkflowStore() as ReturnType<
            typeof useWorkflowStore
          > & {
            workflows: Record<string, Workflow>;
            insert: (
              data: DeepPartial<Workflow>,
              options?: {
                duplicateId?: boolean;
              }
            ) => Promise<Record<string, Workflow>>;
            getById: (id: string) => Workflow | undefined;
          };
          if (workflow.includedWorkflows) {
            Object.keys(workflow.includedWorkflows).forEach((workflowId) => {
              const isWorkflowExists = Boolean(workflowStore.workflows[workflowId]);
              if (isWorkflowExists) return;
              const currentWorkflow = workflow.includedWorkflows[workflowId];
              currentWorkflow.table =
                currentWorkflow.table || currentWorkflow.dataColumns;
              delete currentWorkflow.dataColumns;
              workflowStore.insert(
                {
                  ...currentWorkflow,
                  id: workflowId,
                  createdAt: Date.now(),
                },
                { duplicateId: true }
              );
            });
            delete workflow.includedWorkflows;
          }
          workflow.table = workflow.table || workflow.dataColumns;
          delete workflow.dataColumns;
          if (typeof workflow.drawflow === 'string') {
            workflow.drawflow = parseJSON(workflow.drawflow, {} as DrawflowData);
          }
          workflowStore
            .insert({
              ...workflow,
              createdAt: Date.now(),
            })
            .then((result) => {
              Object.values(result as Record<string, Workflow>).forEach((item) => {
                const triggerBlock = findTriggerBlock(item.drawflow);
                if (triggerBlock) {
                  registerWorkflowTrigger(item.id, triggerBlock as WorkflowNode);
                }
              });
              resolve(result);
            });
        };
        (files as File[]).forEach((file) => {
          const reader = new FileReader();
          reader.onload = handleOnLoadReader;
          reader.readAsText(file);
        });
      })
      .catch((error) => {
        console.error(error);
        reject(error);
      });
  });
};
const defaultValue: Partial<Workflow> = {
  name: '',
  icon: '',
  table: [],
  settings: {} as Workflow['settings'],
  globalData: '',
  dataColumns: [],
  description: '',
  drawflow: { nodes: [], edges: [] },
  version: getExtensionManifest().version,
};
export const convertWorkflow = (
  workflow: Workflow | DeepPartial<Workflow> | null,
  additionalKeys: string[] = []
) => {
  if (!workflow) return null;
  const keys = [
    'name',
    'icon',
    'table',
    'version',
    'drawflow',
    'settings',
    'globalData',
    'description',
    ...additionalKeys,
  ];
  const content: Record<string, unknown> = {
    extVersion: getExtensionManifest().version,
  };
  keys.forEach((key) => {
    content[key] = workflow[key] ?? defaultValue[key];
  });
  return content;
};
const findIncludedWorkflows = (
  { drawflow }: Workflow,
  store: ReturnType<typeof useWorkflowStore> & {
    getById: (id: string) => Workflow | undefined;
  },
  maxDepth = 3,
  workflows: Record<string, Record<string, unknown>> = {}
) => {
  if (maxDepth === 0) return workflows;
  const flow = parseJSON(
    drawflow as unknown as string,
    drawflow as unknown as DrawflowData
  );
  const blocks =
    (
      flow as {
        drawflow?: {
          Home?: {
            data?: Record<string, WorkflowNode>;
          };
        };
      }
    )?.drawflow?.Home?.data ??
    (flow as DrawflowData).nodes ??
    null;
  if (!blocks) return workflows;
  const checkWorkflow = (type: string, workflowId: string) => {
    if (type !== 'execute-workflow' || workflows[workflowId]) return;
    const workflow = store.getById(workflowId);
    if (workflow) {
      workflows[workflowId] = convertWorkflow(workflow);
      findIncludedWorkflows(workflow, store, maxDepth - 1, workflows);
    }
  };
  if ((flow as DrawflowData).nodes) {
    (flow as DrawflowData).nodes.forEach((node) => {
      checkWorkflow(
        node.label,
        String((node.data as Record<string, unknown>).workflowId || '')
      );
    });
  } else {
    Object.values(
      blocks as unknown as Record<
        string,
        {
          data: Record<string, unknown>;
          name: string;
        }
      >
    ).forEach(({ data, name }) => {
      checkWorkflow(name, String(data.workflowId || ''));
    });
  }
  return workflows;
};
export const exportWorkflow = (workflow: Workflow) => {
  if (workflow.isProtected) return;
  const workflowStore = useWorkflowStore() as ReturnType<typeof useWorkflowStore> & {
    getById: (id: string) => Workflow | undefined;
  };
  const includedWorkflows = findIncludedWorkflows(workflow, workflowStore);
  const content = convertWorkflow(workflow);
  content.includedWorkflows = includedWorkflows;
  const blob = new Blob([JSON.stringify(content)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  fileSaver(`${workflow.name}.browsless.json`, url);
};
export default {
  export: exportWorkflow,
  import: importWorkflow,
};
