import { reactive, onMounted } from 'vue';
import { getBlocks } from '@/utils/getSharedData';
import { categories } from '@/utils/shared';
import type { SharedBlockDefinition } from '@/types/shared-data';
type BlockCategory = {
  name?: string;
  border?: string;
  color?: string;
  [key: string]: unknown;
};
type EditorBlockState = {
  details: SharedBlockDefinition & {
    id?: string;
  };
  category: BlockCategory;
};
const generalCategory = ((categories as Record<string, BlockCategory>).general ??
  {}) as BlockCategory;
export const useEditorBlock = (label?: string) => {
  const blocks = getBlocks();
  const block = reactive<EditorBlockState>({
    details: {},
    category: {},
  });
  onMounted(() => {
    if (!label) return;
    const details = blocks[label];
    if (!details) {
      block.details = { id: label, name: label };
      block.category = generalCategory;
      return;
    }
    block.details = { id: label, ...details };
    const categoryKey =
      typeof details.category === 'string' ? details.category : 'general';
    block.category = ((categories as Record<string, BlockCategory>)[categoryKey] ??
      generalCategory) as BlockCategory;
  });
  return block;
};
