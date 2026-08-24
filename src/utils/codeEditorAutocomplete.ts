import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from '@codemirror/autocomplete';
import { snippet } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { CodeMirrorCompletionSource } from '@/types/editor';
const completePropertyAfter = ['PropertyName', '.', '?.'];
const excludeProps = ['chrome', 'Mousetrap'];
const completeProperties = (
  from: number,
  object: Record<string, unknown>
): CompletionResult => {
  const options: Completion[] = [];
  for (const name in object) {
    if (
      !name.startsWith('__') &&
      !name.startsWith('webpack') &&
      !excludeProps.includes(name)
    )
      options.push({
        label: name,
        type: typeof object[name] === 'function' ? 'function' : 'variable',
      });
  }
  return {
    from,
    options,
    validFor: /^[\w$]*$/,
  };
};
export const dontCompleteIn = [
  'String',
  'TemplateString',
  'LineComment',
  'BlockComment',
  'VariableDefinition',
  'PropertyDefinition',
];
export const completeFromGlobalScope = (context: CompletionContext) => {
  const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);
  if (
    completePropertyAfter.includes(nodeBefore.name) &&
    nodeBefore.parent?.name === 'MemberExpression'
  ) {
    const object = nodeBefore.parent.getChild('Expression');
    if (object?.name === 'VariableName') {
      const from = /\./.test(nodeBefore.name) ? nodeBefore.to : nodeBefore.from;
      const variableName = context.state.sliceDoc(object.from, object.to);
      const target = (window as unknown as Record<string, unknown>)[variableName];
      if (target && typeof target === 'object') {
        return completeProperties(from, target as Record<string, unknown>);
      }
    }
  } else if (nodeBefore.name === 'VariableName') {
    return completeProperties(
      nodeBefore.from,
      window as unknown as Record<string, unknown>
    );
  } else if (context.explicit && !dontCompleteIn.includes(nodeBefore.name)) {
    return completeProperties(context.pos, window as unknown as Record<string, unknown>);
  }
  return null;
};
export const browslessFuncsCompletion = (
  snippets: Completion[]
): CodeMirrorCompletionSource => {
  return function (context: CompletionContext) {
    const word = context.matchBefore(/\w*/);
    if (!word) return null;
    const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);
    if (
      (word.from === word.to && !context.explicit) ||
      dontCompleteIn.includes(nodeBefore.name)
    )
      return null;
    return {
      from: word.from,
      options: snippets,
    };
  };
};
export const browslessFuncsSnippets = {
  browslessNextBlock: {
    label: 'browslessNextBlock',
    type: 'function',
    apply: snippet('browslessNextBlock(${data})'),
    info: () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <code>browslessNextBlock(<i>data</i>, <i>insert?</i>)</code>
        <p class="mt-2">
          Execute the next block
          <a href="#" target="_blank" class="underline">
            Read more
          </a>
        </p>
      `;
      return container;
    },
  },
  browslessSetVariable: {
    label: 'browslessSetVariable',
    type: 'function',
    apply: snippet("browslessSetVariable('${name}', ${value})"),
    info: () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <code>browslessRefData(<i>name</i>, <i>value</i>)</code>
        <p class="mt-2">
          Set the value of a variable
        </p>
      `;
      return container;
    },
  },
  browslessFetch: {
    label: 'browslessFetch',
    type: 'function',
    apply: snippet("browslessFetch('${json}', { url: '${}' })"),
    info: () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <code>browslessFetch(<i>type</i>, <i>resource</i>)</code>
      `;
      return container;
    },
  },
  browslessRefData: {
    label: 'browslessRefData',
    type: 'function',
    apply: snippet("browslessRefData('${keyword}', '${path}')"),
    info: () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <code>browslessRefData(<i>keyword</i>, <i>path</i>)</code>
        <p class="mt-2">
          Use this function to
          <a href="#" target="_blank" class="underline">
            reference data
          </a>
        </p>
      `;
      return container;
    },
  },
  browslessResetTimeout: {
    label: 'browslessResetTimeout',
    type: 'function',
    info: 'Reset javascript execution timeout',
    apply: 'browslessResetTimeout()',
  },
  browslessExecWorkflow: {
    label: 'browslessExecWorkflow',
    type: 'function',
    apply: snippet("browslessExecWorkflow({ id: '${workflowId}' })"),
    info: () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <code>browslessRefData(<i>options</i>)</code>
        <p class="mt-2">
          Execute a workflow
        </p>
      `;
      return container;
    },
  },
};
