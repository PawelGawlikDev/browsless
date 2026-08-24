<template>
  <div id="workflow-edit-block" class="scroll h-full overflow-auto px-4 py-1">
    <div
      class="sticky top-0 z-20 mb-2 flex items-center space-x-2 bg-white pb-4 dark:bg-gray-800"
    >
      <button @click="handleClose">
        <v-remixicon name="riArrowLeftLine" />
      </button>
      <p class="inline-block font-semibold capitalize">
        {{ getBlockName() }}
      </p>
      <div class="grow"></div>
      <router-link
        v-if="blockDocsPath"
        :title="t('common.docs')"
        :to="blockDocsPath"
        class="text-gray-600 dark:text-gray-200"
      >
        <v-remixicon name="riInformationLine" />
      </router-link>
    </div>
    <component
      :is="getEditComponent()"
      v-if="blockData"
      :key="data.itemId || data.blockId"
      v-model:data="blockData"
      :block-id="data.blockId"
      v-bind="{
        fullData: data.id === 'conditions' ? data : null,
        editor: data.id === 'conditions' ? editor : null,
        connections: data.id === 'wait-connections' ? data.connections : null,
      }"
    />
  </div>
</template>
<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getBlockDocsPath } from '@/docs';
const editComponents = import.meta.glob('./edit/Edit*.vue', { eager: true });
const components = Object.entries(editComponents).reduce((acc, [key, module]) => {
  const name = key
    .split('/')
    .at(-1)
    ?.replace(/\.vue$/g, '');
  if (!name) return acc;
  const componentObj = module?.default ?? {};
  acc[name] = componentObj;
  return acc;
}, {});
const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
  editor: {
    type: Object,
    default: () => ({}),
  },
  workflow: {
    type: Object,
    default: () => ({}),
  },
  autocomplete: {
    type: Object,
    default: () => ({}),
  },
  dataChanged: Boolean,
});
const emit = defineEmits(['close', 'update', 'update:autocomplete']);
const { t, te } = useI18n();
const blockData = computed({
  get() {
    return props.data.data;
  },
  set(data) {
    emit('update', data);
  },
});
const blockDocsPath = computed(() => getBlockDocsPath(props.data.id || ''));
const handleClose = () => {
  emit('close');
};
const getEditComponent = () => {
  const editComp = props.data.editComponent;
  if (typeof editComp === 'object') return editComp;
  return components[editComp] || null;
};
const getBlockName = () => {
  const key = `workflow.blocks.${props.data.id}.name`;
  return te(key) ? t(key) : props.data.name;
};
</script>
<style>
#workflow-edit-block hr {
  border-color: rgb(55 65 81 / 0.4);
  margin-top: 1rem;
  margin-bottom: 1rem;
}
</style>
