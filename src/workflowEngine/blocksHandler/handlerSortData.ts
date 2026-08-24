import { objectHasKey } from '@/utils/helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
  WorkflowBlockResult,
} from '@/types/workflow-engine';
type SortDataBlockData = {
  dataSource: 'table' | 'variable';
  varSourceName?: string;
  sortByProperty?: boolean;
  itemProperties?: Array<{
    name: string;
    order?: 'asc' | 'desc';
  }>;
  assignVariable?: boolean;
  variableName?: string;
  saveData?: boolean;
  dataColumn?: string;
};
const getComparisonValue = ({
  itemA,
  itemB,
  order = 'asc',
}: {
  itemA: unknown;
  itemB: unknown;
  order?: string;
}) => {
  let comparison = 0;
  if (itemA > itemB) {
    comparison = 1;
  } else if (itemA < itemB) {
    comparison = -1;
  }
  return order === 'desc' ? comparison * -1 : comparison;
};
export async function sliceData(
  this: WorkflowHandlerContext,
  { id, data }: WorkflowHandlerBlock<SortDataBlockData>
) {
  let dataToSort: unknown = null;
  if (data.dataSource === 'table') {
    dataToSort = this.engine.referenceData.table;
  } else if (data.dataSource === 'variable') {
    const { variables } = this.engine.referenceData;
    if (!objectHasKey(variables, data.varSourceName ?? '')) {
      throw new Error(`Cant find "${data.varSourceName}" variable`);
    }
    dataToSort = variables[data.varSourceName as string];
  }
  if (!Array.isArray(dataToSort)) {
    const dataType = dataToSort === null ? 'null' : typeof dataToSort;
    throw new Error(`Can't sort data with "${dataType}" data type`);
  }
  const sortableArray = dataToSort as Record<string, unknown>[];
  const sortedArray = sortableArray.sort((a, b) => {
    let comparison = 0;
    if (data.sortByProperty) {
      (data.itemProperties ?? []).forEach(({ name, order }) => {
        comparison = getComparisonValue({
          order,
          itemA: a[name] ?? a,
          itemB: b[name] ?? b,
        });
      });
    } else {
      comparison = getComparisonValue({
        itemA: a,
        itemB: b,
      });
    }
    return comparison;
  });
  if (data.assignVariable && data.variableName) {
    await this.setVariable(data.variableName, sortedArray);
  }
  if (data.saveData && data.dataColumn) {
    this.addDataToColumn(data.dataColumn, sortedArray);
  }
  const result: WorkflowBlockResult = {
    data: sortedArray,
    nextBlockId: this.getBlockConnections(id),
  };
  return result;
}
export default sliceData;
