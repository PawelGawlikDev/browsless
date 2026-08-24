import { sendMessage } from '@/utils/message';
import handleSelector from '../handleSelector';
import type { SelectorBlock } from '@/types/migration-helpers';
type UploadFileBlock = SelectorBlock & {
  data: SelectorBlock['data'] & {
    filePaths: string[];
    multiple?: boolean;
  };
};
type FetchedFile = {
  path?: string;
  objUrl: string;
  type?: string;
};
const injectFiles = (element: Element, files: FileList) => {
  const inputEl = element as HTMLInputElement;
  const notFileTypeAttr = inputEl.getAttribute('type') !== 'file';
  if (inputEl.tagName !== 'INPUT' || notFileTypeAttr) return;
  inputEl.files = files;
  inputEl.dispatchEvent(new Event('change', { bubbles: true }));
};
const getFile = async (path: string): Promise<File> => {
  if (path.includes('|') && !path.startsWith('file') && !path.startsWith('http')) {
    const [filename, mime, base64] = path.split('|');
    const response = await fetch(base64);
    const arrayBuffer = await response.arrayBuffer();
    return new File([arrayBuffer], filename, { type: mime });
  }
  const file = await sendMessage<string, FetchedFile>('get:file', path, 'background');
  const name = file?.path?.replace(/^.*[\\/]/, '') || '';
  const blob = await fetch(file.objUrl).then((response) => response.blob());
  if (file.objUrl.startsWith('blob')) URL.revokeObjectURL(file.objUrl);
  return new File([blob], name, { type: file.type ?? '' });
};
export default async function (block: UploadFileBlock) {
  const elements = await handleSelector(block, { returnElement: true });
  if (!elements) throw new Error('element-not-found');
  const filesPromises = await Promise.all(
    block.data.filePaths.map((path) => getFile(path))
  );
  const dataTransfer = filesPromises.reduce((acc, file) => {
    acc.items.add(file);
    return acc;
  }, new DataTransfer());
  const elementList = block.data.multiple
    ? Array.from(elements as Element[])
    : [elements as Element];
  elementList.forEach((element) => {
    injectFiles(element, dataTransfer.files);
  });
}
