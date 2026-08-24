import { extensionStorage, watchExtensionStorageValue } from '@/lib/extensionStorage';
import Mousetrap from 'mousetrap';
import { sendMessage } from '@/utils/message';
type StoredWorkflow = {
  id?: string;
  settings?: {
    publicId?: string;
  };
  trigger?: {
    activeInInput?: boolean;
  };
} & Record<string, any>;
type ShortcutDetail = {
  id?: string;
  publicId?: string;
  data?: Record<string, unknown>;
};
Mousetrap.prototype.stopCallback = function () {
  return false;
};
const browslessCustomEventListener = (
  findWorkflow: (id: string, publicId?: boolean) => StoredWorkflow | undefined
) => {
  const customEventListener = ({ detail }: CustomEventInit) => {
    const data = detail as ShortcutDetail | undefined;
    if (!data || (!data.id && !data.publicId)) return;
    const workflowId = (data.id || data.publicId) as string;
    const workflow = findWorkflow(workflowId, Boolean(data.publicId));
    if (!workflow) return;
    workflow.options = {
      data: data.data || {},
    };
    sendMessage('workflow:execute', workflow, 'background');
  };
  window.addEventListener(
    '__browslessExecuteWorkflow',
    customEventListener as EventListener
  );
  window.addEventListener(
    'browsless:execute-workflow',
    customEventListener as EventListener
  );
};
const workflowShortcutsListener = (
  findWorkflow: (id: string, publicId?: boolean) => StoredWorkflow | undefined,
  shortcutsObj: Record<string, string>
) => {
  const shortcuts = Object.entries(shortcutsObj);
  if (shortcuts.length === 0) return;
  const keyboardShortcuts = shortcuts.reduce<
    Record<
      string,
      Array<{
        id: string;
        workflow: StoredWorkflow;
        activeInInput: boolean;
      }>
    >
  >((acc, [id, value]) => {
    let workflowId = id;
    if (id.startsWith('trigger')) {
      const [, triggerWorkflowId] = id.split(':');
      workflowId = triggerWorkflowId;
    }
    const workflow = findWorkflow(workflowId);
    if (!workflow) return acc;
    (acc[value] = acc[value] || []).push({
      id,
      workflow,
      activeInInput: workflow.trigger?.activeInInput || false,
    });
    return acc;
  }, {});
  Mousetrap.bind(Object.keys(keyboardShortcuts), ({ target }, command) => {
    const targetEl = target as HTMLElement | undefined;
    const isInputElement =
      ['INPUT', 'SELECT', 'TEXTAREA'].includes(targetEl?.tagName ?? '') ||
      targetEl?.isContentEditable === true;
    keyboardShortcuts[command].forEach((item) => {
      if (!item.activeInInput && isInputElement) return;
      sendMessage('workflow:execute', item.workflow, 'background');
    });
    return true;
  });
};
const getWorkflows = async (): Promise<StoredWorkflow[]> => {
  const storage = (await extensionStorage.local.get(['workflows'])) as {
    workflows?: Record<string, StoredWorkflow> | null;
  };
  return [...Object.values(storage.workflows || {})];
};
export default async function () {
  try {
    const storage = (await extensionStorage.local.get('shortcuts')) as {
      shortcuts?: Record<string, string>;
    };
    let workflows = await getWorkflows();
    const findWorkflow = (id: string, publicId = false): StoredWorkflow | undefined => {
      const workflow = workflows.find((item) => {
        if (publicId) {
          return item.settings?.publicId === id;
        }
        return item.id === id;
      });
      return workflow;
    };
    watchExtensionStorageValue<string>('local', 'browslessShortcut', (newValue) => {
      if (Array.isArray(newValue) && newValue.length < 1) {
        window._browslessShortcuts = [];
      } else if (newValue) {
        window._browslessShortcuts = newValue.split('+');
      }
    });
    watchExtensionStorageValue<Record<string, string>>(
      'local',
      'shortcuts',
      (newValue) => {
        Mousetrap.reset();
        getWorkflows().then((updatedWorkflows) => {
          workflows = updatedWorkflows;
          workflowShortcutsListener(findWorkflow, newValue || {});
        });
      }
    );
    browslessCustomEventListener(findWorkflow);
    workflowShortcutsListener(findWorkflow, storage.shortcuts || {});
  } catch (error) {
    console.error(error);
  }
}
