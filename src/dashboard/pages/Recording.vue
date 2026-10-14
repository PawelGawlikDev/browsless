<template>
  <div class="mx-auto w-full max-w-xl p-5">
    <div class="flex items-center">
      <button
        v-tooltip="t('recording.stop')"
        class="relative flex h-12 w-12 items-center justify-center rounded-full bg-red-400 focus:ring-0"
        @click="stopRecording"
      >
        <span
          class="absolute animate-ping rounded-full bg-red-400"
          style="height: 80%; width: 80%; animation-duration: 1.3s"
        ></span>
        <ui-spinner v-if="state.isGenerating" color="text-white" />
        <v-remixicon v-else name="riStopLine" class="relative z-10" />
      </button>
      <div class="ml-4 flex-1 overflow-hidden">
        <p class="text-sm">{{ t('recording.title') }}</p>
        <p class="text-overflow text-xl font-semibold leading-tight">
          {{ state.name }}
        </p>
      </div>
    </div>
    <p class="mt-6 mb-2 font-semibold">Flows</p>
    <ui-list class="space-y-1">
      <ui-list-item v-for="(item, index) in state.flows" :key="index" class="group" small>
        <v-remixicon :name="tasks[item.id as keyof typeof tasks].icon" />
        <div class="mx-2 flex-1 overflow-hidden">
          <p class="leading-tight">
            {{ t(`workflow.blocks.${item.id}.name`) }}
          </p>
          <p
            :title="item.data.description || item.description"
            class="text-overflow text-sm leading-tight text-gray-600 dark:text-gray-300"
          >
            {{ item.data.description || item.description }}
          </p>
        </div>
        <v-remixicon
          name="riDeleteBin7Line"
          class="invisible cursor-pointer group-hover:visible"
          @click="removeBlock(index)"
        />
      </ui-list-item>
    </ui-list>
  </div>
