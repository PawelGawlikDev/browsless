import objectPath from 'object-path';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type IncreaseVariableBlockData = {
  variableName: string;
  increaseBy: number;
};

export async function increaseVariable(
  this: WorkflowHandlerContext,
  { id, data }: WorkflowHandlerBlock<IncreaseVariableBlockData>
) {
  const refVariables = this.engine.referenceData.variables;
  const variableExist = objectPath.has(refVariables, data.variableName);

  if (!variableExist) {
    throw new Error(`Cant find "${data.variableName}" variable`);
  }

  const currentVar = +objectPath.get(refVariables, data.variableName);
  if (Number.isNaN(currentVar)) {
    throw new Error(`The "${data.variableName}" variable value is not a number`);
  }

  objectPath.set(
    this.engine.referenceData.variables,
    data.variableName,
    currentVar + data.increaseBy
  );

  return {
    data: refVariables[data.variableName],
    nextBlockId: this.getBlockConnections(id),
  };
}

export default increaseVariable;
