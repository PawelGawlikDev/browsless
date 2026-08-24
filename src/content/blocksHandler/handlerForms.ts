import handleFormElement from '@/utils/handleFormElement';
import { sendMessage } from '@/utils/message';
import renderString from '@/workflowEngine/templating/renderString';
import handleSelector, { markElement } from '../handleSelector';
import synchronizedLock from '../synchronizedLock';
import type { SelectorBlock } from '@/types/migration-helpers';
type FormsBlock = SelectorBlock & {
  activeTabId?: number;
  refData?: Record<string, unknown>;
  data: SelectorBlock['data'] & {
    type?: string;
    value?: string;
    delay?: number;
    clearValue?: boolean;
    getValue?: boolean;
    multiple?: boolean;
  };
};
const forms = async (block: FormsBlock) => {
  const { data } = block;
  const elements = await handleSelector(block, { returnElement: true });
  if (!elements) {
    throw new Error('element-not-found');
  }
  if (data.getValue) {
    let result: string | string[] = '';
    if (data.multiple) {
      result = (Array.from(elements as Iterable<Element>) as HTMLInputElement[]).map(
        (element) => element.value || ''
      );
    } else {
      result = (elements as HTMLInputElement).value || '';
    }
    return result;
  }
  const typeText = async (rawElement: Element) => {
    const element = rawElement as HTMLInputElement;
    if (block.debugMode && data.type === 'text-field') {
      // get lock
      await synchronizedLock.getLock();
      element.focus?.();
      try {
        if (data.clearValue) {
          const backspaceCommands = new Array(element.value?.length ?? 0).fill({
            type: 'rawKeyDown',
            unmodifiedText: 'Delete',
            text: 'Delete',
            windowsVirtualKeyCode: 46,
          });
          await sendMessage(
            'debugger:type',
            { commands: backspaceCommands, tabId: block.activeTabId, delay: 0 },
            'background'
          );
        }
        const renderedResult = await renderString(data.value ?? '', block.refData ?? {});
        const textValue = String(
          (typeof renderedResult === 'string' ? renderedResult : renderedResult.value) ||
            ''
        );
        const commands = textValue.split('').map((char) => ({
          type: 'keyDown',
          text: char === '\n' ? '\r' : char,
        }));
        const typeDelay = +block.data.delay!;
        await sendMessage(
          'debugger:type',
          {
            commands,
            tabId: block.activeTabId,
            delay: Number.isNaN(typeDelay) ? 0 : typeDelay,
          },
          'background'
        );
      } finally {
        synchronizedLock.releaseLock();
      }
      return;
    }
    markElement(element, block);
    await handleFormElement(
      element as Parameters<typeof handleFormElement>[0],
      {
        ...data,
        value: data.value ?? '',
        delay: data.delay ?? 0,
      } as Parameters<typeof handleFormElement>[1]
    );
  };
  if (data.multiple) {
    const promises = Array.from(elements as Iterable<Element>).map((element) =>
      typeText(element)
    );
    await Promise.allSettled(promises);
  } else {
    await typeText(elements as Element);
  }
  return null;
};
export default forms;
