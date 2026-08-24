import { parseJSON, isWhitespace } from '@/utils/helper';
import getFile from '@/utils/getFile';
const renderContent = async (
  content: unknown,
  contentType?: string
): Promise<string | BodyInit> => {
  if (contentType === 'text') return content as string;
  const renderedJson = parseJSON<unknown>(content as string, new Error('invalid-body'));
  if (renderedJson instanceof Error) throw renderedJson;
  if (contentType === 'form') {
    return new URLSearchParams(renderedJson as Record<string, string>);
  }
  if (contentType === 'form-data') {
    if (!Array.isArray(renderedJson) || !Array.isArray(renderedJson[0])) {
      throw new Error('The body must be 2D Array');
    }
    const formData = new FormData();
    for (const data of renderedJson) {
      const [name, path, customFilename] = data;
      const isFile = /\.(.*)/.test(path);
      const isURL = path.startsWith('http');
      let formContent: string | Blob = path;
      let filename: string | undefined = customFilename;
      if (isFile || isURL) {
        formContent = (await getFile(path, { returnValue: true })) as Blob;
        if (!filename) {
          filename = path.split('/').pop();
        }
        if (!formContent) throw new Error('File not found');
      } else {
        let base64Str = '';
        if (path.includes('base64')) {
          base64Str = path;
        } else {
          base64Str = `data:text/plain;base64,${window.btoa(path)}`;
        }
        const response = await fetch(base64Str);
        const result = await response.blob();
        formContent = result;
      }
      const args = [name, formContent];
      if (filename) args.push(filename);
      formData.append(...(args as Parameters<typeof formData.append>));
    }
    return formData;
  }
  return JSON.stringify(renderedJson);
};
type WebhookHeader = {
  name?: unknown;
  value?: unknown;
};
const filterHeaders = (headers?: WebhookHeader[]) => {
  const filteredHeaders: Record<string, string> = {};
  if (!headers || !Array.isArray(headers)) return filteredHeaders;
  headers.forEach((item) => {
    if (item.name && item.value) {
      filteredHeaders[item.name as string] = item.value as string;
    }
  });
  return filteredHeaders;
};
const contentTypes: Record<string, string> = {
  text: 'text/plain',
  json: 'application/json',
  'form-data': 'multipart/form-data',
  form: 'application/x-www-form-urlencoded',
};
const notHaveBody = ['GET', 'HEAD'];
export const executeWebhook = async ({
  url,
  contentType,
  headers,
  timeout,
  body,
  method,
}: {
  url: string;
  contentType?: string;
  headers?: WebhookHeader[];
  timeout?: number | string;
  body?: unknown;
  method?: string;
}) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  if (+timeout > 0) {
    controller = new AbortController();
    timeoutId = setTimeout(() => {
      controller?.abort();
    }, +timeout);
  }
  try {
    const finalHeaders = filterHeaders(headers);
    if (contentType !== 'form-data')
      finalHeaders['Content-Type'] = contentTypes[contentType || 'json'];
    const payload: RequestInit & {
      headers: Record<string, string>;
    } = {
      headers: finalHeaders,
      method: method || 'POST',
    };
    if (controller) payload.signal = controller.signal;
    if (!notHaveBody.includes(method || 'POST') && !isWhitespace(body as string)) {
      payload.body = await renderContent(body, contentType);
    }
    const response = await fetch(url, payload);
    if (timeoutId) clearTimeout(timeoutId);
    return response;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    throw error;
  }
};
