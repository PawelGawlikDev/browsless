import { toCamelCase } from './helper';
type KeyboardEventLike = Pick<
  KeyboardEvent,
  'repeat' | 'shiftKey' | 'metaKey' | 'altKey' | 'ctrlKey' | 'key'
>;
const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta'];
const allowedKeys: Record<string, string> = {
  '+': 'plus',
  Delete: 'del',
  Insert: 'ins',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowUp: 'up',
  ArrowRight: 'right',
  Escape: 'escape',
  Enter: 'enter',
};
export const recordPressedKey = (
  { repeat, shiftKey, metaKey, altKey, ctrlKey, key }: KeyboardEventLike,
  callback?: (keys: string[]) => void
) => {
  if (repeat || modifierKeys.includes(key)) return;
  let pressedKey = key.length > 1 || shiftKey ? toCamelCase(key, true) : key;
  if (pressedKey === ' ') pressedKey = 'Space';
  else if (pressedKey === '+') pressedKey = 'NumpadAdd';
  const keys = [pressedKey];
  if (shiftKey) keys.unshift('Shift');
  if (metaKey) keys.unshift('Meta');
  if (altKey) keys.unshift('Alt');
  if (ctrlKey) keys.unshift('Control');
  callback?.(keys);
};
export const recordShortcut = (
  { ctrlKey, altKey, metaKey, shiftKey, key, repeat }: KeyboardEventLike,
  callback: (keys: string[]) => void
) => {
  if (repeat) return;
  const keys: string[] = [];
  if (ctrlKey || metaKey) keys.push('mod');
  if (altKey) keys.push('option');
  if (shiftKey) keys.push('shift');
  const isValidKey = !!allowedKeys[key] || /^[a-z0-9,./;'[\]\-=`]$/i.test(key);
  if (isValidKey) {
    keys.push(allowedKeys[key] || key.toLowerCase());
    callback(keys);
  }
};
