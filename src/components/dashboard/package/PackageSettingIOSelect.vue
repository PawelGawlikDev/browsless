<template>
  <ui-popover>
    <template #trigger>
      <ui-button class="w-full"> Select block {{ props.data.blockId }} </ui-button>
    </template>
    <div class="w-64">
      <ui-input
        v-if="state.selectType === 'nodes'"
        v-model="state.query"
        placeholder="Search..."
        class="mb-4 w-full"
      />
      <template v-else>
        <div class="flex cursor-pointer items-center" @click="state.selectType = 'nodes'">
          <v-remixicon name="riArrowLeftSLine" title="Go back" class="mr-1 -ml-1" />
          <span class="text-overflow flex-1">
            {{ getBlockName(selectedNode) }}
          </span>
        </div>
        <p class="mt-2 mb-4">Select {{ type }}</p>
      </template>
      <ui-list class="space-y-1">
        <ui-list-item
          v-for="(item, index) in items"
          :key="item.id"
          :active="isActive(item)"
          class="cursor-pointer"
          @click="selectItem(item)"
        >
          <p class="text-overflow">
            {{
              state.selectType === 'nodes'
                ? getBlockName(item as GraphNode)
                : `${type} ${index + 1}`
            }}
          </p>
        </ui-list-item>
      </ui-list>
      {{ data }}
    </div>
  </ui-popover>
</template>
<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { getBlocks } from '@/utils/getSharedData';
import type { GraphNode, HandleElement } from '@vue-flow/core';
import type { PackageIoItem } from '@/types/models';

const props = withDefaults(
  defineProps<{
    nodes?: GraphNode[];
    data?: Partial<PackageIoItem>;
    type?: 'inputs' | 'outputs';
  }>(),
  {
    nodes: () => [],
    data: () => ({}),
    type: 'inputs',
  }
);
const emit = defineEmits<{
  update: [payload: Partial<PackageIoItem>];
}>();
const blocks = getBlocks();
const handleType = props.type === 'inputs' ? 'target' : 'source';
const state = reactive<{ query: string; selectType: 'nodes' | 'handle' }>({
  query: '',
  selectType: 'nodes',
});
const includeQuery = (str: string) =>
  str.toLocaleLowerCase().includes(state.query.toLocaleLowerCase());
const selectedNode = computed(() =>
  props.nodes.find((node) => node.id === props.data.blockId)
);
const items = computed((): (GraphNode | HandleElement)[] => {
  if (state.selectType === 'nodes') {
    return props.nodes.filter(({ data, label }) => {
      let additionalKey = false;
      if (data.name) additionalKey = includeQuery(data.name);
      else if (data.description) additionalKey = includeQuery(data.description);
      return (
        includeQuery((blocks[label as string]?.name as string) || '') || additionalKey
      );
    });
  }
  return (selectedNode.value?.handleBounds?.[handleType] as HandleElement[]) ?? [];
});
const updateData = (data: Partial<PackageIoItem>) => {
  emit('update', data);
};
const selectItem = (item: GraphNode | HandleElement) => {
  if (state.selectType === 'nodes') {
    const payload: Partial<PackageIoItem> = { blockId: item.id as string };
    if (props.data.blockId && props.data.blockId !== item.id) {
      payload.handleId = '';
    }
    updateData(payload);
    state.selectType = 'handle';
  } else {
    updateData({ handleId: item.id as string });
  }
};
const getBlockName = (item: GraphNode) => {
  const { label, data } = item;
  const labelStr = label as string | undefined;
  let name = (labelStr && blocks[labelStr]?.name) || '';
  if (data.name) name += ` (${data.name})`;
  else if (data.description) name += ` (${data.description})`;
  return name;
};
const isActive = (item: GraphNode | HandleElement) => {
  if (state.selectType === 'nodes') {
    return item.id === props.data.blockId;
  }
  return item.id === props.data.handleId;
};
onMounted(() => {
  if (props.data.blockId) {
    const blockExists = props.nodes.some((node) => node.id === props.data.blockId);
    if (blockExists) {
      state.selectType = 'handle';
    } else {
      emit('update', { blockId: '', handleId: '' });
    }
  }
});
</script>
