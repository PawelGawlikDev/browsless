import dbLogs from '@/db/logs';
import { extensionStorage } from '@/lib/extensionStorage';

type LegacyLogItem = {
  id: string;
  data?: unknown;
  history?: unknown;
  [key: string]: unknown;
};

type LogsDatabase = typeof dbLogs & {
  items: { bulkAdd: (items: Array<Record<string, unknown>>) => Promise<unknown> };
  ctxData: {
    bulkAdd: (items: Array<{ logId: string; data: unknown }>) => Promise<unknown>;
  };
  logsData: {
    bulkAdd: (items: Array<{ logId: string; data: unknown }>) => Promise<unknown>;
  };
  histories: {
    bulkAdd: (items: Array<{ logId: string; data: unknown }>) => Promise<unknown>;
  };
};

export default async function () {
  try {
    const { logs, logsCtxData, migration } = await extensionStorage.local.get([
      'logs',
      'migration',
      'logsCtxData',
    ]);
    const hasMigrated = (migration as Record<string, boolean> | null) || {};
    const backupData: Record<string, unknown> = {};
    const logItems = Array.isArray(logs) ? (logs as LegacyLogItem[]) : [];
    const ctxDataMap = (logsCtxData as Record<string, unknown> | null) || {};
    const logsDb = dbLogs as LogsDatabase;

    if (!hasMigrated.logs && logItems.length > 0) {
      const ids = new Set<string>();

      const items: Array<Record<string, unknown>> = [];
      const ctxData: Array<{ logId: string; data: unknown }> = [];
      const logsData: Array<{ logId: string; data: unknown }> = [];
      const histories: Array<{ logId: string; data: unknown }> = [];

      for (let index = logItems.length - 1; index > 0; index -= 1) {
        const { data, history, ...item } = logItems[index];
        const logId = item.id;

        if (!ids.has(logId) && ids.size < 500) {
          items.push(item);
          logsData.push({ logId, data });
          histories.push({ logId, data: history });
          ctxData.push({ logId, data: ctxDataMap[logId] });

          ids.add(logId);
        }
      }

      await Promise.all([
        logsDb.items.bulkAdd(items),
        logsDb.ctxData.bulkAdd(ctxData),
        logsDb.logsData.bulkAdd(logsData),
        logsDb.histories.bulkAdd(histories),
      ]);

      backupData.logs = logItems;
      hasMigrated.logs = true;

      await extensionStorage.local.remove('logs');
    }

    await extensionStorage.local.set({
      migration: hasMigrated,
      ...backupData,
    });
  } catch (error) {
    console.error(error);
  }
}
