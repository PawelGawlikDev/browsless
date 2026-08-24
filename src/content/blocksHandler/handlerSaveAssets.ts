import handleSelector from '../handleSelector';
import type { SelectorBlock } from '@/types/migration-helpers';
type AssetElement = HTMLElement & {
  src?: string;
  tagName: string;
};
const saveAssets = async (block: SelectorBlock) => {
  const elements = await handleSelector(block, { returnElement: true });
  if (!elements) {
    throw new Error('element-not-found');
  }
  const elementList = (
    block.data.multiple ? Array.from(elements as Element[]) : [elements as Element]
  ) as AssetElement[];
  const srcList = elementList.reduce<string[]>((acc, element) => {
    const tag = element.tagName;
    if (
      (tag === 'AUDIO' || tag === 'VIDEO') &&
      !(
        tag as unknown as {
          src?: string;
        }
      ).src
    ) {
      const sourceEl = element.querySelector('source');
      if (sourceEl && sourceEl.src) acc.push(sourceEl.src);
    } else if (element.src) {
      acc.push(element.src);
    }
    return acc;
  }, []);
  return srcList;
};
export default saveAssets;
