import { jsContentHandler } from '@/workflowEngine/utils/javascriptBlockUtil';
import { getDocumentCtx } from '../handleSelector';
import type { SelectorBlock } from '@/types/migration-helpers';
type JavascriptCodeContentBlock = SelectorBlock & {
  isPreloadScripts?: boolean;
  data:
    | unknown[]
    | (SelectorBlock['data'] & {
        scripts?: Array<{
          id: string;
          data: {
            code: string;
          };
        }>;
      });
};
const javascriptCode = ({
  data,
  isPreloadScripts,
  frameSelector,
}: JavascriptCodeContentBlock) => {
  if (!isPreloadScripts && Array.isArray(data))
    return (jsContentHandler as (...args: unknown[]) => Promise<unknown>)(...data);
  const blockData = data as NonNullable<JavascriptCodeContentBlock['data']> & {
    scripts?: Array<{
      id: string;
      data: {
        code: string;
      };
    }>;
  };
  if (!blockData.scripts) return Promise.resolve({ success: true });
  let $documentCtx = document;
  if (frameSelector) {
    const iframeCtx = getDocumentCtx(frameSelector);
    if (!iframeCtx) return Promise.resolve({ success: false });
    $documentCtx = iframeCtx;
  }
  blockData.scripts.forEach((script) => {
    const scriptAttr = `block--${script.id}`;
    const isScriptExists = $documentCtx.querySelector(
      `.browsless-custom-js[${scriptAttr}]`
    );
    if (isScriptExists) return;
    const scriptEl = $documentCtx.createElement('script');
    scriptEl.textContent = script.data.code;
    scriptEl.setAttribute(scriptAttr, '');
    scriptEl.classList.add('browsless-custom-js');
    $documentCtx.documentElement.appendChild(scriptEl);
  });
  return Promise.resolve({ success: true });
};
export default javascriptCode;
