import { fetchGapi, fetchApi } from '@/utils/api';
type QueryParams = Record<string, string | number | boolean>;
type RequestOptions = RequestInit & {
  queries?: QueryParams;
};
type SpreadsheetRef = {
  spreadsheetId: string;
  range: string;
};
type UpdateValuesInput = SpreadsheetRef & {
  options: RequestOptions;
  append?: boolean;
};
const queryBuilder = (obj: QueryParams) => {
  let str = '';
  Object.entries(obj).forEach(([key, value], index) => {
    if (index !== 0) str += `&`;
    str += `${key}=${value}`;
  });
  return str;
};
export const googleSheetNative = {
  getUrl(path: string) {
    return `https://sheets.googleapis.com/v4/spreadsheets${path}`;
  },
  getValues({ spreadsheetId, range }: SpreadsheetRef) {
    const url = googleSheetNative.getUrl(`/${spreadsheetId}/values/${range}`);
    return fetchGapi(url);
  },
  getRange({ spreadsheetId, range }: SpreadsheetRef) {
    const url = googleSheetNative.getUrl(
      `/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&includeValuesInResponse=false&insertDataOption=INSERT_ROWS`
    );
    return fetchGapi(url, {
      method: 'POST',
    });
  },
  clearValues({ spreadsheetId, range }: SpreadsheetRef) {
    const url = googleSheetNative.getUrl(`/${spreadsheetId}/values/${range}:clear`);
    return fetchGapi(url, { method: 'POST' });
  },
  updateValues({ spreadsheetId, range, options, append }: UpdateValuesInput) {
    let url = '';
    let method: 'POST' | 'PUT' = 'PUT';
    if (append) {
      url = googleSheetNative.getUrl(`/${spreadsheetId}/values/${range}:append`);
      method = 'POST';
    } else {
      url = googleSheetNative.getUrl(`/${spreadsheetId}/values/${range}`);
      method = 'PUT';
    }
    const payload: RequestInit = { method };
    if (options.body) payload.body = options.body;
    return fetchGapi(`${url}?${queryBuilder(options?.queries || {})}`, payload);
  },
  create(name: string) {
    const url = googleSheetNative.getUrl('');
    return fetchGapi(url, {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          title: name,
        },
      }),
    });
  },
  addSheet({ sheetName, spreadsheetId }: { sheetName: string; spreadsheetId: string }) {
    const url = googleSheetNative.getUrl(`/${spreadsheetId}:batchUpdate`);
    return fetchGapi(url, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: { title: sheetName },
            },
          },
        ],
      }),
    });
  },
};
export const googleSheets = {
  getUrl(spreadsheetId: string, range: string) {
    return `/services/google-sheets?spreadsheetId=${spreadsheetId}&range=${range}`;
  },
  getValues({ spreadsheetId, range }: SpreadsheetRef) {
    const url = this.getUrl(spreadsheetId, range);
    return fetchApi(url);
  },
  getRange({ spreadsheetId, range }: SpreadsheetRef) {
    return googleSheets.updateValues({
      range,
      append: true,
      spreadsheetId,
      options: {
        body: JSON.stringify({ values: [] }),
        queries: {
          valueInputOption: 'RAW',
          includeValuesInResponse: false,
          insertDataOption: 'INSERT_ROWS',
        },
      },
    });
  },
  clearValues({ spreadsheetId, range }: SpreadsheetRef) {
    return fetchApi(this.getUrl(spreadsheetId, range), {
      method: 'DELETE',
    });
  },
  updateValues({
    spreadsheetId,
    range,
    options = {},
    append,
  }: Partial<UpdateValuesInput> & SpreadsheetRef) {
    const url = `${this.getUrl(spreadsheetId, range)}&${queryBuilder(options?.queries || {})}`;
    return fetchApi(url, {
      ...options,
      method: append ? 'POST' : 'PUT',
    });
  },
};
const getGoogleSheetsClient = (isDriveSheet = false) => {
  return isDriveSheet ? googleSheetNative : googleSheets;
};
export default getGoogleSheetsClient;
