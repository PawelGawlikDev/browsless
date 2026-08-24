import { extensionStorage } from '@/lib/extensionStorage';
import type { Workflow } from '@/types/models';
import { parseJSON } from '@/utils/helper';
import { sendMessage } from '@/utils/message';
type WorkflowVariables = Record<string, unknown>;
const getWorkflowDetail = () => {
  let hash = window.location.hash.slice(1);
  if (!hash.startsWith('/')) hash = `/${hash}`;
  const { pathname, searchParams } = new URL(window.location.origin + hash);
  const variables: WorkflowVariables = {};
  const { 1: workflowId } = pathname.split('/');
  searchParams.forEach((value, key) => {
    const varValue = parseJSON(decodeURIComponent(value), '##_empty');
    if (varValue === '##_empty') return;
    variables[key] = varValue;
  });
  return { workflowId: workflowId ?? '', variables };
};
const writeResult = (text) => {
  document.body.innerText = text;
};
const findWorkflowById = (
  workflows: unknown,
  workflowId: string
): Workflow | undefined => {
  if (Array.isArray(workflows)) {
    return workflows.find((item): item is Workflow => item?.id === workflowId);
  }
  if (workflows && typeof workflows === 'object') {
    return (workflows as Record<string, Workflow>)[workflowId];
  }
  return undefined;
};
(async () => {
  try {
    const { workflowId, variables } = getWorkflowDetail();
    if (!workflowId) {
      writeResult('Invalid path');
      return;
    }
    const { workflows } = await extensionStorage.local.get('workflows');
    const workflow = findWorkflowById(workflows, workflowId);
    if (!workflow) {
      writeResult('Workflow not found');
      return;
    }
    const hasVariables = Object.keys(variables).length > 0;
    writeResult('Executing workflow');
    sendMessage(
      'workflow:execute',
      {
        ...workflow,
        options: { checkParam: !hasVariables, data: { variables } },
      },
      'background'
    ).then(() => {
      setTimeout(window.close, 1000);
    });
  } catch (error) {
    console.error(error);
  }
})();
