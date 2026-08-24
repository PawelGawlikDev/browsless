import { customAlphabet } from 'nanoid/non-secure';
import { visibleInViewport, isXPath } from '@/utils/helper';
import { browslessRefDataStr } from '@/workflowEngine/helper';
import handleSelector from '../handleSelector';
import type { SelectorBlock } from '@/types/migration-helpers';
const nanoid = customAlphabet('1234567890abcdef', 5);
type ConditionElementBlock = {
  type?: string;
  id?: string;
  frameSelector?: string | null;
  data: SelectorBlock['data'] & {
    code?: string;
  };
};
type ConditionCodeBlock = {
  data: {
    code: string;
  };
  refData: Record<string, unknown>;
};
const handleConditionElement = async (block: ConditionElementBlock) => {
  const selectorType = isXPath(block.data.selector) ? 'xpath' : 'cssSelector';
  const element = (await handleSelector({
    id: block.id,
    data: {
      ...block.data,
      findBy: selectorType,
    },
    frameSelector: block.frameSelector,
  })) as HTMLElement | null;
  const [, actionType = ''] = (block.type ?? '').split('#');
  const elementActions: Record<string, (data: Record<string, unknown>) => unknown> = {
    exists: () => Boolean(element),
    notExists: () => !element,
    text: () => element?.innerText ?? null,
    visibleScreen: () => {
      if (!element) return false;
      return visibleInViewport(element);
    },
    visible: () => {
      if (!element) return false;
      const { visibility, display } = getComputedStyle(element);
      return visibility !== 'hidden' && display !== 'none';
    },
    invisible: () => {
      if (!element) return false;
      const { visibility, display } = getComputedStyle(element);
      const styleHidden = visibility === 'hidden' || display === 'none';
      return styleHidden || !visibleInViewport(element);
    },
    attribute: ({ attrName }) => {
      if (!element || !(attrName && element.hasAttribute(String(attrName)))) return null;
      return element.getAttribute(String(attrName));
    },
  };
  return elementActions[actionType]?.(block.data as Record<string, unknown>);
};
const handleConditionCode = ({ data, refData }: ConditionCodeBlock) => {
  return new Promise((resolve, reject) => {
    const varName = `browsless${nanoid()}`;
    const scriptEl = document.createElement('script');
    scriptEl.textContent = `
      (async () => {
        const ${varName} = ${JSON.stringify(refData)};
        ${browslessRefDataStr(varName)}
        try {
          ${data.code}
        } catch (error) {
          return {
            $isError: true,
            message: error.message,
          }
        }
      })()
        .then((detail) => {
          window.dispatchEvent(new CustomEvent('__browsless-condition-code__', { detail }));
        });
    `;
    document.body.appendChild(scriptEl);
    const handleConditionEvent = ({ detail }: CustomEventInit) => {
      scriptEl.remove();
      window.removeEventListener('__browsless-condition-code__', handleConditionEvent);
      const result = detail as
        | {
            $isError?: boolean;
            message?: string;
          }
        | undefined;
      if (result?.$isError) {
        reject(new Error(result.message ?? 'condition-code-error'));
        return;
      }
      resolve(detail);
    };
    window.addEventListener(
      '__browsless-condition-code__',
      handleConditionEvent as EventListener
    );
  });
};
export default async function (block: ConditionElementBlock & ConditionCodeBlock) {
  let result: unknown = null;
  if ((block.type ?? '').startsWith('element')) {
    result = await handleConditionElement(block);
  } else if ((block.type ?? '').startsWith('code')) {
    result = await handleConditionCode(block);
  }
  return result;
}