</template>
<script setup lang="ts">
import { extensionStorage, watchExtensionStorageValue } from '@/lib/extensionStorage';
import { onMounted, reactive, toRaw, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { nanoid } from 'nanoid';
import defu from 'defu';
import { browser } from 'wxt/browser';
import { tasks } from '@/utils/shared';
import { useWorkflowStore, type WorkflowStoreInstance } from '@/stores/workflow';
import RecordWorkflowUtils from '@/dashboard/utils/RecordWorkflowUtils';
import type { RecordingFlow, RecordingState } from '@/types/migration-helpers';
import type { WorkflowEdge, WorkflowNode } from '@/types/models';

type RecordingBlock = RecordingFlow & { groupId?: string };
interface RecordingPageState {
  flows: RecordingBlock[];
  name: string;
  activeTab: RecordingState['activeTab'];
  workflowId?: string;
  description?: string;
  connectFrom?: { id: string; output?: string };
  [key: string]: unknown;
}
interface RecordingGroupBlockItem {
  id: string;
  itemId: string;
  data: Record<string, unknown>;
}

const browserEvents = {
  onTabCreated: (event: chrome.tabs.Tab) => RecordWorkflowUtils.onTabCreated(event),
  onTabsActivated: (event: chrome.tabs.OnActivatedInfo) =>
    RecordWorkflowUtils.onTabsActivated(event),
  onCommitted: (event: chrome.webNavigation.WebNavigationTransitionCallbackDetails) =>
    RecordWorkflowUtils.onWebNavigationCommited(event),
  onWebNavigationCompleted: (
    event: chrome.webNavigation.WebNavigationFramedCallbackDetails
  ) => RecordWorkflowUtils.onWebNavigationCompleted(event),
};
const { t } = useI18n();
const router = useRouter();
const workflowStore = useWorkflowStore() as WorkflowStoreInstance;
let unwatchRecording: (() => void) | null = null;
const state = reactive<RecordingPageState>({
  name: '',
  flows: [],
  activeTab: {},
  isGenerating: false,
});
const generateDrawflow = (
  startBlock?: RecordingPageState['connectFrom'],
  startBlockData?: WorkflowNode
) => {
  let nextNodeId = nanoid();
  const triggerId = startBlock?.id || nanoid();
  let prevNodeId = startBlock?.id || triggerId;
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  const addEdge = (data: Partial<WorkflowEdge> = {}) => {
    edges.push({
      ...data,
      id: nanoid(),
      source: data.source ?? '',
      target: data.target ?? '',
      class: `source-${data.sourceHandle} targte-${data.targetHandle}`,
    });
  };
  addEdge({
    source: prevNodeId,
    target: nextNodeId,
    targetHandle: `${nextNodeId}-input-1`,
    sourceHandle: startBlock?.output || `${prevNodeId}-output-1`,
  });
  if (!startBlock) {
    nodes.push({
      position: {
        x: 50,
        y: 300,
      },
      id: triggerId,
      label: 'trigger',
      type: 'BlockBasic',
      data: tasks.trigger.data,
    });
  }
  const position = {
    y: startBlockData ? startBlockData.position.y + 120 : 300,
    x: startBlockData ? startBlockData.position.x + 280 : 320,
  };
  const groups: Record<string, RecordingGroupBlockItem[]> = {};
  const tasksMap = tasks as Record<
    string,
    { data: Record<string, unknown>; component: string }
  >;
  state.flows.forEach((block, index) => {
    if (block.groupId) {
      if (!groups[block.groupId]) groups[block.groupId] = [];
      groups[block.groupId].push({
        id: block.id,
        itemId: nanoid(),
        data: defu(block.data, tasksMap[block.id].data),
      });
      const nextNodeInGroup = state.flows[index + 1]?.groupId;
      if (nextNodeInGroup) return;
      block.id = 'blocks-group';
      block.data = { blocks: groups[block.groupId] };
      delete groups[block.groupId];
    }
    const node: WorkflowNode = {
      id: nextNodeId,
      label: block.id,
      type: tasksMap[block.id].component,
      data: defu(block.data, tasksMap[block.id].data),
      position: JSON.parse(JSON.stringify(position)),
    };
    prevNodeId = nextNodeId;
    nextNodeId = nanoid();
    if (index !== state.flows.length - 1) {
      addEdge({
        target: nextNodeId,
        source: prevNodeId,
        targetHandle: `${nextNodeId}-input-1`,
        sourceHandle: `${prevNodeId}-output-1`,
      });
    }
    const inNewRow = (index + 1) % 5 === 0;
    position.x = inNewRow ? 50 : position.x + 280;
    position.y = inNewRow ? position.y + 150 : position.y;
    nodes.push(node);
  });
  return {
    edges,
    nodes,
  };
};
const stopRecording = async () => {
  if (state.isGenerating) return;
  try {
    state.isGenerating = true;
    if (state.flows.length !== 0) {
      if (state.workflowId) {
        const workflow = workflowStore.getById(state.workflowId);
        if (!workflow) throw new Error(`Workflow ${state.workflowId} not found`);
        const startBlock = workflow.drawflow.nodes.find(
          (node) => node.id === state.connectFrom?.id
        );
        const updatedDrawflow = generateDrawflow(state.connectFrom, startBlock);
        const drawflow = {
          ...workflow.drawflow,
          nodes: [...workflow.drawflow.nodes, ...updatedDrawflow.nodes],
          edges: [...workflow.drawflow.edges, ...updatedDrawflow.edges],
        };
        await workflowStore.update({
          id: state.workflowId,
          data: { drawflow },
        });
      } else {
        const drawflow = generateDrawflow();
        await workflowStore.insert({
          drawflow,
          name: state.name,
          description: state.description ?? '',
        });
      }
    }
    await extensionStorage.local.remove(['isRecording', 'recording']);
    await browser.action.setBadgeText({ text: '' });
    const tabs = (await browser.tabs.query({})).filter((tab) =>
      tab.url.startsWith('http')
    );
    Promise.allSettled(
      tabs.map(({ id }) => browser.tabs.sendMessage(id, { type: 'recording:stop' }))
    );
    state.isGenerating = false;
    if (state.workflowId) {
      router.replace(`/workflows/${state.workflowId}?blockId=${state.connectFrom?.id}`);
    } else {
      router.replace('/');
    }
  } catch (error) {
    state.isGenerating = false;
    console.error(error);
  }
};
const removeBlock = (index: number) => {
  state.flows.splice(index, 1);
  extensionStorage.local.set({ recording: toRaw(state) });
};
const onStorageChanged = ({
  recording,
}: {
  recording?: { newValue: Partial<RecordingPageState> };
}) => {
  if (!recording) return;
  Object.assign(state, recording.newValue);
};
onMounted(async () => {
  const { recording, isRecording } = (await extensionStorage.local.get([
    'recording',
    'isRecording',
  ])) as { recording?: RecordingPageState; isRecording?: boolean };
  if (!isRecording && !recording) return;
  window.stopRecording = stopRecording;
  unwatchRecording = watchExtensionStorageValue<RecordingPageState>(
    'local',
    'recording',
    (value) => {
      if (!value) return;
      onStorageChanged({ recording: { newValue: value } });
    }
  );
  browser.tabs.onCreated.addListener(browserEvents.onTabCreated);
  browser.tabs.onActivated.addListener(browserEvents.onTabsActivated);
  browser.webNavigation.onCommitted.addListener(browserEvents.onCommitted);
  browser.webNavigation.onCompleted.addListener(browserEvents.onWebNavigationCompleted);
  Object.assign(state, recording);
});
onBeforeUnmount(() => {
  window.stopRecording = null;
  unwatchRecording?.();
  browser.tabs.onCreated.removeListener(browserEvents.onTabCreated);
  browser.tabs.onActivated.removeListener(browserEvents.onTabsActivated);
  browser.webNavigation.onCommitted.removeListener(browserEvents.onCommitted);
  browser.webNavigation.onCompleted.removeListener(
    browserEvents.onWebNavigationCompleted
  );
});
</script>
