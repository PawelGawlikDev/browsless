import objectPath from 'object-path';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type SliceVariableBlockData = {
  variableName: string;
  startIdxEnabled?: boolean;
  endIdxEnabled?: boolean;
  startIndex?: number;
  endIndex?: number;
};

export async function sliceData(
  this: WorkflowHandlerContext,
  { id, data }: WorkflowHandlerBlock<SliceVariableBlockData>
) {
  const variable = objectPath.get(this.engine.referenceData.variables, data.variableName);
  const payload = {
    data: variable,
    nextBlockId: this.getBlockConnections(id),
  };

  if (!variable || !variable?.slice) return payload;

  let startIndex = 0;
  let endIndex = variable.length as number;

  if (data.startIdxEnabled) {
    startIndex = data.startIndex;
  }
  if (data.endIdxEnabled) {
    endIndex = data.endIndex;
  }

  const slicedVariable = variable.slice(startIndex, endIndex);
  payload.data = slicedVariable;
  objectPath.set(this.engine.referenceData.variables, data.variableName, slicedVariable);

  return payload;
}

export default sliceData;
