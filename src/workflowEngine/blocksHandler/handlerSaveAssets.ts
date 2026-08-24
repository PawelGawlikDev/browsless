import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
type SaveAssetsBlockData = {
  type: 'element' | 'url';
  url?: string;
  filename?: string;
  onConflict?: 'uniquify' | 'overwrite' | 'prompt';
  saveDownloadIds?: boolean;
  assignVariable?: boolean;
  variableName?: string;
  saveData?: boolean;
  dataColumn?: string;
};
const getFilename = (url: string) => {
  try {
    const filename = new URL(url).pathname.split('/').pop() as string;
    const hasExtension = /\.[0-9a-z]+$/i.test(filename);
    if (!hasExtension) return null;
    return filename;
  } catch {
    return null;
  }
};
export default async function (
  this: WorkflowHandlerContext,
  { data, id, label }: WorkflowHandlerBlock<SaveAssetsBlockData>
) {
  const hasPermission = await BrowserAPIService.permissions.contains({
    permissions: ['downloads'],
  });
  if (!hasPermission) {
    const error = Object.assign(new Error('no-permission'), {
      data: { permission: 'downloads' },
    });
    throw error;
  }
  let sources = [data.url];
  let index = 0;
  const downloadFile = (url?: string) => {
    const options: chrome.downloads.DownloadOptions = {
      url: url as string,
      conflictAction: data.onConflict,
    };
    let filename = decodeURIComponent(
      (data.filename || getFilename(url as string)) as string
    );
    if (filename) {
      if (data.onConflict === 'overwrite' && index !== 0) {
        filename = `(${index}) ${filename}`;
      }
      options.filename = filename;
      index += 1;
    }
    return BrowserAPIService.downloads.download(options);
  };
  let downloadIds: number[] | null = null;
  if (data.type === 'element') {
    sources = (await this._sendMessageToTab({
      id,
      data,
      label,
      tabId: this.activeTab.id,
    })) as Array<string | undefined>;
    downloadIds = await Promise.all(sources.map((url) => downloadFile(url)));
  } else if (data.type === 'url') {
    downloadIds = [await downloadFile(data.url)];
  }
  if (data.saveDownloadIds) {
    if (data.assignVariable && data.variableName) {
      await this.setVariable(data.variableName, downloadIds);
    }
    if (data.saveData && data.dataColumn) {
      this.addDataToColumn(data.dataColumn, downloadIds);
    }
  }
  return {
    data: { sources, downloadIds },
    nextBlockId: this.getBlockConnections(id),
  };
}
