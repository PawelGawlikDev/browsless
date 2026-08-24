import { toCamelCase } from '@/utils/helper';
import type { ContentBlockHandler } from '@/types/content';

type HandlerModule = {
  default?: ContentBlockHandler;
};

const blocksHandler = import.meta.glob<HandlerModule>('./blocksHandler/*.ts', {
  eager: true,
});
const handlers = Object.entries(blocksHandler).reduce<
  Record<string, ContentBlockHandler>
>((acc, [key, module]) => {
  const name = key
    .split('/')
    .at(-1)
    ?.replace(/^handler/, '')
    .replace(/\.ts$/g, '');

  if (!name || typeof module.default !== 'function') return acc;

  acc[toCamelCase(name)] = module.default;

  return acc;
}, {});

export default function () {
  return {
    ...handlers,
  };
}
