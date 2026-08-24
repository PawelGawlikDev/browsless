import { sendMessage } from '@/utils/message';
import simulateEvent from '@/utils/simulateEvent';
import simulateMouseEvent from '@/utils/simulateEvent/mouseEvent';
import { keyDefinitions } from '@/utils/USKeyboardLayout';
import type { KeyboardDefinition } from '@/types/utils';
import { getElementPosition } from '../utils';
import handleSelector from '../handleSelector';
import type { SelectorBlock } from '@/types/migration-helpers';
const modifiers: Record<string, number> = {
  altKey: 1,
  ctrlKey: 2,
  metKey: 3,
  shiftKey: 4,
};
type TriggerEventParams = Record<string, any>;
type SendCommandFn = (
  method: string,
  params?: Record<string, unknown>
) => Promise<unknown>;
const eventHandlers: Record<
  string,
  (args: {
    element?: Element;
    sendCommand: SendCommandFn;
    name?: string;
    params: TriggerEventParams;
  }) => Promise<void>
> = {
  'mouse-event': async ({ params, sendCommand, name }) => {
    const mouseButtons: Record<
      number,
      {
        id: number;
        name: string;
      }
    > = {
      0: { id: 1, name: 'left' },
      1: { id: 4, name: 'middle' },
      2: { id: 2, name: 'right' },
    };
    const commandParams: Record<string, unknown> = {
      button: mouseButtons[params.button]?.name || 'left',
    };
    if (params.clientX) commandParams.x = +params.clientX;
    if (params.clientY) commandParams.y = +params.clientY;
    Object.keys(modifiers).forEach((key) => {
      if (commandParams.modifiers) return;
      if (params[key]) commandParams.modifiers = modifiers[key];
    });
    const mouseEvents = simulateMouseEvent({
      sendCommand,
      commandParams,
    } as unknown as Parameters<typeof simulateMouseEvent>[0]);
    const eventHandler: Record<string, string> = {
      mouseover: 'mouseenter',
      mouseout: 'mouseleave',
    };
    const eventName = eventHandler[name ?? ''] || name;
    await mouseEvents[eventName!]();
  },
  'keyboard-event': async ({ name, params, sendCommand }) => {
    const definition = (keyDefinitions as Record<string, KeyboardDefinition>)[
      params?.key
    ] as KeyboardDefinition | undefined;
    const commandParams: Record<string, unknown> = {
      key: params.key ?? '',
      code: params.code ?? '',
      autoRepeat: params.repeat,
      windowsVirtualKeyCode: params.keyCode ?? 0,
      type: name === 'keyup' ? 'keyUp' : 'keyDown',
    };
    if (params.key && (definition?.text || params.key.length === 1)) {
      commandParams.text = definition?.text || params.key;
    }
    Object.keys(modifiers).forEach((key) => {
      if (commandParams.modifiers) return;
      if (params[key]) commandParams.modifiers = modifiers[key];
    });
    await sendCommand('Input.dispatchKeyEvent', commandParams);
  },
};
const triggerEvent = ({
  data,
  id,
  frameSelector,
  debugMode,
  activeTabId,
}: SelectorBlock & {
  activeTabId?: number;
  data: SelectorBlock['data'] & {
    eventType?: string;
    eventName?: string;
    eventParams?: TriggerEventParams;
  };
}) => {
  return new Promise<string | null>((resolve, reject) => {
    handleSelector(
      { data, id, frameSelector },
      {
        async onSelected(element) {
          const eventHandler = eventHandlers[data.eventType ?? ''];
          if (debugMode && eventHandler) {
            let elCoordinate: Record<string, unknown> = {};
            if (data.eventType === 'mouse-event') {
              const { x, y } = await getElementPosition(element);
              elCoordinate = { x, y };
            }
            const sendCommand: SendCommandFn = (method, params = {}) => {
              const payload = {
                method,
                params: {
                  ...elCoordinate,
                  ...params,
                },
                tabId: activeTabId,
              };
              return sendMessage('debugger:send-command', payload, 'background');
            };
            await eventHandler({
              element,
              sendCommand,
              name: data.eventName,
              params: data.eventParams ?? {},
            });
            return;
          }
          simulateEvent(element, data.eventName ?? '', data.eventParams ?? {});
        },
        onSuccess() {
          resolve(data.eventName ?? '');
        },
        onError(error) {
          reject(error);
        },
      }
    );
    resolve(data.eventName ?? '');
  });
};
export default triggerEvent;
