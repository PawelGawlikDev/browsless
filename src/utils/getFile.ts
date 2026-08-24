import type { FileRequestOptions, FileResult, LocalFileResult } from '@/types/utils';
export const readFileAsBase64 = (blob: Blob) => {
  return new Promise<string | ArrayBuffer | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
};
const downloadFile = async (url: string, options: FileRequestOptions) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.statusText);
  const type = options.responseType || 'blob';
  const result = await response[type]();
  if (options.returnValue) {
    return result;
  }
  if (URL.createObjectURL) {
    const objUrl = URL.createObjectURL(result);
    return { objUrl, path: url, type: result.type } as FileResult;
  }
  const base64 = await readFileAsBase64(result);
  return { path: url, objUrl: String(base64), type: result.type } as FileResult;
};
const toXhrResponseType = (
  type: FileRequestOptions['responseType']
): XMLHttpRequestResponseType => {
  if (type === 'arrayBuffer') return 'arraybuffer';
  if (type === 'json' || type === 'text') return type;
  return 'blob';
};
const getLocalFile = (path: string, options: FileRequestOptions) => {
  return new Promise<LocalFileResult>((resolve, reject) => {
    const isFile = /\.(.*)/.test(path);
    if (!isFile) {
      reject(new Error(`"${path}" is invalid file path.`));
      return;
    }
    const fileUrl = path?.startsWith('file://') ? path : `file://${path}`;
    if ('XMLHttpRequest' in self) {
      const xhr = new XMLHttpRequest();
      xhr.responseType = toXhrResponseType(options.responseType);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 0 || xhr.status === 200) {
            if (options.returnValue) {
              resolve(xhr.response);
              return;
            }
            const objUrl = URL.createObjectURL(xhr.response);
            resolve({ path, objUrl, type: xhr.response.type });
          } else {
            reject(new Error(xhr.statusText));
          }
        }
      };
      xhr.onerror = function () {
        reject(new Error(xhr.statusText || `Can't find a file with "${path}" path`));
      };
      xhr.open('GET', fileUrl);
      xhr.send();
    } else {
      (async () => {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(response.statusText);
        if (options.returnValue) {
          resolve(await response.text());
          return;
        }
        const blob = await response.blob();
        if (URL.createObjectURL) {
          const objUrl = URL.createObjectURL(blob);
          resolve({ path, objUrl, type: blob.type });
        } else {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({ path, objUrl: String(reader.result), type: blob.type });
          };
          reader.readAsDataURL(blob);
        }
      })().catch(reject);
    }
  });
};
const getFile = (path: string, options: FileRequestOptions = {}) => {
  if (path.startsWith('http')) return downloadFile(path, options);
  return getLocalFile(path, options);
};
export default getFile;
