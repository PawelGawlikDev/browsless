<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import { useMcpConnection } from '@/composable/useMcpConnection';

const { status, lastDraft, disconnect } = useMcpConnection();
onBeforeUnmount(() => disconnect());
</script>

<template>
  <aside
    v-if="status === 'connected'"
    class="fixed bottom-4 left-20 z-30 max-w-sm rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800"
    aria-label="External AI connection"
  >
    <div class="flex items-center gap-4">
      <router-link to="/external-ai" class="font-semibold text-primary underline"
        >External AI connected · drafts only</router-link
      >
      <button
        type="button"
        class="rounded px-2 py-1 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-gray-700"
        @click="disconnect()"
      >
        Disconnect
      </button>
    </div>
    <router-link
      v-if="lastDraft"
      :to="`/workflows/${lastDraft.id}`"
      class="mt-2 block truncate underline"
    >
      Review draft: {{ lastDraft.name }}
    </router-link>
  </aside>
</template>
