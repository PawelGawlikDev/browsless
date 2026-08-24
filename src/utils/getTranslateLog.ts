import { getBlocks } from '@/utils/getSharedData';
import dayjs from '@/lib/dayjs';
import vueI18n from '@/lib/vueI18n';
import { countDuration } from '@/utils/helper';
import { messageHasReferences } from '@/utils/shared';
import type { SharedBlocksMap } from '@/types/shared-data';
type TranslationPath = {
  path: string;
  params?: Record<string, unknown>;
};
type LogEntry = {
  id: string;
  type: string;
  name: string;
  message?: string;
  description?: string;
  timestamp?: number;
  duration?: number;
  [key: string]: unknown;
};
type ReferenceData = {
  loopData?: unknown;
  variables?: unknown;
  [key: string]: unknown;
};
type LogContextData = {
  referenceData: ReferenceData;
  [key: string]: unknown;
};
type StateContextData = {
  dataSnapshot?: Record<string, unknown>;
  ctxData?: Record<string, LogContextData>;
  [key: string]: unknown;
};
type WorkflowStateLike = {
  logs: LogEntry[];
  ctxData: StateContextData;
};
type JsonLogItem = {
  timestamp: string;
  duration: string;
  status: string;
  name: string;
  description: string;
  message: string;
  data: LogContextData | null;
};
type LogOutputType = 'plain-text' | 'json';
const blocks: SharedBlocksMap = getBlocks();
const translateLog = (log: LogEntry) => {
  const copyLog = { ...log };
  const getTranslatation = (path: string | TranslationPath, def: string) => {
    const params = typeof path === 'string' ? { path } : path;
    return vueI18n.global.te(params.path)
      ? vueI18n.global.t(params.path, params.params)
      : def;
  };
  if (['finish', 'stop'].includes(log.type)) {
    copyLog.name = vueI18n.global.t(`log.types.${log.type}`);
  } else {
    const blockName = blocks[log.name]?.name ?? log.name;
    copyLog.name = getTranslatation(`workflow.blocks.${log.name}.name`, blockName);
  }
  if (copyLog.message && messageHasReferences.includes(copyLog.message)) {
    copyLog.messageId = `${copyLog.message}`;
  }
  copyLog.message = getTranslatation(
    { path: `log.messages.${log.message}`, params: log },
    log.message
  );
  return copyLog;
};
const getDataSnapshot = (propsCtxData: StateContextData, refData: ReferenceData) => {
  if (!propsCtxData?.dataSnapshot) return;
  const data = propsCtxData.dataSnapshot;
  const getData = (key: 'loopData' | 'variables') => {
    const currentData = refData[key];
    if (typeof currentData !== 'string') return currentData;
    return data[currentData] ?? {};
  };
  refData.loopData = getData('loopData');
  refData.variables = getData('variables');
};
const getLogs = (
  dataType: LogOutputType,
  translatedLog: LogEntry[],
  curStateCtxData: StateContextData
) => {
  let data: string | JsonLogItem[] = dataType === 'plain-text' ? '' : [];
  const getItemData = {
    'plain-text': ([
      timestamp,
      duration,
      status,
      name,
      description,
      message,
      ctxData,
    ]) => {
      data += `${timestamp}(${countDuration(0, duration || 0).trim()}) - ${status} - ${name} - ${description} - ${message} - ${JSON.stringify(ctxData)} \n`;
    },
    json: ([timestamp, duration, status, name, description, message, ctxData]: [
      string,
      number | undefined,
      string,
      string,
      string,
      string,
      LogContextData | null,
    ]) => {
      (data as JsonLogItem[]).push({
        timestamp,
        duration: countDuration(0, duration || 0).trim(),
        status,
        name,
        description,
        message,
        data: ctxData,
      });
    },
  };
  translatedLog.forEach((item) => {
    let logData: StateContextData | Record<string, LogContextData> = curStateCtxData;
    if (logData.ctxData) logData = logData.ctxData;
    const itemData = (logData as Record<string, LogContextData>)[item.id] || null;
    if (itemData) getDataSnapshot(curStateCtxData, itemData.referenceData);
    getItemData[dataType]([
      dayjs(item.timestamp || Date.now()).format('YYYY-MM-DD HH:mm:ss'),
      item.duration,
      item.type.toUpperCase(),
      item.name,
      item.description || 'NULL',
      item.message || 'NULL',
      itemData,
    ]);
  });
  return data;
};
export default function (
  curState: Partial<WorkflowStateLike>,
  dataType: LogOutputType = 'plain-text'
) {
  const curStateHistory = curState.logs ?? [];
  const curStateCtxData = curState.ctxData ?? {};
  const translatedLog = curStateHistory.map(translateLog);
  const logs = getLogs(dataType, translatedLog, curStateCtxData);
  return logs;
}
