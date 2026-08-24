import Papa from 'papaparse';
import type { ExportFileType, ExportOptions } from '@/types/editor';
import { fileSaver } from './helper';
export const files: Record<ExportOptions['type'], ExportFileType> = {
  'plain-text': {
    mime: 'text/plain',
    ext: '.txt',
  },
  json: {
    mime: 'application/json',
    ext: '.json',
  },
  csv: {
    mime: 'text/csv',
    ext: '.csv',
  },
};
export const generateJSON = (
  keys: string[],
  data: Record<string, unknown[]> | unknown[]
) => {
  if (Array.isArray(data)) return data;
  const result: Record<string, unknown>[] = [];
  keys.forEach((key) => {
    for (let index = 0; index < data[key].length; index += 1) {
      const currData = data[key][index];
      if (typeof result[index] === 'undefined') {
        result.push({ [key]: currData });
      } else {
        result[index][key] = currData;
      }
    }
  });
  return result;
};
const dataExporter = (
  data: Record<string, unknown[]> | unknown[] | Record<string, unknown>,
  { name, type, addBOMHeader, csvOptions, returnUrl, returnBlob }: ExportOptions,
  converted?: boolean
) => {
  let result: unknown = data;
  if (type === 'csv' || type === 'json') {
    const sourceData = data as Record<string, unknown[]> | unknown[];
    const jsonData =
      converted || Array.isArray(sourceData)
        ? sourceData
        : generateJSON(Object.keys(sourceData), sourceData);
    result =
      type === 'csv'
        ? Papa.unparse(jsonData, csvOptions || {})
        : JSON.stringify(jsonData, null, 2);
  } else if (type === 'plain-text') {
    const extractObj = (obj) => {
      if (typeof obj !== 'object') return [obj];
      const kes = Object.keys(obj);
      kes.forEach((key) => {
        const itemValue = obj[key];
        if (typeof itemValue === 'object') {
          obj[key] = JSON.stringify(itemValue);
        }
      });
      return Object.values(obj);
    };
    result = (
      Array.isArray(data) ? data.flatMap((item) => extractObj(item)) : extractObj(data)
    ).join(' ');
  }
  const payload: BlobPart[] = [String(result)];
  if (type === 'csv' && addBOMHeader) {
    payload.unshift(new Uint8Array([0xef, 0xbb, 0xbf]));
  }
  const { mime, ext } = files[type];
  const blob = new Blob(payload, { type: mime });
  if (returnBlob) return blob;
  const blobUrl = URL.createObjectURL(blob);
  if (!returnUrl) fileSaver(`${name || 'unnamed'}${ext}`, blobUrl);
  return blobUrl;
};
export default dataExporter;
