<template>
  <ui-card class="flex w-full items-center space-x-2 hover:ring-2 hover:ring-gray-900">
    <div class="text-overflow flex-1 cursor-pointer" @click="$emit('details', workflow)">
      <p class="text-overflow leading-tight">{{ workflow.name }}</p>
      <p class="leading-tight text-gray-500">
        {{ dayjs(workflow.createdAt).fromNow() }}
      </p>
    </div>
    <p v-if="workflow.isDisabled">Disabled</p>
    <button v-else title="Execute" @click="$emit('execute', workflow)">
      <v-remixicon name="riPlayLine" />
    </button>
    <v-remixicon
      v-if="workflow.isProtected"
      name="riShieldKeyholeLine"
      class="text-green-600"
    />
    <ui-popover v-else class="h-6">
      <template #trigger>
        <button>
          <v-remixicon name="riMoreLine" />
        </button>
      </template>
      <ui-list class="space-y-1" style="min-width: 160px">
        <template v-if="tab === 'local'">
          <ui-list-item
            class="cursor-pointer capitalize"
            @click="$emit('update', { isDisabled: !workflow.isDisabled })"
          >
            <v-remixicon name="riToggleLine" class="mr-2 -ml-1" />
            <span>{{ t(`common.${workflow.isDisabled ? 'enable' : 'disable'}`) }}</span>
          </ui-list-item>
          <ui-list-item class="cursor-pointer capitalize" @click="$emit('togglePin')">
            <v-remixicon name="riPushpin2Line" class="mr-2 -ml-1" />
            <span>{{ pinned ? 'Unpin workflow' : 'Pin workflow' }}</span>
          </ui-list-item>
        </template>
        <ui-list-item
          v-for="item in filteredMenu"
          :key="item.name"
          v-close-popover
          class="cursor-pointer capitalize"
          @click="emitMenuAction(item.name, workflow)"
        >
          <v-remixicon :name="item.icon" class="mr-2 -ml-1" />
          <span>{{ item.name }}</span>
        </ui-list-item>
      </ui-list>
    </ui-popover>
  </ui-card>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import dayjs from '@/lib/dayjs';
import type { Workflow } from '@/types/models';

const props = withDefaults(
  defineProps<{
    workflow?: Workflow;
    tab?: 'local' | string;
    pinned?: boolean;
  }>(),
  {
    workflow: () => ({}) as Workflow,
    tab: 'local',
  }
);
const emit = defineEmits<{
  execute: [workflow: Workflow];
  togglePin: [];
  rename: [workflow: Workflow];
  details: [workflow: Workflow];
  delete: [workflow: Workflow];
  update: [data: Partial<Workflow>];
}>();

const { t } = useI18n();

const menu: { name: 'rename' | 'delete'; icon: string }[] = [
  { name: 'rename', icon: 'riPencilLine' },
  { name: 'delete', icon: 'riDeleteBin7Line' },
];
const filteredMenu = menu.filter(({ name }) => {
  if (name === 'rename' && props.tab !== 'local') return false;

  return true;
});
const emitMenuAction = (name: 'rename' | 'delete', workflow: Workflow) => {
  emit(name as 'rename', workflow);
};
</script>
