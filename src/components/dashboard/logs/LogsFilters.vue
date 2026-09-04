<template>
  <div class="mb-6 space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <ui-input
        :model-value="filters.query"
        class="min-w-[220px] flex-1"
        prepend-icon="riSearch2Line"
        placeholder="Search logs..."
        @update:model-value="emitFilter('query', $event)"
      />
      <ui-select
        :model-value="filters.byStatus"
        class="min-w-[150px]"
        @change="emitFilter('byStatus', $event)"
      >
        <option value="all">All status</option>
        <option value="success">{{ t('logStatus.success') }}</option>
        <option value="error">{{ t('logStatus.error') }}</option>
        <option value="stopped">{{ t('logStatus.stopped') }}</option>
      </ui-select>
      <ui-select
        :model-value="filters.byDate"
        class="min-w-[150px]"
        @change="emitFilter('byDate', +$event)"
      >
        <option :value="0">All dates</option>
        <option :value="1">Last 24 hours</option>
        <option :value="7">Last 7 days</option>
        <option :value="30">Last 30 days</option>
      </ui-select>
      <ui-select
        :model-value="sorts.by"
        class="min-w-[150px]"
        @change="emitSort('by', $event)"
      >
        <option value="endedAt">Ended at</option>
        <option value="startedAt">Started at</option>
        <option value="name">Name</option>
        <option value="status">Status</option>
      </ui-select>
      <ui-select
        :model-value="sorts.order"
        class="min-w-[140px]"
        @change="emitSort('order', $event)"
      >
        <option value="desc">Newest first</option>
        <option value="asc">Oldest first</option>
      </ui-select>
      <ui-button btn-type="transparent" @click="$emit('clear')"> Clear logs </ui-button>
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

defineProps({
  filters: {
    type: Object,
    default: () => ({}),
  },
  sorts: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['clear', 'updateFilters', 'updateSorts']);
const { t } = useI18n();

const emitFilter = (key, value) => {
  emit('updateFilters', { key, value });
};

const emitSort = (key, value) => {
  emit('updateSorts', { key, value });
};
</script>
