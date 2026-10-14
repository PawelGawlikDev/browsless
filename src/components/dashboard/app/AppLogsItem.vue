<template>
  <div v-if="currentLog.id">
    <div class="flex items-center">
      <button
        v-tooltip:bottom="t('workflow.blocks.go-back.name')"
        role="button"
        class="bg-input mr-2 h-12 rounded-lg px-1 text-gray-600 transition dark:text-gray-300"
        @click="$emit('close')"
      >
        <v-remixicon name="riArrowLeftSLine" />
      </button>
      <div>
        <h1 class="text-overflow max-w-md text-2xl font-semibold">
          {{ currentLog.name }}
        </h1>
        <p class="text-gray-600 dark:text-gray-200">
          {{
            t(`log.description.text`, {
              status: t(`log.description.status.${currentLog.status || 'success'}`),
              date: dayjs(currentLog.startedAt).format('DD MMM'),
              duration: countDuration(currentLog.startedAt, currentLog.endedAt),
            })
          }}
        </p>
      </div>
      <div class="grow"></div>
      <ui-button
        v-if="state.workflowExists"
        v-tooltip="t('log.goWorkflow')"
        icon
        class="mr-4"
        @click="goToWorkflow"
      >
        <v-remixicon name="riExternalLinkLine" />
      </ui-button>
      <ui-button class="text-red-500 dark:text-red-400" @click="deleteLog">
        {{ t('common.delete') }}
      </ui-button>
    </div>
    <ui-tabs v-model="state.activeTab" class="mt-4" @change="onTabChange">
      <ui-tab v-for="tab in tabs" :key="tab.id" class="mr-4" :value="tab.id">
        {{ tab.name }}
      </ui-tab>
    </ui-tabs>
    <ui-tab-panels
      :model-value="state.activeTab"
      class="scroll mt-4 overflow-auto px-2 pb-4"
      style="min-height: 500px; max-height: calc(100vh - 15rem)"
    >
      <ui-tab-panel value="logs">
        <logs-history
          :current-log="currentLog"
          :ctx-data="ctxData"
          :parent-log="parentLog"
        />
      </ui-tab-panel>
      <ui-tab-panel value="table">
        <logs-table :current-log="currentLog" :table-data="tableData" />
      </ui-tab-panel>
      <ui-tab-panel value="variables">
        <logs-variables :current-log="currentLog" />
      </ui-tab-panel>
    </ui-tab-panels>
  </div>
</template>
<script setup lang="ts">
import { shallowReactive, shallowRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import dbLogs from '@/db/logs';
import dayjs from '@/lib/dayjs';
import { useWorkflowStore, type WorkflowStoreInstance } from '@/stores/workflow';
import { countDuration, convertArrObjTo2DArr } from '@/utils/helper';
import LogsTable from '@/components/dashboard/logs/LogsTable.vue';
import LogsHistory, {
  type HistoryItem,
} from '@/components/dashboard/logs/LogsHistory.vue';
import LogsVariables from '@/components/dashboard/logs/LogsVariables.vue';
import type { DbLogItem } from '@/types/db';

interface CurrentLogEntry extends Partial<DbLogItem> {
  history: HistoryItem[];
  data: {
    table?: Record<string, unknown>[];
    variables?: Record<string, unknown>;
  };
  workflowId?: string | null;
}
interface TableHeaderCol extends Record<string, unknown> {
  text: string;
  value: string;
  filterable?: boolean;
  sortable?: boolean;
}

const props = withDefaults(
  defineProps<{
    logId?: string | number;
  }>(),
  {
    logId: '',
  }
);
const emit = defineEmits<{
  close: [redirect?: boolean];
}>();
const { t } = useI18n();
const router = useRouter();
const workflowStore = useWorkflowStore() as WorkflowStoreInstance;
const ctxData = shallowRef<Record<string, unknown>>({});
const parentLog = shallowRef<DbLogItem | null>(null);
const tabs = [
  { id: 'logs', name: t('common.log', 2) },
  { id: 'table', name: t('workflow.table.title') },
  { id: 'variables', name: t('workflow.variables.title', 2) },
];
const state = shallowReactive({
  activeTab: 'logs',
  workflowExists: false,
});
const tableData = shallowReactive<{
  converted: boolean;
  body: Record<string, unknown>[];
  header: TableHeaderCol[];
}>({
  converted: false,
  body: [],
  header: [],
});
const currentLog = shallowRef<CurrentLogEntry>({
  history: [],
  data: {
    table: [],
    variables: {},
  },
});
const deleteLog = () => {
  dbLogs.items
    .where('id')
    .equals(props.logId as unknown as number)
    .delete()
    .then(() => {
      emit('close');
    });
};
const goToWorkflow = () => {
  const path = `/workflows/${currentLog.value.workflowId}`;
  router.push(path);
  emit('close', true);
};
const convertToTableData = () => {
  const data = currentLog.value.data?.table;
  if (!data) return;
  const [header] = convertArrObjTo2DArr(data);
  tableData.converted = true;
  tableData.body = data.map((item, index) => ({ ...item, id: index + 1 }));
  tableData.header = header.map((name) => ({
    text: name as string,
    value: name as string,
    filterable: true,
  }));
  tableData.header.unshift({ value: 'id', text: '', sortable: false });
};
const onTabChange = (value: string | number) => {
  if (value === 'table' && !tableData.converted) {
    convertToTableData();
  }
};
const fetchLog = async () => {
  if (!props.logId) return;
  const logDetail = await dbLogs.items
    .where('id')
    .equals(props.logId as unknown as number)
    .last();
  if (!logDetail) return;
  tableData.body = [];
  tableData.header = [];
  parentLog.value = null;
  tableData.converted = false;
  const logId = props.logId as unknown as number;
  const [logCtxData, logHistory, logsData] = await Promise.all([
    dbLogs.ctxData.where('logId').equals(logId).last(),
    dbLogs.histories.where('logId').equals(logId).last(),
    dbLogs.logsData.where('logId').equals(logId).last(),
  ]);
  ctxData.value = (logCtxData?.data as Record<string, unknown>) || {};
  currentLog.value = {
    history: (logHistory?.data as HistoryItem[]) || [],
    data: (logsData?.data as CurrentLogEntry['data']) || {},
    ...logDetail,
  };
  state.workflowExists = Boolean(workflowStore.getById(logDetail.workflowId as string));
  const parentLogId = logDetail.collectionId || logDetail.parentLog;
  if (parentLogId) {
    parentLog.value =
      (await dbLogs.items
        .where('id')
        .equals(parentLogId as unknown as number)
        .last()) || null;
  }
};
watch(() => props.logId, fetchLog, { immediate: true });
</script>
<style>
.logs-details .cm-editor {
  max-height: calc(100vh - 15rem);
}
</style>
