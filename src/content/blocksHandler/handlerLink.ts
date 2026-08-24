import handleSelector, { markElement } from '../handleSelector';
import type { SelectorBlock } from '@/types/migration-helpers';
const link = async (block: SelectorBlock) => {
  const element = await handleSelector(block, { returnElement: true });
  if (!element) {
    throw new Error('element-not-found');
  }
  const anchorEl = element as HTMLAnchorElement;
  if (anchorEl.tagName !== 'A') {
    throw new Error('Element is not a link');
  }
  markElement(anchorEl, block);
  const url = anchorEl.href;
  if (url && !block.data.openInNewTab) window.open(url, '_self');
  return url;
};
export default link;
