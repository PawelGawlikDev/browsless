import { fileSaver } from '@/utils/helper';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import { waitTabLoaded } from '../helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
type TakeScreenshotBlockData = {
  captureActiveTab?: boolean;
  fullPage?: boolean;
  type?: string;
  selector?: string;
  quality?: number;
  ext?: string;
  fileName?: string;
  saveToComputer?: boolean;
  saveToColumn?: boolean;
  dataColumn?: string;
  assignVariable?: boolean;
  variableName?: string;
};
const saveImage = async ({
  filename,
  uri,
  ext,
}: {
  filename?: string;
  uri: string;
  ext?: string;
}) => {
  const hasDownloadAccess = await BrowserAPIService.permissions.contains({
    permissions: ['downloads'],
  });
  const name = `${filename || 'Screenshot'}.${ext || 'png'}`;
  if (hasDownloadAccess) {
    await BrowserAPIService.downloads.download({
      url: uri,
      filename: name,
    });
    return;
  }
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    fileSaver(name, canvas.toDataURL());
  };
  image.src = uri;
};
async function takeScreenshot(
  this: WorkflowHandlerContext,
  { data, id, label }: WorkflowHandlerBlock<TakeScreenshotBlockData>
) {
  const saveToComputer =
    typeof data.saveToComputer === 'undefined' || data.saveToComputer;
  try {
    let screenshot: string | null = null;
    const options: {
      quality?: number;
      format: 'jpeg' | 'png';
    } = {
      quality: data.quality,
      format: (data.ext || 'png') as 'jpeg' | 'png',
    };
    const saveScreenshot = async (dataUrl: string | null) => {
      if (!dataUrl) return;
      if (data.saveToColumn && data.dataColumn)
        this.addDataToColumn(data.dataColumn, dataUrl);
      if (saveToComputer)
        await saveImage({
          filename: data.fileName,
          uri: dataUrl,
          ext: data.ext,
        });
      if (data.assignVariable && data.variableName)
        await this.setVariable(data.variableName, dataUrl);
    };
    if (data.captureActiveTab) {
      if (!this.activeTab.id) {
        throw new Error('no-tab');
      }
      const tabId = this.activeTab.id;
      const captureTab = async () => {
        const currentTab = await BrowserAPIService.tabs.get(tabId);
        return BrowserAPIService.tabs.captureVisibleTab(
          currentTab.windowId as number,
          options
        );
      };
      const [tab] = await BrowserAPIService.tabs.query({
        active: true,
        url: '*://*/*',
      });
      if (this.windowId) {
        await BrowserAPIService.windows.update(this.windowId, {
          focused: true,
        });
      }
      await BrowserAPIService.tabs.update(tabId, { active: true });
      await waitTabLoaded({ tabId, listenError: true });
      screenshot = await (data.fullPage ||
      ['element', 'fullpage'].includes(data.type ?? '')
        ? this._sendMessageToTab({
            label,
            options,
            data: {
              type: data.type,
              selector: data.selector,
            },
            tabId,
          })
        : captureTab());
      if (tab?.id) {
        await BrowserAPIService.windows.update(tab.windowId, { focused: true });
        await BrowserAPIService.tabs.update(tab.id, { active: true });
      }
      await saveScreenshot(screenshot);
    } else {
      screenshot = await BrowserAPIService.tabs.captureVisibleTab(options);
      await saveScreenshot(screenshot);
    }
    return {
      data: screenshot,
      nextBlockId: this.getBlockConnections(id),
    };
  } catch (rawError) {
    const error = rawError as Error & {
      data?: Record<string, unknown>;
    };
    if (data.type === 'element') error.data = { selector: data.selector };
    throw error;
  }
}
export default takeScreenshot;
