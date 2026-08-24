import dbLogs, { defaultLogItem } from '@/db/logs';
import type { DbLogItem } from '@/types/db';

type WorkflowLoggerPayload = {
  detail: Partial<DbLogItem>;
  history: Record<string, unknown>;
  ctxData: Record<string, unknown>;
  data: Record<string, unknown>;
};

class WorkflowLogger {
  async add({ detail, history, ctxData, data }: WorkflowLoggerPayload) {
    const logDetail = { ...defaultLogItem, ...detail };

    const logsDb = dbLogs as typeof dbLogs & {
      logsData: { add: (value: Record<string, unknown>) => Promise<unknown> };
      ctxData: { add: (value: Record<string, unknown>) => Promise<unknown> };
      items: { add: (value: DbLogItem) => Promise<unknown> };
      histories: { add: (value: Record<string, unknown>) => Promise<unknown> };
    };

    await Promise.all([
      logsDb.logsData.add(data),
      logsDb.ctxData.add(ctxData),
      logsDb.items.add(logDetail),
      logsDb.histories.add(history),
    ]);
  }
}

export default WorkflowLogger;
