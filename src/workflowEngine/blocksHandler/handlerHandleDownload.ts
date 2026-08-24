import { extensionStorage } from '@/lib/extensionStorage';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import { MessageListener } from '@/utils/message';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
type HandleDownloadBlockData = {
  filename?: string;
  downloadId?: string;
  waitForDownload?: boolean;
  timeout?: number;
  saveData?: boolean;
  dataColumn?: string;
  assignVariable?: boolean;
  variableName?: string;
};
type DownloadFilesMap = Record<string, HandleDownloadBlockData>;
const DOWNLOADS_STORAGE_KEY = 'browsless-rename-downloaded-files';
const getDownloadFilesFromStorage = async (): Promise<DownloadFilesMap> => {
  try {
    const result = await extensionStorage.session.get(DOWNLOADS_STORAGE_KEY);
    return result[DOWNLOADS_STORAGE_KEY] || {};
  } catch (error) {
    console.error('Failed to get downloads from storage:', error);
    return {};
  }
};
const saveDownloadFilesToStorage = async (filesData: DownloadFilesMap) => {
  try {
    await extensionStorage.session.set({
      [DOWNLOADS_STORAGE_KEY]: filesData,
    });
  } catch (error) {
    console.error('Failed to save downloads to storage:', error);
  }
};
const removeDownloadFromStorage = async (downloadId: number) => {
  try {
    const filesData = await getDownloadFilesFromStorage();
    delete filesData[downloadId];
    await saveDownloadFilesToStorage(filesData);
  } catch (error) {
    console.error('Failed to remove download from storage:', error);
  }
};
const registerDownloadListeners = async () => {
  const hasPermission = await BrowserAPIService.permissions.contains({
    permissions: ['downloads'],
  });
  if (!hasPermission) {
    const granted = await BrowserAPIService.permissions.request({
      permissions: ['downloads'],
    });
    if (!granted) {
      throw new Error('Download feature requires download permission');
    }
  }
  return MessageListener.sendMessage('downloads:register-listeners', null, 'background');
};
async function handleDownload(
  this: WorkflowHandlerContext,
  { data, id: blockId }: WorkflowHandlerBlock<HandleDownloadBlockData>
) {
  const nextBlockId = this.getBlockConnections(blockId);
  try {
    const hasPermission = await BrowserAPIService.permissions.contains({
      permissions: ['downloads'],
    });
    if (!hasPermission) {
      const granted = await BrowserAPIService.permissions.request({
        permissions: ['downloads'],
      });
      if (!granted) {
        throw new Error('Download feature requires download permission');
      }
    }
    const processedData = {
      ...data,
      filename: data.filename?.trim() || '',
    };
    let downloadId: number | null = null;
    if (processedData.downloadId?.trim()) {
      if (Number.isNaN(+processedData.downloadId))
        throw new Error('Download id is not a number');
      const [downloadItem] = await BrowserAPIService.downloads.search({
        id: +processedData.downloadId,
      });
      if (!downloadItem)
        throw new Error(`Can't find download item with ${processedData.downloadId} id`);
      if (downloadItem.state === 'complete') {
        if (processedData.saveData && processedData.dataColumn) {
          this.addDataToColumn(processedData.dataColumn, downloadItem.filename);
        }
        if (processedData.assignVariable && processedData.variableName) {
          await this.setVariable(processedData.variableName, downloadItem.filename);
        }
        return {
          nextBlockId,
          data: downloadItem.filename,
        };
      }
      downloadId = +processedData.downloadId;
    }
    await registerDownloadListeners();
    type DownloadResult = {
      nextBlockId: unknown;
      data: unknown;
    };
    const result = await new Promise<DownloadResult>((resolve) => {
      if (!this.activeTab.id) throw new Error('no-tab');
      const tabId = this.activeTab.id;
      (async () => {
        try {
          if (!downloadId) {
            const downloadCompletePromise = new Promise<Record<string, unknown>>(
              (completeResolve) => {
                MessageListener.sendMessage(
                  'downloads:watch-created',
                  {
                    downloadData: processedData,
                    tabId,
                    onComplete: (response: Record<string, unknown>) => {
                      completeResolve(response);
                    },
                  },
                  'background'
                ).catch((err: Error) => {
                  completeResolve({ error: true, message: err.message });
                });
              }
            );
            if (!processedData.waitForDownload) {
              resolve({
                nextBlockId,
                data: processedData.filename,
              });
              return;
            }
            const timeoutPromise = new Promise((timeoutResolve) => {
              setTimeout(() => {
                timeoutResolve({
                  timedOut: true,
                  filename: processedData.filename,
                });
              }, processedData.timeout);
            });
            const downloadResult = (await Promise.race([
              downloadCompletePromise,
              timeoutPromise,
            ])) as Record<string, unknown>;
            let finalFilename: string | undefined = processedData.filename;
            if (downloadResult.filename) {
              finalFilename = downloadResult.filename as string;
            }
            if (processedData.saveData && processedData.dataColumn) {
              this.addDataToColumn(processedData.dataColumn, finalFilename);
            }
            if (processedData.assignVariable && processedData.variableName) {
              await this.setVariable(processedData.variableName, finalFilename);
            }
            resolve({
              nextBlockId,
              data: finalFilename,
            });
          } else {
            const filesData = await getDownloadFilesFromStorage();
            filesData[downloadId] = processedData;
            await saveDownloadFilesToStorage(filesData);
            if (!processedData.waitForDownload) {
              resolve({
                nextBlockId,
                data: processedData.filename,
              });
              return;
            }
            let isResolved = false;
            let currentFilename: string | undefined = processedData.filename;
            const timeout = setTimeout(() => {
              if (isResolved) return;
              isResolved = true;
              resolve({
                nextBlockId,
                data: currentFilename,
              });
            }, processedData.timeout);
            await MessageListener.sendMessage(
              'downloads:watch-changed',
              {
                downloadId,
                tabId,
                onComplete: async (response: Record<string, unknown>) => {
                  try {
                    if (isResolved) return;
                    if (response.filename) {
                      currentFilename = response.filename as string;
                    }
                    if (processedData.saveData && processedData.dataColumn) {
                      this.addDataToColumn(processedData.dataColumn, currentFilename);
                    }
                    if (processedData.assignVariable && processedData.variableName) {
                      await this.setVariable(processedData.variableName, currentFilename);
                    }
                    clearTimeout(timeout);
                    isResolved = true;
                    if (response.downloadId) {
                      await removeDownloadFromStorage(response.downloadId as number);
                    }
                    resolve({
                      nextBlockId,
                      data: currentFilename,
                    });
                  } catch (err) {
                    if (!isResolved) {
                      isResolved = true;
                      resolve({
                        nextBlockId,
                        data: { $error: true, message: (err as Error).message },
                      });
                    }
                  }
                },
              },
              'background'
            );
          }
        } catch (err) {
          resolve({
            nextBlockId,
            data: { $error: true, message: (err as Error).message },
          });
        }
      })().catch((err) => {
        resolve({
          nextBlockId,
          data: { $error: true, message: err.message },
        });
      });
    });
    return result;
  } catch (rawError) {
    const error = rawError as Error;
    return {
      nextBlockId,
      data: { $error: true, message: error.message },
    };
  }
}
export default handleDownload;
