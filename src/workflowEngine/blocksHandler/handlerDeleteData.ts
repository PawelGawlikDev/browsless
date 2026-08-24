import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type DeleteDataItem = {
  type?: 'table' | 'variable';
  columnId?: string;
  variableName?: string;
};

type DeleteDataBlockData = {
  deleteList: DeleteDataItem[];
};

function deleteData(
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<DeleteDataBlockData>
) {
  return new Promise<{ data: string; nextBlockId: unknown[] }>((resolve) => {
    let variableDeleted = false;

    data.deleteList.forEach((item) => {
      if (item.type === 'table') {
        if (item.columnId === '[all]') {
          this.engine.referenceData.table = [];

          Object.keys(this.engine.columns).forEach((key) => {
            this.engine.columns[key].index = 0;
          });
        } else {
          const columnName = this.engine.columns[item.columnId as string].name;

          this.engine.referenceData.table.forEach((_, index) => {
            const row = this.engine.referenceData.table[index];
            delete row[columnName];

            if (!row || Object.keys(row).length === 0) {
              this.engine.referenceData.table[index] = {};
            }
          });

          this.engine.columns[item.columnId as string].index = 0;
        }
      } else if (item.variableName) {
        delete this.engine.referenceData.variables[item.variableName];
        variableDeleted = true;
      }
    });

    if (variableDeleted) this.engine.addRefDataSnapshot('variables');

    resolve({
      data: '',
      nextBlockId: this.getBlockConnections(id),
    });
  });
}

export default deleteData;
