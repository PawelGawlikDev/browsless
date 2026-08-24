import handleSelector from '../handleSelector';
import type { SelectorBlock } from '@/types/migration-helpers';
const positions: Record<string, InsertPosition> = {
  after: 'beforeend',
  before: 'afterbegin',
  'next-sibling': 'afterend',
  'prev-sibling': 'beforebegin',
};
type CreateElementBlock = SelectorBlock & {
  preloadCSS?: Array<{
    script?: string;
  }>;
  data: SelectorBlock['data'] & {
    insertAt?: string;
    html?: string;
    css?: string;
    dontInjectJS?: boolean;
    preloadScripts?: Array<{
      type: string;
      script?: string;
    }>;
    browslessScript?: string;
    javascript?: string;
  };
};
const createNode = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  content = ''
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  Object.keys(attrs).forEach((attr) => {
    element.setAttribute(attr, attrs[attr]);
  });
  element.innerHTML = content;
  return element;
};
const createElement = async (block: CreateElementBlock) => {
  const targetElement = (await handleSelector(block)) as Element | null;
  if (!targetElement) throw new Error('element-not-found');
  const { data, id } = block;
  const baseId = `browsless-${id}`;
  if (data.insertAt === 'replace') {
    const fragments = createNode('template', {}, data.html ?? '');
    targetElement.replaceWith(fragments.content);
  } else {
    targetElement.insertAdjacentHTML(
      positions[data.insertAt ?? 'after'] ?? 'beforeend',
      data.html ?? ''
    );
  }
  if (data.css) {
    const style = createNode('style', { id: `${baseId}-style` }, data.css);
    document.body.appendChild(style);
  }
  if (block.preloadCSS) {
    block.preloadCSS.forEach((styleItem) => {
      const script = document.createElement('style');
      script.id = `${baseId}-script`;
      script.textContent = styleItem.script ?? '';
      document.body.appendChild(script);
    });
  }
  if (!data?.dontInjectJS) {
    (data.preloadScripts ?? []).forEach((item) => {
      const script = document.createElement(item.type);
      script.id = `${baseId}-script`;
      script.textContent = item.script ?? '';
      document.body.appendChild(script);
    });
    const script = document.createElement('script');
    script.id = `${baseId}-javascript`;
    script.textContent = `(() => { ${data.browslessScript ?? ''}\n${data.javascript ?? ''} })()`;
    document.body.appendChild(script);
  }
  return true;
};
export default createElement;
