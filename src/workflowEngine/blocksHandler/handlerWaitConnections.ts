import type {
  WorkflowHandlerBlock,
  WorkflowHandlerOptions,
  WorkflowHandlerContext,
  WorkflowBlockResult,
} from '@/types/workflow-engine';

type WaitConnectionsBlockData = {
  timeout: number;
  specificFlow?: boolean;
  flowBlockId?: string;
};

async function waitConnections(
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<WaitConnectionsBlockData>,
  { prevBlock }: WorkflowHandlerOptions
) {
  return new Promise<WorkflowBlockResult>((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout>;
    let resolved = false;

    const nextBlockId = this.getBlockConnections(id);
    const prevBlockId = (prevBlock as { id?: string } | null | undefined)?.id;
    const destroyWorker = Boolean(data.specificFlow) && prevBlockId !== data.flowBlockId;

    const registerConnections = () => {
      const connections = this.engine.connectionsMap;
      Object.keys(connections).forEach((key) => {
        const isConnected = [...connections[key].values()].some(
          (connection) => connection.id === id
        );

        if (!isConnected) return;

        const index = key.indexOf('-output');
        const sourceBlockId = key.slice(0, index === -1 ? key.length : index);
        if (!this.engine.waitConnections[id]) this.engine.waitConnections[id] = {};
        this.engine.waitConnections[id][sourceBlockId] = {
          isHere: false,
          isContinue: false,
        };
      });
    };
    const checkConnections = () => {
      if (resolved) return;

      const state = Object.values(this.engine.waitConnections[id]);
      const isAllHere = state.every((worker) => worker.isHere);

      if (isAllHere) {
        if (prevBlockId) this.engine.waitConnections[id][prevBlockId].isContinue = true;
        const allContinue = state.every((worker) => worker.isContinue);

        if (allContinue) {
          registerConnections();
        }

        clearTimeout(timeout);

        if (data.specificFlow && data.flowBlockId) {
          const connectionExist = Object.keys(this.engine.waitConnections[id]).includes(
            data.flowBlockId
          );

          if (!connectionExist) {
            reject(new Error(`No specific flow selected`));
            return;
          }
        }

        resolve({
          data: '',
          nextBlockId,
          destroyWorker,
        });
      } else {
        setTimeout(() => {
          checkConnections();
        }, 1000);
      }
    };

    if (!this.engine.waitConnections[id]) {
      this.engine.waitConnections[id] = {};

      registerConnections();
    }

    if (prevBlockId) {
      if (!this.engine.waitConnections[id][prevBlockId]) {
        this.engine.waitConnections[id][prevBlockId] = {
          isHere: false,
          isContinue: false,
        };
      }
      this.engine.waitConnections[id][prevBlockId].isHere = true;
    }

    timeout = setTimeout(() => {
      resolved = true;

      resolve({
        data: '',
        nextBlockId,
        destroyWorker,
      });
    }, data.timeout);

    checkConnections();
  });
}

export default waitConnections;
