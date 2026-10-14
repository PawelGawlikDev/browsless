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

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

withDefaults(
  defineProps<{
    currentLog?: Record<string, unknown>;
    tableData?: { body: Record<string, unknown>[]; header: Record<string, unknown>[] };
  }>(),
  {
    currentLog: () => ({}),
    tableData: () => ({
      body: [],
      header: [],
    }),
  }
);

const { t } = useI18n();
</script>
