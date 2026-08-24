import { MessageListener } from '@/utils/message';
import { checkCSPAndInject, sendDebugCommand } from '../helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type HandleDialogBlockData = {
  accept: boolean;
  promptText?: string;
};

const overwriteDialog = (accept: boolean, promptText = '') => `
  const realConfirm = window.confirm;
  window.confirm = function() {
    return ${accept};
  };

  const realAlert = window.alert;
  window.alert = function() {
    return ${accept};
  };

  const realPrompt = window.prompt;
  window.prompt = function() {
    return ${accept} ? "${promptText}" : null;
  }
`;

async function handleDialog(
  this: WorkflowHandlerContext,
  { data, id: blockId }: WorkflowHandlerBlock<HandleDialogBlockData>
) {
  if (!this.settings.debugMode) {
    const isScriptExist = this.preloadScripts.some(
      (script) => (script as { id: string }).id === blockId
    );

    if (!isScriptExist) {
      const jsCode = overwriteDialog(data.accept, data.promptText);

      const target = { tabId: this.activeTab.id, allFrames: true };
      const { debugMode } = this.engine.workflow?.settings ?? {};
      const cspResult = await checkCSPAndInject({
        target,
        debugMode,
        injectOptions: {
          injectImmediately: true,
        },
      });
      if (!cspResult.isBlocked) {
        MessageListener.sendMessage(
          'script:execute-callback',
          {
            target,
            callback: jsCode,
          },
          'background'
        );
      }
    }
  } else {
    this.dialogParams = {
      accept: data.accept,
      promptText: data.promptText,
    };

    const methodName = 'Page.javascriptDialogOpening';
    if (!this.engine.eventListeners[methodName]) {
      this.engine.on(methodName, () => {
        sendDebugCommand(
          this.activeTab.id,
          'Page.handleJavaScriptDialog',
          this.dialogParams as Record<string, unknown>
        );
      });
    }
  }

  return {
    data: '',
    nextBlockId: this.getBlockConnections(blockId),
  };
}

export default handleDialog;
