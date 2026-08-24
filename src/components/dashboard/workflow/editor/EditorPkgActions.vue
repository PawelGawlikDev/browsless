<template>
  <ui-card class="pointer-events-auto flex items-center" padding="p-1">
    <ui-popover>
      <template #trigger>
        <ui-button icon btn-type="transparent">
          <v-remixicon name="riMore2Line" />
        </ui-button>
      </template>
      <ui-list class="space-y-1" style="min-width: 9rem">
        <ui-list-item
          v-close-popover
          class="cursor-pointer text-red-400 dark:text-red-500"
          @click="deletePackage"
        >
          <v-remixicon name="riDeleteBin7Line" class="mr-2 -ml-1" />
          <span>
            {{ t('common.delete') }}
          </span>
        </ui-list-item>
      </ui-list>
    </ui-popover>
    <ui-button
      :title="shortcuts['editor:save'].readable"
      :variant="'accent'"
      class="relative ml-1"
      @click="savePackage"
    >
      <span v-if="isDataChanged" class="absolute top-0 left-0 -ml-1 -mt-1 flex h-3 w-3">
        <span
          class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
        ></span>
        <span class="relative inline-flex h-3 w-3 rounded-full bg-blue-600"></span>
      </span>
      <v-remixicon name="riSaveLine" class="my-1 mr-2 -ml-1" />
      {{ $t('common.save') }}
    </ui-button>
  </ui-card>
</template>
<script setup>
import { useDialog } from '@/composable/dialog';
import { getShortcut, useShortcut } from '@/composable/shortcut';
import { usePackageStore } from '@/stores/package';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
const props = defineProps({
  isDataChanged: {
    type: Boolean,
    default: false,
  },
  data: {
    type: Object,
    default: () => ({}),
  },
  editor: {
    type: Object,
    default: () => ({}),
  },
});
const emit = defineEmits(['update']);
const { t } = useI18n();
const dialog = useDialog();
const router = useRouter();
const packageStore = usePackageStore();
const shortcuts = useShortcut([getShortcut('editor:save', savePackage)]);
const deletePackage = () => {
  dialog.confirm({
    okVariant: 'danger',
    okText: 'Delete',
    title: 'Delete library item',
    body: `Are you sure you want to delete the "${props.data.name}" library item?`,
    onConfirm: () => {
      packageStore.delete(props.data.id);
      router.replace('/packages');
    },
  });
};
const updatePackage = (data = {}, changedIndicator = false) => {
  return packageStore
    .update({
      data,
      id: props.data.id,
    })
    .then((result) => {
      emit('update', { data, changedIndicator });
      return result;
    });
};
const savePackage = () => {
  const flow = props.editor.toObject();
  flow.edges = flow.edges.map((edge) => {
    delete edge.sourceNode;
    delete edge.targetNode;
    return edge;
  });
  updatePackage({ data: flow }, false);
};
</script>
