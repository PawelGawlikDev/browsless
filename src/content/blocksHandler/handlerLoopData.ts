import { nanoid } from 'nanoid';
import handleSelector from '../handleSelector';
import { generateLoopSelectors } from '../utils';
import type { SelectorBlock } from '@/types/migration-helpers';
type LoopDataContentBlock = SelectorBlock & {
  onlyGenerate?: boolean;
  data: SelectorBlock['data'] & {
    $frameSelector?: string;
    loopId?: string;
  };
};
const loopElements = async (block: LoopDataContentBlock) => {
  const elements = (await handleSelector(block)) as Iterable<Element>;
  if (!elements) throw new Error('element-not-found');
  let frameSelector = '';
  if (block.data.$frameSelector) {
    frameSelector = `${block.data.$frameSelector} |> `;
  }
  if (block.onlyGenerate) {
    generateLoopSelectors(elements, {
      ...block.data,
      frameSelector,
      attrId: block.data.loopId ?? '',
    } as unknown as Parameters<typeof generateLoopSelectors>[1]);
    return {};
  }
  const attrId = `${block.id}-${nanoid(5)}`;
  const selectors = generateLoopSelectors(elements, {
    ...block.data,
    frameSelector,
    attrId,
  } as unknown as Parameters<typeof generateLoopSelectors>[1]);
  const { origin, pathname } = window.location;
  return {
    loopId: attrId,
    elements: selectors,
    url: origin + pathname,
  };
};
export default loopElements;
