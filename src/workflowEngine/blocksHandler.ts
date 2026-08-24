import type { WorkflowHandlerRegistry } from '@/types/shared-data';
import { toCamelCase } from '@/utils/helper';
const blocksHandler = import.meta.glob('./blocksHandler/*.ts', { eager: true });
const handlers = Object.entries(blocksHandler).reduce<WorkflowHandlerRegistry>(
  (acc, [key, module]) => {
    const name = key
      .split('/')
      .at(-1)
      ?.replace(/^handler/, '')
      .replace(/\.ts$/g, '');
    if (!name) return acc;
    acc[toCamelCase(name)] = (
      module as {
        default: unknown;
      }
    ).default;
    return acc;
  },
  {}
);
const createBlocksHandler = (): WorkflowHandlerRegistry => {
  return {
    ...handlers,
  };
};
export default createBlocksHandler;
