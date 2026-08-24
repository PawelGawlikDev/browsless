import type { SharedBlocksMap } from '@/types/shared-data';
import { tasks } from './shared';
export const getBlocks = (): SharedBlocksMap => {
  return { ...(tasks as SharedBlocksMap) };
};
