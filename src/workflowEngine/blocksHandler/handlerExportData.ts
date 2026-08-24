import { default as dataExporter, files } from '@/utils/dataExporter';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import type { ExportOptions } from '@/types/editor';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
type ExportDataBlockData = ExportOptions & {
  dataToExport?: 'data-columns' | 'google-sheets' | 'variable';
  refKey?: string;
  variableName?: string;
  csvDelimiter?: string;
  onConflict?: 'uniquify' | 'overwrite' | 'prompt';
};
type ExportRefData = {
  table: Record<string, unknown>[];
  googleSheets: Record<string, unknown[]>;
  variables: Record<string, unknown>;
};
const blobToBase64 = (blob: Blob) => {
  return new Promise<string | ArrayBuffer | null>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};
async function exportData(
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<ExportDataBlockData>,
  {
    refData,
  }: {
    refData: ExportRefData;
  }
) {
  const dataToExport = data.dataToExport || 'data-columns';
  let payload: unknown = refData.table;
  if (dataToExport === 'google-sheets') {
    payload = refData.googleSheets[data.refKey] || [];
  } else if (dataToExport === 'variable') {
    payload = refData.variables[data.variableName] || [];
    if (!Array.isArray(payload)) {
      payload = [payload];
      if (data.type === 'csv' && typeof payload[0] !== 'object') payload = [payload];
    }
  }
  const isDOMAvailable = typeof document !== 'undefined';
  let blobUrl = dataExporter(
    payload as Record<string, unknown[]> | unknown[] | Record<string, unknown>,
    {
      ...data,
      csvOptions: {
        delimiter: data.csvDelimiter || ',',
      },
      returnUrl: !isDOMAvailable,
    }
  );
  const hasDownloadAccess =
    !isDOMAvailable &&
    (await BrowserAPIService.permissions.contains({
      permissions: ['downloads'],
    }));
  if (hasDownloadAccess) {
    blobUrl = String(await blobToBase64(blobUrl as Blob));
    const filename = `${data.name || 'unnamed'}${files[data.type].ext}`;
    const options = {
      filename,
      conflictAction: data.onConflict || 'uniquify',
    };
    await BrowserAPIService.downloads.download({
      ...options,
      url: blobUrl,
    });
  }
  return {
    data: '',
    nextBlockId: this.getBlockConnections(id),
  };
}
export default exportData;
