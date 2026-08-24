<template>
  <div class="container py-6">
    <app-logs-items v-if="!logId" @select="onSelectLog" />
    <app-logs-item-running v-else-if="isRunning" :log-id="logId" @close="closeItemPage" />
    <app-logs-item v-else :log-id="logId" @close="closeItemPage" />
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

const logId = computed(() => `${route.params.id || ''}`);
const isRunning = computed(() => route.params.mode === 'running');

const closeItemPage = () => {
  router.push('/logs');
};

const onSelectLog = ({ id, type }) => {
  const path = type === 'running' ? `/logs/${id}/running` : `/logs/${id}`;
  router.push(path);
};
</script>
