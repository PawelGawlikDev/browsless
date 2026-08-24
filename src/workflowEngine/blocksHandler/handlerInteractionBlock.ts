import { objectHasKey } from '@/utils/helper';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import { attachDebugger } from '../helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
type InteractionBlockData = {
  settings?: Record<string, unknown>;
  debugMode?: boolean;
  saveData?: boolean;
  getValue?: boolean;
  dataColumn?: string;
  extraRowDataColumn?: string;
  addExtraRow?: boolean;
  extraRowValue?: unknown;
  assignVariable?: boolean;
  variableName?: string;
  selector?: string;
};
type InteractionBlock = WorkflowHandlerBlock<InteractionBlockData> & {
  debugMode?: boolean;
};
const checkAccess = async (blockName?: string) => {
  if (blockName === 'upload-file') {
    const hasFileAccess = await BrowserAPIService.extension.isAllowedFileSchemeAccess();
    if (hasFileAccess) return true;
    throw new Error('no-file-access');
  } else if (blockName === 'clipboard') {
    const hasPermission = await BrowserAPIService.permissions.contains({
      permissions: ['clipboardRead'],
    });
    if (!hasPermission) {
      throw new Error('no-clipboard-acces');
    }
  }
  return true;
};
async function interactionHandler(this: WorkflowHandlerContext, block: InteractionBlock) {
  await checkAccess(block.label);
  const debugMode =
    ((block.data.settings?.debugMode as boolean | undefined) ?? false) &&
    !this.settings.debugMode;
  try {
    if (debugMode) {
      await attachDebugger(this.activeTab.id as number);
      block.debugMode = true;
    }
    const data = await this._sendMessageToTab(
      block as unknown as Record<string, unknown>,
      {
        frameId: this.activeTab.frameId || 0,
      }
    );
    if (
      (block.data.saveData && block.label !== 'forms') ||
      (block.data.getValue && block.data.saveData)
    ) {
      const currentColumnType =
        (
          this.engine.columns[block.data.dataColumn as string] as
            | {
                type?: string;
              }
            | undefined
        )?.type || 'any';
      const insertDataToColumn = (value: unknown) => {
        this.addDataToColumn(block.data.dataColumn as string, value);
        const addExtraRow =
          objectHasKey(block.data, 'extraRowDataColumn') && block.data.addExtraRow;
        if (addExtraRow) {
          this.addDataToColumn(
            block.data.extraRowDataColumn as string,
            block.data.extraRowValue
          );
        }
      };
      if (Array.isArray(data) && currentColumnType !== 'array') {
        data.forEach((value) => {
          insertDataToColumn(value);
        });
      } else {
        insertDataToColumn(data);
      }
    }
    if (block.data.assignVariable) {
      await this.setVariable(block.data.variableName as string, data);
    }
    if (debugMode && this.activeTab.id) {
      BrowserAPIService.debugger.detach({ tabId: this.activeTab.id });
    }
    return {
      data,
      nextBlockId: this.getBlockConnections(block.id),
    };
  } catch (rawError) {
    const error = rawError as Error & {
      data?: Record<string, unknown>;
    };
    if (debugMode && this.activeTab.id) {
      BrowserAPIService.debugger.detach({ tabId: this.activeTab.id });
    }
    error.data = {
      name: block.label,
      selector: block.data.selector,
    };
    throw error;
  }
}
export default interactionHandler;
