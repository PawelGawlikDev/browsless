import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
type ClipboardBlockData = {
  type?: 'get' | 'insert';
  assignVariable?: boolean;
  variableName?: string;
  saveData?: boolean;
  dataColumn?: string;
  copySelectedText?: boolean;
  dataToCopy?: string;
};
const doCommand = (command: 'copy' | 'paste', value = '') => {
  const textarea = document.createElement('textarea');
  document.body.appendChild(textarea);
  if (command === 'paste') {
    textarea.focus();
    document.execCommand('paste');
    value = textarea.value;
  } else if (command === 'copy') {
    textarea.value = value;
    textarea.select();
    document.execCommand('copy');
    textarea.blur();
  }
  textarea.remove();
  return value;
};
export default async function (
  this: WorkflowHandlerContext,
  { data, id, label }: WorkflowHandlerBlock<ClipboardBlockData>
) {
  if (!this.engine?.isPopup)
    throw new Error('Clipboard block is not supported in background execution');
  const hasPermission = await BrowserAPIService.permissions.contains({
    permissions: ['clipboardRead'],
  });
  if (!hasPermission) {
    throw new Error('no-clipboard-acces');
  }
  let valueToReturn = '';
  if (!data.type || data.type === 'get') {
    const copiedText = doCommand('paste');
    valueToReturn = copiedText;
    if (data.assignVariable && data.variableName) {
      await this.setVariable(data.variableName, copiedText);
    }
    if (data.saveData && data.dataColumn) {
      this.addDataToColumn(data.dataColumn, copiedText);
    }
  } else if (data.type === 'insert') {
    let text = '';
    if (data.copySelectedText) {
      if (!this.activeTab.id) throw new Error('no-tab');
      text = (await this._sendMessageToTab({
        id,
        label,
      })) as string;
    } else {
      text = data.dataToCopy ?? '';
    }
    valueToReturn = text;
    doCommand('copy', text);
  }
  return {
    data: valueToReturn,
    nextBlockId: this.getBlockConnections(id),
  };
}
