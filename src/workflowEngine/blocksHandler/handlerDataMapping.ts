import objectPath from 'object-path';
import { objectHasKey, isObject } from '@/utils/helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
type DataMappingSource = {
  name: string;
  destinations: Array<{
    name: string;
  }>;
};
type DataMappingBlockData = {
  dataSource: 'table' | 'variable';
  varSourceName?: string;
  sources: DataMappingSource[];
  assignVariable?: boolean;
  variableName?: string;
  saveData?: boolean;
  dataColumn?: string;
};
const mapData = (data: Record<string, unknown>, sources: DataMappingSource[]) => {
  const mappedData: Record<string, unknown> = {};
  sources.forEach((source) => {
    const dataExist = objectPath.has(data, source.name);
    if (!dataExist) return;
    const value = objectPath.get(data, source.name);
    source.destinations.forEach(({ name }) => {
      objectPath.set(mappedData, name, value);
    });
  });
  return mappedData;
};
export async function dataMapping(
  this: WorkflowHandlerContext,
  { id, data }: WorkflowHandlerBlock<DataMappingBlockData>
) {
  let dataToMap: unknown = null;
  if (data.dataSource === 'table') {
    dataToMap = this.engine.referenceData.table;
  } else if (data.dataSource === 'variable') {
    const { variables } = this.engine.referenceData;
    if (!objectHasKey(variables, data.varSourceName ?? '')) {
      throw new Error(`Cant find "${data.varSourceName}" variable`);
    }
    dataToMap = variables[data.varSourceName as string];
  }
  if (!isObject(dataToMap) && !Array.isArray(dataToMap)) {
    const dataType = dataToMap === null ? 'null' : typeof dataToMap;
    throw new Error(`Can't map data with "${dataType}" data type`);
  }
  if (isObject(dataToMap)) {
    dataToMap = mapData(dataToMap as Record<string, unknown>, data.sources);
  } else {
    dataToMap = (dataToMap as unknown[]).map((item) =>
      mapData(item as Record<string, unknown>, data.sources)
    );
  }
  if (data.assignVariable && data.variableName) {
    await this.setVariable(data.variableName, dataToMap);
  }
  if (data.saveData && data.dataColumn) {
    this.addDataToColumn(data.dataColumn, dataToMap);
  }
  return {
    data: dataToMap,
    nextBlockId: this.getBlockConnections(id),
  };
}
export default dataMapping;
