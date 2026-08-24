<template>
  <div>
    <template v-if="!permission.has[permissionName]">
      <p>
        {{ t('workflow.blocks.trigger.contextMenus.noPermission') }}
      </p>
      <ui-button class="mt-2" @click="permission.request(true)">
        {{ t('workflow.blocks.trigger.contextMenus.grantPermission') }}
      </ui-button>
    </template>
    <template v-else-if="workflow.data">
      <ui-input
        :label="t('workflow.blocks.trigger.contextMenus.contextName')"
        :placeholder="workflow.data.value.name"
        :model-value="data.contextMenuName"
        class="w-full"
        @change="$emit('update', { contextMenuName: $event })"
      />
      <ui-popover
        :options="{ animation: null }"
        trigger-width
        class="mt-2 w-full"
        trigger-class="w-full"
      >
        <template #trigger>
          <span class="ml-1 text-sm text-gray-600 dark:text-gray-200">
            {{ t('workflow.blocks.trigger.contextMenus.appearIn') }}
          </span>
          <ui-button class="w-full">
            <p class="text-overflow mr-2 flex-1 text-left">
              {{ data.contextTypes.join(', ') || 'All' }}
            </p>
            <v-remixicon
              size="28"
              name="riArrowDropDownLine"
              class="-mr-2 text-gray-600 dark:text-gray-200"
            />
          </ui-button>
        </template>
        <div class="grid grid-cols-2 gap-2">
          <ui-checkbox
            v-for="type in types"
            :key="type"
            :model-value="data.contextTypes?.includes(type)"
            @change="onSelectContextType($event, type)"
          >
            <span class="capitalize">{{ type }}</span>
          </ui-checkbox>
        </div>
      </ui-popover>
    </template>
  </div>
</template>
<script setup lang="ts">
import { onMounted, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHasPermissions } from '@/composable/hasPermissions';
type ContextMenuTriggerData = {
  contextMenuName: string;
  contextTypes: string[];
};
type InjectedWorkflow = {
  data?: {
    value: {
      name: string;
    };
  };
};
const props = defineProps({
  data: {
    type: Object as () => ContextMenuTriggerData,
    default: () => ({ contextMenuName: '', contextTypes: [] }),
  },
});
const emit = defineEmits<{
  update: [value: Partial<ContextMenuTriggerData>];
}>();
const types = [
  'audio',
  'editable',
  'image',
  'link',
  'page',
  'password',
  'selection',
  'video',
];
const permissionName = 'contextMenus';
const { t } = useI18n();
const permission = useHasPermissions([permissionName]);
const workflow = inject<InjectedWorkflow>('workflow', {});
const onSelectContextType = (selected: boolean, type: string) => {
  const contextTypes = [...props.data.contextTypes];
  if (selected) {
    contextTypes.push(type);
  } else {
    const index = contextTypes.indexOf(type);
    contextTypes.splice(index, 1);
  }
  emit('update', { contextTypes });
};
onMounted(() => {
  if (props.data.contextMenuName.trim() || !workflow?.data) return;
  emit('update', { contextMenuName: workflow.data.value.name });
});
</script>
