import { extensionStorage } from '@/lib/extensionStorage';
import { nanoid } from 'nanoid';
import { debounce } from '@/utils/helper';
import { recordPressedKey } from '@/utils/recordKeys';
import findSelector, { finder } from '@/lib/findSelector';
import addBlockToFlow from './addBlock';
type RecordedFlow = {
  id: string;
  description?: string;
  isClickLink?: boolean;
  groupId?: string;
  data: {
    selector?: string;
    value?: unknown;
    scrollY?: number;
    scrollX?: number;
    keys?: string;
    waitForSelector?: boolean;
    description?: string;
    [key: string]: unknown;
  };
};
type RecordingStorage = {
  flows: RecordedFlow[];
} & Record<string, unknown>;
let isMainFrame = true;
const isBrowslessInstance = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return (
    el?.id === 'browsless-recording' || document.body.hasAttribute('browsless-selecting')
  );
};
const isTextFieldEl = (target: EventTarget | null) => {
  const el = target as HTMLElement | undefined | null;
  return ['INPUT', 'TEXTAREA'].includes(el?.tagName ?? '');
};
const addBlock = async (detail: Parameters<typeof addBlockToFlow>[0]) => {
  try {
    const data = await addBlockToFlow(detail, isMainFrame);
    if (!isMainFrame || !data || !data.addedBlock) {
      let frameSelector: string | null = null;
      if (window.frameElement) {
        frameSelector = finder(window.frameElement, {
          root: window.frameElement.ownerDocument as unknown as Element,
        });
      }
      window.top?.postMessage(
        {
          frameSelector,
          recording: data?.recording,
          type: 'browsless:record-events',
        },
        '*'
      );
    }
  } catch (error) {
    console.error(error);
  }
};
const onChange = ({ target }: Event) => {
  if (isBrowslessInstance(target)) return;
  const element = target as HTMLInputElement & HTMLSelectElement;
  const isInputEl = element.tagName === 'INPUT';
  const inputType = element.getAttribute('type');
  const execludeInput = isInputEl && ['checkbox', 'radio'].includes(inputType ?? '');
  if (execludeInput) return;
  let block: RecordedFlow;
  const selector = findSelector(element);
  const isSelectEl = element.tagName === 'SELECT';
  const elementName = element.ariaLabel || element.name;
  if (isInputEl && inputType === 'file') {
    block = {
      id: 'upload-file',
      description: elementName ?? '',
      data: {
        selector,
        waitForSelector: true,
        description: elementName,
        filePaths: [element.value],
      },
    };
  } else if (isSelectEl) {
    block = {
      id: 'forms',
      data: {
        selector,
        delay: 100,
        type: 'select',
        clearValue: true,
        value: element.value,
        waitForSelector: true,
        description: `Element Name (${elementName})`,
      },
    };
  } else {
    block = {
      id: 'trigger-event',
      data: {
        selector,
        eventName: 'change',
        eventType: 'event',
        waitForSelector: true,
        eventParams: { bubbles: true },
      },
    };
  }
  addBlock(((recording: RecordingStorage) => {
    const lastFlow = recording.flows.at(-1);
    if (block.id === 'upload-file' && lastFlow && lastFlow.id === 'event-click') {
      recording.flows.pop();
    }
    if (
      block.data.type === 'text-field' &&
      block.data.selector === lastFlow?.data?.selector
    )
      return null;
    recording.flows.push(block);
    return block;
  }) as never);
};
const onKeydown = async (event: KeyboardEvent) => {
  if (isBrowslessInstance(event.target) || event.repeat) return;
  const isTextField = isTextFieldEl(event.target);
  const enterKey = event.key === 'Enter';
  let isSubmitting = false;
  if (isTextField) {
    const inputEl = event.target as HTMLInputElement;
    const inputInForm = inputEl.form && inputEl.tagName === 'INPUT';
    if (enterKey && inputInForm) {
      event.preventDefault();
      await addBlock({
        id: 'forms',
        data: {
          delay: 100,
          clearValue: true,
          type: 'text-field',
          waitForSelector: true,
          value: inputEl.value,
          selector: findSelector(inputEl),
        },
      } as never);
      isSubmitting = true;
    } else {
      return;
    }
  }
  recordPressedKey(event, (keysArr: string[]) => {
    const targetEl = event.target as HTMLElement;
    const selector = isTextField && enterKey ? findSelector(targetEl) : '';
    const keys = keysArr.join('+');
    addBlock(((recording: RecordingStorage) => {
      const block: RecordedFlow = {
        id: 'press-key',
        description: `Press: ${keys}`,
        data: {
          keys,
          selector,
        },
      };
      const lastFlow = recording.flows.at(-1);
      if (lastFlow && lastFlow.id === 'press-key') {
        if (!lastFlow.groupId) lastFlow.groupId = nanoid();
        block.groupId = lastFlow.groupId;
      }
      recording.flows.push(block);
      if (isSubmitting) {
        setTimeout(() => {
          (event.target as HTMLInputElement).form?.submit();
        }, 500);
      }
      return block;
    }) as never);
  });
};
const onClick = (event: MouseEvent) => {
  const rawTarget = event.target;
  if (isBrowslessInstance(rawTarget)) return;
  const target = rawTarget as HTMLAnchorElement &
    HTMLInputElement &
    HTMLSelectElement &
    HTMLTextAreaElement;
  const isTextField =
    (target.tagName === 'INPUT' && target.getAttribute('type') === 'text') ||
    ['SELECT', 'TEXTAREA'].includes(target.tagName);
  if (isTextField) return;
  let isClickLink = false;
  const selector = findSelector(target);
  if (target.tagName === 'A') {
    if (event.ctrlKey || event.metaKey) return;
    const openInNewTab = target.getAttribute('target') === '_blank';
    isClickLink = true;
    if (openInNewTab) {
      event.preventDefault();
      const description = (target.innerText || target.href)?.slice(0, 24) || '';
      addBlock({
        id: 'link',
        description,
        data: {
          selector,
          description,
        },
      } as never);
      window.open(target.href, '_blank');
      return;
    }
  }
  const elText =
    ((target.innerText || target.ariaLabel || target.title) as string | undefined)?.slice(
      0,
      24
    ) || '';
  addBlock({
    isClickLink,
    id: 'event-click',
    description: elText,
    data: {
      selector,
      description: elText,
      waitForSelector: true,
    },
  } as never);
};
type RecordEventsMessage = {
  data: {
    type?: string;
    frameSelector?: string | null;
    recording?: RecordingStorage;
  };
  source: Window | null;
};
const onMessage = debounce(({ data, source }: MessageEvent | RecordEventsMessage) => {
  const messageData = data as RecordEventsMessage['data'];
  if (messageData.type !== 'browsless:record-events') return;
  let frameSelector: string | null | undefined = messageData.frameSelector;
  if (!frameSelector) {
    const frames = document.querySelectorAll('iframe, frame');
    frames.forEach((frame) => {
      if ((frame as HTMLIFrameElement).contentWindow !== source) return;
      frameSelector = finder(frame);
    });
  }
  if (!frameSelector) return;
  const recording = messageData.recording;
  if (!recording) return;
  const lastFlow = recording.flows.at(-1);
  if (!lastFlow) return;
  const lastIndex = recording.flows.length - 1;
  recording.flows[lastIndex].data.selector =
    `${frameSelector} |> ${lastFlow.data.selector}`;
  extensionStorage.local.set({ recording });
}, 100);
const onScroll = debounce(({ target }: Event) => {
  if (isBrowslessInstance(target)) return;
  const isDocument = target === document;
  const element = (
    isDocument ? document.documentElement : (target as HTMLElement)
  ) as HTMLElement & {
    scrollY?: number;
    scrollX?: number;
  };
  const selector = isDocument ? 'html' : findSelector(target as HTMLElement);
  addBlock(((recording: RecordingStorage) => {
    const lastFlow = recording.flows[recording.flows.length - 1];
    const verticalScroll = element.scrollTop || element.scrollY || 0;
    const horizontalScroll = element.scrollLeft || element.scrollX || 0;
    if (lastFlow && lastFlow.id === 'element-scroll') {
      lastFlow.data.scrollY = verticalScroll;
      lastFlow.data.scrollX = horizontalScroll;
      return undefined;
    }
    recording.flows.push({
      id: 'element-scroll',
      data: {
        selector,
        smooth: true,
        scrollY: verticalScroll,
        scrollX: horizontalScroll,
      },
    });
    return undefined;
  }) as never);
}, 500);
const onInputTextField = debounce(({ target }: Event) => {
  const element = target as HTMLInputElement;
  const selector = (element.dataset.browslessElSelector ??
    element.getAttribute('data-browsless-el-selector')) as string | undefined;
  if (!selector) return;
  addBlock(((recording: RecordingStorage) => {
    const lastFlow = recording.flows[recording.flows.length - 1];
    if (lastFlow && lastFlow.id === 'forms' && lastFlow.data.selector === selector) {
      lastFlow.data.value = element.value;
      return undefined;
    }
    const elementName = (element.ariaLabel || element.name || '').slice(0, 12);
    recording.flows.push({
      id: 'forms',
      data: {
        selector,
        delay: 100,
        clearValue: true,
        type: 'text-field',
        value: element.value,
        waitForSelector: true,
        description: `Text field (${elementName})`,
      },
    });
    return undefined;
  }) as never);
}, 300);
const onFocusIn = ({ target }: FocusEvent) => {
  if (!isTextFieldEl(target)) return;
  const element = target as HTMLElement;
  element.setAttribute('data-browsless-el-selector', findSelector(element));
  element.addEventListener('input', onInputTextField);
};
const onFocusOut = ({ target }: FocusEvent) => {
  if (!isTextFieldEl(target)) return;
  (target as HTMLElement).removeEventListener('input', onInputTextField);
};
export const cleanUp = () => {
  if (isMainFrame) {
    window.removeEventListener('message', onMessage as EventListener);
    document.removeEventListener('scroll', onScroll as EventListener, true);
  }
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('change', onChange, true);
  document.removeEventListener('focusin', onFocusIn, true);
  document.removeEventListener('keydown', onKeydown, true);
  document.removeEventListener('focusout', onFocusOut, true);
};
export default async function (mainFrame: boolean): Promise<() => void> {
  const storage = (await extensionStorage.local.get('isRecording')) as {
    isRecording?: boolean;
  };
  isMainFrame = mainFrame;
  if (storage.isRecording) {
    if (isMainFrame) {
      window.addEventListener('message', onMessage as EventListener);
      document.addEventListener('scroll', onScroll as EventListener, true);
    }
    if (isTextFieldEl(document.activeElement)) {
      onFocusIn({ target: document.activeElement } as unknown as FocusEvent);
    }
    document.addEventListener('click', onClick, true);
    document.addEventListener('change', onChange, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('focusout', onFocusOut, true);
  }
  return cleanUp;
}
