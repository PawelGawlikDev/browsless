import objectPath from 'object-path';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type RegexVariableBlockData = {
  variableName: string;
  method?: 'match' | 'replace';
  expression: string;
  flag: string[];
  replaceVal?: string;
};

export async function regexVariable(
  this: WorkflowHandlerContext,
  { id, data }: WorkflowHandlerBlock<RegexVariableBlockData>
) {
  const refVariables = this.engine.referenceData.variables;
  const variableExist = objectPath.has(refVariables, data.variableName);

  if (!variableExist) {
    throw new Error(`Cant find "${data.variableName}" variable`);
  }

  const str = objectPath.get(refVariables, data.variableName);
  if (typeof str !== 'string') {
    throw new Error(
      `The value of the "${data.variableName}" variable is not a string/text`
    );
  }

  const method = data.method || 'match';
  const regex = new RegExp(data.expression, data.flag.join(''));

  let newValue: string | string[] | null = '';

  if (method === 'match') {
    const matches = str.match(regex);
    newValue = matches && !data.flag.includes('g') ? matches[0] : matches;
  } else if (method === 'replace') {
    newValue = str.replace(regex, data.replaceVal ?? '');
  }

  objectPath.set(this.engine.referenceData.variables, data.variableName, newValue);

  return {
    data: newValue,
    nextBlockId: this.getBlockConnections(id),
  };
}

export default regexVariable;
