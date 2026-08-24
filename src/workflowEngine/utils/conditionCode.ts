import { customAlphabet } from 'nanoid/non-secure';
import { browslessRefDataStr, checkCSPAndInject, messageSandbox } from '../helper';
import type { WorkflowHandlerContext } from '@/types/workflow-engine';

const nanoid = customAlphabet('1234567890abcdef', 5);

type ConditionCodePayload = {
  debugMode?: boolean;
  isPopup?: boolean;
  refData: Record<string, unknown>;
  data: {
    context?: string;
    code?: string;
  };
};

export default async function (
  activeTab: WorkflowHandlerContext['activeTab'],
  payload: ConditionCodePayload
) {
  const variableId = `browsless${nanoid()}`;

  if (!payload.data.context || payload.data.context === 'website' || !payload.isPopup) {
    if (!activeTab.id) throw new Error('no-tab');

    const refDataScriptStr = browslessRefDataStr(variableId);

    const callbackFunctionStr = `
      function() {
        return \`
        (async () => {
          const browsless${variableId} = ${JSON.stringify(payload.refData)};
          ${refDataScriptStr}
          try {
            ${payload.data.code ?? ''}
          } catch (error) {
            return {
              $isError: true,
              message: error.message,
            }
          }
        })();
        \`;
      }
      `;

    const result = await checkCSPAndInject(
      {
        target: { tabId: activeTab.id },
        debugMode: payload.debugMode,
      },
      callbackFunctionStr
    );

    return result.value;
  }

  const result = await messageSandbox<{ $isError?: boolean; message?: string }>(
    'conditionCode',
    payload as unknown as Record<string, unknown>
  );
  if (result && result.$isError) throw new Error(result.message);

  return result;
}
