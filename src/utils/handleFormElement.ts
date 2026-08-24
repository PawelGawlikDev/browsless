import { sleep } from '@/utils/helper';
import type { KeyboardDefinition } from '@/types/utils';
import { keyDefinitions } from '@/utils/USKeyboardLayout';
import simulateEvent from './simulateEvent';
type FormElementData = {
  type: 'text-field' | 'checkbox' | 'radio' | 'select' | string;
  value: string;
  delay: number;
  clearValue?: boolean;
  selected?: boolean;
  selectOptionBy?: 'first-option' | 'last-option' | 'custom-position' | string;
  optionPosition?: string | number;
};
type ReactValueTracker = {
  setValue: (value: string) => void;
};
type ReactInputElement = HTMLInputElement & {
  _valueTracker?: ReactValueTracker;
};
type TextEditableElement = HTMLInputElement | HTMLTextAreaElement | HTMLElement;
type SupportedFormElement =
  ReactInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement;
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  'value'
)?.set;
const reactJsEvent = (element: ReactInputElement, value: string) => {
  if (!element._valueTracker) return;
  const previousValue = element.value;
  nativeInputValueSetter?.call(element, value);
  element._valueTracker.setValue(previousValue);
};
const formEvent = (
  element: HTMLElement,
  data: Pick<FormElementData, 'type' | 'value'>
) => {
  if (data.type === 'text-field') {
    const currentKey = /\s/.test(data.value) ? 'Space' : data.value;
    const definition: KeyboardDefinition = keyDefinitions[currentKey] || {
      key: currentKey,
      keyCode: 0,
      code: `Key${currentKey}`,
    };
    const { key, keyCode = 0, code = `Key${currentKey}` } = definition;
    simulateEvent(element, 'input', {
      inputType: 'insertText',
      data: data.value,
      bubbles: true,
      cancelable: true,
    });
    simulateEvent(element, 'keydown', {
      key,
      code,
      keyCode,
      bubbles: true,
      cancelable: true,
    });
    simulateEvent(element, 'keyup', {
      key,
      code,
      keyCode,
      bubbles: true,
      cancelable: true,
    });
  }
  simulateEvent(element, 'input', {
    inputType: 'insertText',
    data: data.value,
    bubbles: true,
    cancelable: true,
  });
  if (data.type !== 'text-field') {
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  }
};
const inputText = async ({
  data,
  element,
  isEditable = false,
}: {
  data: FormElementData;
  element: TextEditableElement;
  isEditable?: boolean;
}) => {
  element?.focus();
  element?.click();
  const elementKey = isEditable ? 'textContent' : 'value';
  if (data.delay > 0 && !document.hidden) {
    for (let index = 0; index < data.value.length; index += 1) {
      if (elementKey === 'value' && 'value' in element) {
        reactJsEvent(element as ReactInputElement, element.value);
      }
      const currentChar = data.value[index];
      element[elementKey] = `${element[elementKey] ?? ''}${currentChar}`;
      formEvent(element, {
        type: 'text-field',
        value: currentChar,
      });
      await sleep(data.delay);
    }
  } else {
    if (elementKey === 'value' && 'value' in element) {
      reactJsEvent(element as ReactInputElement, element.value);
    }
    element[elementKey] = `${element[elementKey] ?? ''}${data.value}`;
    formEvent(element, {
      type: 'text-field',
      value: data.value[0] ?? '',
    });
  }
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  element?.blur();
};
export default async function (element: SupportedFormElement, data: FormElementData) {
  const textFields = ['INPUT', 'TEXTAREA'];
  const isEditable = element.hasAttribute('contenteditable') && element.isContentEditable;
  if (isEditable) {
    if (data.clearValue) element.innerText = '';
    await inputText({ data, element, isEditable });
    return;
  }
  if (data.type === 'text-field' && textFields.includes(element.tagName)) {
    if (data.clearValue) {
      if ('select' in element && typeof element.select === 'function') {
        element.select();
      }
      if ('value' in element) {
        reactJsEvent(element as ReactInputElement, '');
        element.value = '';
      }
    }
    await inputText({ data, element: element as TextEditableElement });
    return;
  }
  element?.focus();
  if (data.type === 'checkbox' || data.type === 'radio') {
    if ('checked' in element) {
      element.checked = Boolean(data.selected);
      formEvent(element, { type: data.type, value: String(Boolean(data.selected)) });
    }
  } else if (data.type === 'select') {
    let optionValue = data.value;
    if (!(element instanceof HTMLSelectElement)) {
      element?.blur();
      return;
    }
    const options = element.querySelectorAll('option');
    const getOptionValue = (index) => {
      if (!options) return element.value;
      let optionIndex = index;
      const maxIndex = options.length - 1;
      if (index < 0) optionIndex = 0;
      else if (index > maxIndex) optionIndex = maxIndex;
      return options[optionIndex]?.value || element.value;
    };
    switch (data.selectOptionBy) {
      case 'first-option':
        optionValue = getOptionValue(0);
        break;
      case 'last-option':
        optionValue = getOptionValue(options.length - 1);
        break;
      case 'custom-position':
        optionValue = getOptionValue(+data.optionPosition - 1);
        break;
      default:
    }
    if (optionValue) {
      element.value = optionValue;
      formEvent(element, data);
    }
  }
  element?.blur();
}
