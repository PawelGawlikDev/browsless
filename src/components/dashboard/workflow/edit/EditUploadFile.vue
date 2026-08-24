<template>
  <edit-interaction-base
    class="mb-8"
    v-bind="{ data, hide: hideBase }"
    @change="updateData"
  >
    <template v-if="hasFileAccess">
      <div class="mt-4 space-y-2">
        <div
          v-for="(path, index) in filePaths"
          :key="index"
          class="group flex items-center"
        >
          <edit-autocomplete class="mr-2">
            <ui-input
              v-model="filePaths[index]"
              placeholder="URL/File path/base64"
              autocomplete="off"
              class="w-full"
            />
          </edit-autocomplete>
          <v-remixicon
            name="riDeleteBin7Line"
            class="invisible cursor-pointer group-hover:visible"
            @click="filePaths.splice(index, 1)"
          />
        </div>
      </div>
      <ui-button variant="accent" class="mt-2" @click="filePaths.push('')">
        {{ t('workflow.blocks.upload-file.addFile') }}
      </ui-button>
    </template>
    <template v-else>
      <div class="mt-4 flex items-start rounded-lg bg-red-200 p-2 dark:bg-red-400">
        <v-remixicon name="riErrorWarningLine" />
        <div class="ml-2 flex-1 leading-tight">
          <p>{{ t('workflow.blocks.upload-file.noFileAccess') }}</p>
        </div>
      </div>
      <a
        href="#"
        target="_blank"
        rel="noopener"
        class="mt-2 inline-block leading-tight text-primary"
      >
        {{ t('workflow.blocks.upload-file.requirement') }}
      </a>
    </template>
  </edit-interaction-base>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { browser } from 'wxt/browser';
import EditAutocomplete from './EditAutocomplete.vue';
import EditInteractionBase from './EditInteractionBase.vue';
type UploadFileData = {
  filePaths: string[];
  [key: string]: unknown;
};
const props = defineProps({
  data: {
    type: Object as () => UploadFileData,
    default: () => ({ filePaths: [] }),
  },
  hideBase: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits<{
  'update:data': [value: UploadFileData];
}>();
const { t } = useI18n();
const filePaths = ref([...props.data.filePaths]);
const hasFileAccess = ref(true);
const updateData = (value: Partial<UploadFileData>) => {
  emit('update:data', { ...props.data, ...value });
};
browser.extension.isAllowedFileSchemeAccess().then((value) => {
  hasFileAccess.value = value;
});
watch(
  filePaths,
  (paths) => {
    updateData({ filePaths: paths });
  },
  { deep: true }
);
</script>
