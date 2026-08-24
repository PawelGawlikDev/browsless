import { MessageListener } from '@/utils/message';
import { customAlphabet } from 'nanoid/non-secure';
import { browslessRefDataStr, checkCSPAndInject } from '../helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerOptions,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
const nanoid = customAlphabet('1234567890abcdef', 5);
type PreloadScriptItem = {
  type?: string;
  src: string;
};
type CreateElementBlockData = {
  javascript: string;
  runBeforeLoad?: boolean;
  dontInjectJS?: boolean;
  preloadScripts: PreloadScriptItem[];
};
const getWorkflowRuntimeScript = (refData: Record<string, unknown>) => {
  const varName = `browsless${nanoid()}`;
  const str = `
const ${varName} = ${JSON.stringify(refData)};
${browslessRefDataStr(varName)}
function browslessSetVariable(name, value) {
  const variables = ${varName}.variables;
  if (!variables) ${varName}.variables = {}

  ${varName}.variables[name] = value;
}
function browslessExecWorkflow(options = {}) {
  window.dispatchEvent(new CustomEvent('browsless:execute-workflow', { detail: options }));
}
  `;
  return str;
};
const createElementScript = (
  code: string,
  blockId: string,
  $browslessScript: string,
  $preloadScripts: Array<{
    type?: string;
    script: string;
  }>
) => {
  const str = `
    const baseId = 'browsless-${blockId}';

    ${JSON.stringify($preloadScripts)}.forEach((item) => {
      if (item.type === 'style') return;

      const script = document.createElement(item.type);
      script.id = \`\${baseId}-script\`;
      script.textContent = item.script;

      document.body.appendChild(script);
    });

    const script = document.createElement('script');
    script.id = \`\${baseId}-javascript\`;
    script.textContent = \`(() => { ${$browslessScript}\n${code} })()\`;

    document.body.appendChild(script);
  `;
  return str;
};
async function handleCreateElement(
  this: WorkflowHandlerContext,
  block: WorkflowHandlerBlock<CreateElementBlockData>,
  { refData }: WorkflowHandlerOptions
) {
  if (!this.activeTab.id) throw new Error('no-tab');
  const { data } = block;
  const preloadScriptsPromise = await Promise.allSettled(
    data.preloadScripts.map((item) => {
      if (!item.src.startsWith('http')) return Promise.reject(new Error('Invalid URL'));
      return fetch(item.src)
        .then((response) => response.text())
        .then((result) => ({ type: item.type, script: result }));
    })
  );
  const preloadScripts = preloadScriptsPromise.reduce<
    Array<{
      type?: string;
      script: string;
    }>
  >((acc, item) => {
    if (item.status === 'rejected') return acc;
    acc.push(item.value);
    return acc;
  }, []);
  data.preloadScripts = preloadScripts as unknown as PreloadScriptItem[];
  // (data.javascript || data.preloadScripts.length > 0) &&
  const payload = {
    ...block,
    data: {
      ...data,
      browslessScript: getWorkflowRuntimeScript({ ...refData, secrets: {} }),
    },
    preloadCSS: preloadScripts.filter((item) => item.type === 'style'),
  };
  payload.data.dontInjectJS = true;
  await this._sendMessageToTab(
    payload as unknown as Record<string, unknown>,
    {},
    data.runBeforeLoad ?? false
  );
  {
    const target = {
      tabId: this.activeTab.id,
      frameIds: [this.activeTab.frameId || 0],
    };
    const { debugMode = false } = this.engine.workflow?.settings || {};
    const callbackFunction = `
      function() {
        const preloadScripts = ${JSON.stringify(preloadScripts)};
        const blockId = "${block.id}";
        const browslessScript = ${JSON.stringify(payload.data?.browslessScript || '')};
        const javascript = ${JSON.stringify(data.javascript || '')};

        return \`
          \${preloadScripts.map(item => {
            if (item.type === 'style') return '';
            return \`try { eval(\${JSON.stringify(item.script)}); } catch(e) { console.error(e); }\`;
          }).join('\\n')}

          try {
            (function() {
              \${browslessScript}
              \${javascript}
            })();
          } catch(error) {
            console.error('执行JavaScript代码时出错:', error);
          }
          true;
        \`;
      }
    `;
    const result = await checkCSPAndInject(
      {
        target,
        debugMode,
        options: {
          awaitPromise: false,
          returnByValue: true,
        },
      },
      callbackFunction
    );
    if (!result.isBlocked) {
      const jsCode = createElementScript(
        data.javascript,
        block.id,
        payload.data?.browslessScript || '',
        preloadScripts || []
      );
      await MessageListener.sendMessage(
        'script:execute-callback',
        {
          target,
          callback: jsCode,
        },
        'background'
      );
    }
  }
  return {
    data: '',
    nextBlockId: this.getBlockConnections(block.id),
  };
}
export default handleCreateElement;
