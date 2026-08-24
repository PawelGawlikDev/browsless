import { isXPath, objectHasKey, sleep } from '@/utils/helper';
import { sendMessage } from '@/utils/message';
import { keyDefinitions } from '@/utils/USKeyboardLayout';
import type { KeyboardDefinition } from '@/types/utils';
import { queryElements } from '../handleSelector';
const textFieldTags = ['INPUT', 'TEXTAREA'];
const modifierKeys = [
  { name: 'Alt', id: 1 },
  { name: 'Meta', id: 4 },
  { name: 'Shift', id: 8 },
  { name: 'Control', id: 2 },
];
type PressKeyArgs = {
  keys: string[];
  pressTime: number;
};
const pressKeyWithJs = async ({
  element,
  keys,
  pressTime,
}: PressKeyArgs & {
  element: HTMLElement;
}) => {
  const details = {
    key: '',
    code: '',
    keyCode: '',
    bubbles: true,
    altKey: false,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    cancelable: true,
  };
  for (const event of ['keydown', 'keyup']) {
    for (const key of keys) {
      const isLetter = /^[a-zA-Z]$/.test(key);
      const isModKey = modifierKeys.some(({ name }) => name === key);
      const dispatchEvent = () => {
        const definitions = keyDefinitions as Record<string, KeyboardDefinition>;
        const keyDefinition: KeyboardDefinition = definitions[key] || {
          key,
          keyCode: 0,
          code: isLetter ? `Key${key}` : key,
        };
        const keyboardEvent = new KeyboardEvent(event, {
          ...details,
          ...keyDefinition,
        } as KeyboardEventInit);
        element.dispatchEvent(keyboardEvent);
      };
      if (isModKey) {
        const modKey = key.charAt(0).toLowerCase() + key.slice(1);
        (details as unknown as Record<string, boolean>)[modKey] = true;
        dispatchEvent();
        return;
      }
      dispatchEvent();
      if (event !== 'keydown') return;
      const isEditable = element.isContentEditable;
      const isTextField = textFieldTags.includes(element.tagName);
      if (isEditable || isTextField) {
        const contentKey = isEditable ? 'textContent' : 'value';
        if (
          isLetter ||
          ((keyDefinitions as Record<string, KeyboardDefinition>)[key] &&
            key.length === 1)
        ) {
          if (isEditable && document.execCommand) {
            document.execCommand('insertText', false, key);
          } else {
            (element as unknown as Record<string, string>)[contentKey] += key;
          }
          return;
        }
        if (key === 'Enter') {
          const inputEl = element as HTMLInputElement;
          const isSubmitForm =
            inputEl.tagName === 'INPUT' &&
            inputEl.form &&
            !details.ctrlKey &&
            !details.altKey;
          if (isSubmitForm && inputEl.form) {
            inputEl.form.submit();
            return;
          }
          (element as unknown as Record<string, string>)[contentKey] += '\r\n';
        }
      }
      if ((event as string) === 'keyDown' && pressTime > 0) await sleep(pressTime);
    }
  }
};
const pressKeyWithCommand = async ({
  keys,
  pressTime,
  actionType,
  activeTabId,
}: PressKeyArgs & {
  actionType?: string;
  activeTabId?: number;
}) => {
  const commands: Record<string, unknown>[] = [];
  const events = actionType === 'multiple-keys' ? ['keyDown'] : ['keyDown', 'keyUp'];
  for (const event of events) {
    let modifierKey = 0;
    for (const key of keys) {
      const command = {
        tabId: activeTabId,
        method: 'Input.dispatchKeyEvent',
        params: {
          key,
          code: '',
          type: event,
          modifiers: 0,
          windowsVirtualKeyCode: 0,
        } as Record<string, unknown>,
      };
      const definition = (keyDefinitions as Record<string, KeyboardDefinition>)[key];
      if (definition) {
        Object.assign(command.params, definition);
        command.params.windowsVirtualKeyCode = definition.keyCode;
        command.params.nativeVirtualKeyCode = definition.keyCode;
        const isModKey = modifierKeys.find(({ name }) => name === key);
        if (isModKey) modifierKey = isModKey.id;
        else command.params.modifiers = modifierKey;
      }
      if (!actionType || actionType === 'press-key') {
        await sendMessage('debugger:send-command', command, 'background');
      } else {
        const secondEvent = { ...command.params };
        if (!objectHasKey(command, 'text')) {
          secondEvent.text = key;
        }
        commands.push(command.params, secondEvent);
      }
      if ((event as string) === 'keyDown' && pressTime > 0) await sleep(pressTime);
    }
  }
  if (actionType === 'multiple-keys') {
    await sendMessage('debugger:type', { commands, tabId: activeTabId }, 'background');
  }
};
const pressKey = async ({
  data,
  debugMode,
  activeTabId,
}: {
  debugMode?: boolean;
  activeTabId?: number;
  data: {
    selector?: string;
    action?: string;
    keys?: string;
    keysToPress?: string;
    pressTime?: number | string;
  };
}) => {
  let element = document.activeElement;
  if (data.selector) {
    const customElement = await queryElements(
      {
        selector: data.selector,
        findBy: isXPath(data.selector) ? 'xpath' : 'cssSelector',
      },
      document
    );
    const resolved = Array.isArray(customElement)
      ? customElement[0]
      : customElement instanceof NodeList
        ? customElement[0]
        : customElement;
    element = (resolved as HTMLElement | null | undefined) || element;
  }
  const keys =
    !data.action || data.action === 'press-key'
      ? (data.keys ?? '').split('+')
      : (data.keysToPress ?? '').split('');
  const pressKeyFunction = debugMode ? pressKeyWithCommand : pressKeyWithJs;
  await (pressKeyFunction as (args: Record<string, unknown>) => Promise<void>)({
    keys,
    element,
    activeTabId,
    actionType: data.action,
    pressTime: Number.isNaN(+(data.pressTime ?? 0))
      ? 0
      : Math.abs(+(data.pressTime ?? 0)),
  });
  return '';
};
export default pressKey;
