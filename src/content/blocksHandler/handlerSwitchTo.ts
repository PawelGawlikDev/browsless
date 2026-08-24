import { isXPath } from '@/utils/helper';
import handleSelector from '../handleSelector';
import type { SelectorBlock } from '@/types/migration-helpers';
const framesEl = ['IFRAME', 'FRAME'];
const switchTo = (block: SelectorBlock) => {
  return new Promise<{
    url?: string;
    isSameOrigin: boolean;
  }>((resolve, reject) => {
    block.data.findBy = isXPath(block.data.selector) ? 'xpath' : 'cssSelector';
    handleSelector(block, {
      onSelected(rawElement) {
        const element = rawElement as HTMLIFrameElement;
        if (!framesEl.includes(element.tagName)) {
          reject(new Error('not-iframe'));
          return;
        }
        const isSameOrigin = element.contentDocument !== null;
        resolve({ url: element.src, isSameOrigin });
      },
      onError(error) {
        reject(error);
      },
    });
  });
};
export default switchTo;
