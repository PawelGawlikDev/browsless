<template>
  <div class="space-y-4">
    <div class="flex items-start gap-3">
      <slot name="header-prepend" />
      <div v-if="parentLog" class="text-sm text-gray-600 dark:text-gray-300">
        Parent log: {{ parentLog.name }}
      </div>
    </div>

    <ui-list class="space-y-2">
      <ui-list-item v-for="item in translatedHistory" :key="item.id" small class="!block">
        <div class="flex items-start gap-3">
          <div class="w-28 shrink-0 text-xs text-gray-500 dark:text-gray-400">
            {{ formatTime(item.timestamp) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-overflow font-medium">{{ item.name }}</p>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatDuration(item.duration) }}
              </span>
            </div>
            <p
              v-if="item.description"
              class="mt-1 text-sm text-gray-700 dark:text-gray-200"
            >
              {{ item.description }}
            </p>
            <p v-if="item.message" class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {{ item.message }}
            </p>
            <ui-button
              v-if="getItemData(item.id)"
              btn-type="transparent"
              class="mt-2"
              @click="openData(getItemData(item.id))"
            >
              View data
            </ui-button>
          </div>
        </div>
      </ui-list-item>
      <slot name="append-items" />
    </ui-list>

    <ui-modal v-model="state.showData" content-class="max-w-3xl">
      <template #header>
        <span>Log data</span>
      </template>
      <logs-data-viewer :log="state.selectedData" editor-class="h-[420px]" />
    </ui-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import dayjs from '@/lib/dayjs';
import { countDuration } from '@/utils/helper';
import { tasks } from '@/utils/shared';
import LogsDataViewer from './LogsDataViewer.vue';

export interface HistoryItem extends Record<string, unknown> {
  id: string;
  type?: string;
  name: string;
  message?: string;
  timestamp?: number;
  duration?: number;
  description?: string;
}
interface LogCtxData {
  ctxData?: Record<
    string,
    { referenceData?: Record<string, unknown> } & Record<string, unknown>
  >;
  dataSnapshot?: Record<string, unknown>;
}

const props = withDefaults(
  defineProps<{
    currentLog?: { history?: HistoryItem[] } & Record<string, unknown>;
    ctxData?: LogCtxData;
    parentLog?: { name?: string } | null;
    isRunning?: boolean;
  }>(),
  {
    currentLog: () => ({}),
    ctxData: () => ({}),
    parentLog: null,
  }
);

const { t, te } = useI18n();
const state = reactive<{ showData: boolean; selectedData: Record<string, unknown> }>({
  showData: false,
  selectedData: {},
});

const translatedHistory = computed(() => {
  const history = props.currentLog?.history ?? [];
  return history
    .slice()
    .reverse()
    .map((item) => {
      const blockName =
        (tasks as Record<string, { name?: string }>)[item.name]?.name ?? item.name;
      const name =
        item.type && ['finish', 'stop'].includes(item.type)
          ? t(`log.types.${item.type}`)
          : te(`workflow.blocks.${item.name}.name`)
            ? t(`workflow.blocks.${item.name}.name`)
            : blockName;
      const message =
        item.message && te(`log.messages.${item.message}`)
          ? t(`log.messages.${item.message}`, item)
          : item.message;

      return {
        ...item,
        name,
        message,
      };
    });
});

const formatTime = (timestamp?: number) => {
  if (!timestamp) return '--';
  return dayjs(timestamp).format('HH:mm:ss');
};

const formatDuration = (duration?: number) => {
  if (!duration && duration !== 0) return '';
  return countDuration(0, duration).trim();
};

const getItemData = (id: string) => {
  const ctxData = props.ctxData?.ctxData?.[id];
  if (!ctxData) return null;

  const snapshot = props.ctxData?.dataSnapshot ?? {};
  const referenceData: Record<string, unknown> = { ...(ctxData.referenceData ?? {}) };

  ['loopData', 'variables'].forEach((key) => {
    if (typeof referenceData[key] === 'string') {
      referenceData[key] = snapshot[referenceData[key] as string] ?? {};
    }
  });

  return {
    ...ctxData,
    referenceData,
  };
};

const openData = (data: Record<string, unknown>) => {
  state.selectedData = data;
  state.showData = true;
};
</script>
