import handleSelector from '../handleSelector';
import type { SelectorBlock } from '@/types/migration-helpers';
type GetTextBlock = SelectorBlock & {
  data: SelectorBlock['data'] & {
    regex?: string;
    regexExp?: string[];
    prefixText?: string;
    suffixText?: string;
    multiple?: boolean;
    includeTags?: boolean;
    useTextContent?: boolean;
  };
};
const getText = (block: GetTextBlock) => {
  return new Promise((resolve, reject) => {
    let regex: RegExp | undefined;
    let textResult: string | string[] = [];
    const {
      regex: regexData,
      regexExp,
      prefixText,
      suffixText,
      multiple,
      includeTags,
      useTextContent,
    } = block.data;
    if (regexData) {
      regex = new RegExp(regexData, [...new Set(regexExp ?? [])].join(''));
    }
    handleSelector(block, {
      onSelected(element) {
        let text = '';
        if (includeTags) {
          text = element.outerHTML;
        } else if (useTextContent) {
          text = element.textContent ?? '';
        } else {
          text = (element as HTMLElement).innerText;
        }
        if (regex) text = text.match(regex)?.join(' ') ?? text;
        text = (prefixText || '') + text + (suffixText || '');
        if (multiple) {
          (textResult as string[]).push(text);
        } else {
          textResult = text;
        }
      },
      onError(error) {
        reject(error);
      },
      onSuccess() {
        resolve(textResult);
      },
    });
  });
};
export default getText;
