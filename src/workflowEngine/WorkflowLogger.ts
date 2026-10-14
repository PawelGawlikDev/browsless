import dbLogs, { defaultLogItem } from '@/db/logs';
import type { DbLogAuxRecord, DbLogItem } from '@/types/db';

type WorkflowLoggerPayload = {
  detail: Partial<DbLogItem>;
  history: DbLogAuxRecord;
  ctxData: DbLogAuxRecord;
  data: DbLogAuxRecord;
};

class WorkflowLogger {
  async add({ detail, history, ctxData, data }: WorkflowLoggerPayload) {
    const logDetail = { ...defaultLogItem, ...detail };

    await Promise.all([
      dbLogs.logsData.add(data),
      dbLogs.ctxData.add(ctxData),
      dbLogs.items.add(logDetail),
      dbLogs.histories.add(history),
    ]);
  }
}

export default WorkflowLogger;
