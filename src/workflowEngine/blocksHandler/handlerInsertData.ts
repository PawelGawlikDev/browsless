import { read as readXlsx, utils as utilsXlsx } from 'xlsx';
import type { Sheet2JSONOpts } from 'xlsx';
import Papa from 'papaparse';
import { parseJSON } from '@/utils/helper';
import getFile, { readFileAsBase64 } from '@/utils/getFile';
import renderString from '../templating/renderString';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerOptions,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type InsertDataItem = {
  type?: string;
  name: unknown;
  value?: unknown;
  isFile?: boolean;
  filePath?: string;
  action?: string;
  csvAction?: string;
  xlsSheet?: string;
  xlsRange?: string;
};

type InsertDataBlockData = {
  dataList: InsertDataItem[];
};

async function insertData(
  this: WorkflowHandlerContext,
  { id, data }: WorkflowHandlerBlock<InsertDataBlockData>,
  { refData }: WorkflowHandlerOptions
) {
  const replacedValueList: Record<string, unknown> = {};

  for (const item of data.dataList) {
    let value: unknown = '';

    if (item.isFile) {
      const replacedPath = await renderString(
        item.filePath || '',
        refData as unknown as Record<string, unknown>,
        Boolean(this.engine.isPopup)
      );
      const path = replacedPath === '' ? '' : (replacedPath.value as string);
      const isExcel = /.xlsx?$/.test(path);
      const isJSON = path.endsWith('.json');

      const action = item.action || item.csvAction || 'default';
      let responseType: 'text' | 'json' | 'blob' = 'text';

      if (isJSON) responseType = 'json';
      else if (action === 'base64' || (isExcel && action !== 'default'))
        responseType = 'blob';

      let result: unknown = await getFile(path, {
        responseType,
        returnValue: true,
      });

      const readAsJson = action.includes('json');

      if (action === 'base64') {
        result = await readFileAsBase64(result as Blob);
      } else if (
        result &&
        typeof result === 'string' &&
        path.endsWith('.csv') &&
        readAsJson
      ) {
        const parsedCSV = Papa.parse(result, {
          header: action.includes('header'),
        });
        result = parsedCSV.data || [];
      } else if (isExcel && readAsJson) {
        const base64Xls = await readFileAsBase64(result as Blob);
        const wb = readXlsx(
          (base64Xls as string).slice((base64Xls as string).indexOf(',')),
          {
            type: 'base64',
          }
        );

        const inputtedSheet = (item.xlsSheet || '').trim();
        const sheetName = wb.SheetNames.includes(inputtedSheet)
          ? inputtedSheet
          : wb.SheetNames[0];

        const options: Sheet2JSONOpts = {};
        if (item.xlsRange) options.range = item.xlsRange;
        if (!action.includes('header')) options.header = 1;

        const sheetData = utilsXlsx.sheet_to_json(wb.Sheets[sheetName], options);
        result = sheetData;
      }

      value = result;
      Object.assign(replacedValueList, replacedPath === '' ? {} : replacedPath.list);
    } else {
      const replacedValue = await renderString(
        String(item.value ?? ''),
        refData as unknown as Record<string, unknown>,
        Boolean(this.engine.isPopup)
      );
      const renderedValue = replacedValue === '' ? '' : replacedValue.value;
      value = parseJSON(renderedValue as string, renderedValue);
      Object.assign(replacedValueList, replacedValue === '' ? {} : replacedValue.list);
    }

    if (item.type === 'table') {
      const values = typeof value === 'string' ? value.split('||') : [value];
      values.forEach((tableValue) => {
        this.addDataToColumn(String(item.name), tableValue);
      });
    } else {
      const variableName = await renderString(
        String(item.name ?? ''),
        refData as unknown as Record<string, unknown>,
        Boolean(this.engine.isPopup)
      );
      await this.setVariable(
        variableName === '' ? '' : (variableName.value as string),
        value
      );
    }
  }

  return {
    data: '',
    replacedValue: replacedValueList,
    nextBlockId: this.getBlockConnections(id),
  };
}

export default insertData;
