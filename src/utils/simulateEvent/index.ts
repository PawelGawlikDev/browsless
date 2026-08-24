import { eventList } from '../shared';
type SimulatedElement = Element &
  Partial<Record<'focus' | 'submit' | 'blur', () => void>>;
type EventInitMap =
  | EventInit
  | FocusEventInit
  | MouseEventInit
  | TouchEventInit
  | KeyboardEventInit
  | WheelEventInit
  | InputEventInit;
export const getEventObj = (name: string, params: EventInitMap = {}) => {
  const eventType = eventList.find(({ id }) => id === name)?.type ?? '';
  let event: Event;
  switch (eventType) {
    case 'mouse-event':
      event = new MouseEvent(name, { ...params, view: window });
      break;
    case 'focus-event':
      event = new FocusEvent(name, params);
      break;
    case 'touch-event':
      event = new TouchEvent(name, params);
      break;
    case 'keyboard-event':
      event = new KeyboardEvent(name, params);
      break;
    case 'wheel-event':
      event = new WheelEvent(name, params);
      break;
    case 'input-event':
      event = new InputEvent(name, params);
      break;
    default:
      event = new Event(name, params);
  }
  return event;
};
const simulateEvent = (
  element: SimulatedElement,
  name: string,
  params: EventInitMap = {}
) => {
  const event = getEventObj(name, params);
  const useNativeMethods = ['focus', 'submit', 'blur'];
  const nativeMethod = element[name as keyof SimulatedElement];
  if (useNativeMethods.includes(name) && typeof nativeMethod === 'function') {
    nativeMethod.call(element);
  } else {
    element.dispatchEvent(event);
  }
};
export default simulateEvent;
