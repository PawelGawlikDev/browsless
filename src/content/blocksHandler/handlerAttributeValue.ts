import handleSelector from '../handleSelector';
import type { SelectorBlock } from '@/types/migration-helpers';
type AttributeValueBlock = SelectorBlock & {
  data: SelectorBlock['data'] & {
    attributeName?: string;
    multiple?: boolean;
    attributeValue?: string;
    action?: string;
  };
};
const handleAttributeValue = (block: AttributeValueBlock) => {
  return new Promise((resolve, reject) => {
    let result: unknown = [];
    const { attributeName = '', multiple, attributeValue, action } = block.data;
    const isCheckboxOrRadio = (rawElement: Element) => {
      const inputEl = rawElement as HTMLInputElement;
      if (inputEl.tagName !== 'INPUT') return false;
      return ['checkbox', 'radio'].includes(inputEl.getAttribute('type') ?? '');
    };
    handleSelector(block, {
      onSelected(rawElement) {
        const element = rawElement as HTMLInputElement & HTMLAnchorElement;
        if (action === 'set') {
          element.setAttribute(attributeName, attributeValue ?? '');
          return;
        }
        let value: unknown = element.getAttribute(attributeName);
        if (attributeName === 'checked' && isCheckboxOrRadio(element)) {
          value = element.checked;
        } else if (attributeName === 'href' && element.tagName === 'A') {
          value = element.href;
        }
        if (multiple) (result as unknown[]).push(value);
        else result = value;
      },
      onError(error) {
        reject(error);
      },
      onSuccess() {
        resolve(result);
      },
    });
  });
};
export default handleAttributeValue;
