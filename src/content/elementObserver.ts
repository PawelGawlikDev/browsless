import { extensionStorage } from '@/lib/extensionStorage';
import { isXPath, debounce } from '@/utils/helper';
import { sendMessage } from '@/utils/message';
import FindElement from '@/utils/FindElement';
import type {
  ContentElementChangeTrigger,
  ContentObserverOptions,
  ContentWorkflow,
} from '@/types/content';
type ObservedElementEntry = {
  id: string;
  selector: string;
  options: ContentObserverOptions;
  workflow: ContentWorkflow;
};
type ObserveTargetParams = {
  selector: string;
  observer: MutationObserver;
  options: ContentObserverOptions;
  id?: string;
};
const observeElements: Record<string, ObservedElementEntry> = {};
const targetMutationCallback = debounce((records: MutationRecord[]) => {
  const [mutation] = records;
  const target = mutation?.target;
  if (!(target instanceof Element)) return;
  let workflowId = target.getAttribute('browsless-id');
  if (!workflowId) {
    const element = target.closest('[browsless-id]');
    if (!element) return;
    workflowId = element.getAttribute('browsless-id');
  }
  if (!observeElements[workflowId]) return;
  const { workflow } = observeElements[workflowId];
  workflow.includeTabId = true;
  sendMessage('workflow:execute', workflow, 'background');
}, 250);
const targetObserver = new MutationObserver(targetMutationCallback);
const baseMutationCallback = debounce(() => {
  targetObserver.disconnect();
  Object.values(observeElements).forEach((detail) => {
    tryObserve({ ...detail, observer: targetObserver });
  });
}, 250);
const baseObserver = new MutationObserver(baseMutationCallback);
export const matchPatternToRegex = (str) => {
  const regexStr = str.replace(/[*?^$]/g, (char) => {
    if (char === '*') return '[a-zA-Z0-9]*';
    return `\\${char}`;
  });
  const regex = new RegExp(regexStr);
  return regex;
};
const tryObserve = ({ selector, observer, options, id }: ObserveTargetParams) => {
  let tryCount = 0;
  const findElement = () => {
    if (tryCount > 10) return;
    const selectorType = isXPath(selector) ? 'xpath' : 'cssSelector';
    const element = FindElement[selectorType]({ selector });
    if (!(element instanceof Element)) {
      tryCount += 1;
      setTimeout(findElement, 1000);
      return;
    }
    if (id) element.setAttribute('browsless-id', id);
    if (!options.attributes || options.attributeFilter?.length === 0) {
      delete options.attributeFilter;
    }
    observer.observe(element, options);
  };
  findElement();
};
export default async function () {
  const { workflows } = (await extensionStorage.local.get('workflows')) as {
    workflows?: ContentWorkflow[];
  };
  workflows?.forEach((workflow: ContentWorkflow) => {
    const { trigger, id, ...workflowDetail } = workflow;
    const typedTrigger = trigger as ContentElementChangeTrigger | undefined;
    if (
      !typedTrigger ||
      typedTrigger.type !== 'element-change' ||
      !typedTrigger.observeElement?.selector ||
      !typedTrigger.observeElement?.matchPattern
    )
      return;
    const { baseSelector, baseElOptions, selector, targetOptions, matchPattern } =
      typedTrigger.observeElement;
    const regex = matchPatternToRegex(matchPattern);
    if (!regex.test(window.location.href)) return;
    if (baseSelector)
      tryObserve({
        selector: baseSelector,
        options: baseElOptions,
        observer: baseObserver,
      });
    const workflowId = String(id);
    observeElements[workflowId] = {
      id: workflowId,
      selector,
      options: targetOptions,
      workflow: { id: workflowId, trigger: typedTrigger, ...workflowDetail },
    };
    tryObserve({
      selector,
      options: targetOptions,
      observer: targetObserver,
      id: workflowId,
    });
  });
}
