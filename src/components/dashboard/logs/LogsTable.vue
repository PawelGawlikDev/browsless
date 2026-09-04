<template>
  <div>
    <ui-table
      v-if="tableData.body.length > 0"
      :headers="tableData.header"
      :items="tableData.body"
      item-key="id"
      with-pagination
    />
    <div v-else class="py-12 text-center text-gray-600 dark:text-gray-300">
      {{ t('message.noData') }}
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

defineProps({
  currentLog: {
    type: Object,
    default: () => ({}),
  },
  tableData: {
    type: Object,
    default: () => ({
      body: [],
      header: [],
    }),
  },
});

const { t } = useI18n();
</script>
