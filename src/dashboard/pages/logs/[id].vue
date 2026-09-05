<template>
  <div class="container py-6">
    <app-logs-items v-if="!logId" @select="onSelectLog" @close="goToLogs" />
    <app-logs-item-running v-else-if="isRunning" :log-id="logId" @close="goToLogs" />
    <app-logs-item v-else :log-id="logId" @close="goToLogs" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLogsItem from '@/components/dashboard/app/AppLogsItem.vue';
import AppLogsItemRunning from '@/components/dashboard/app/AppLogsItemRunning.vue';
import AppLogsItems from '@/components/dashboard/app/AppLogsItems.vue';

const route = useRoute();
const router = useRouter();

const logId = computed(() => {
  const value = route.params.id;
  return Array.isArray(value) ? value[0] || '' : value || '';
});

const isRunning = computed(() => route.params.mode === 'running');

const goToLogs = () => {
  router.push('/logs');
};

const onSelectLog = ({ id, type }) => {
  router.push(type === 'running' ? `/logs/${id}/running` : `/logs/${id}`);
};
</script>
