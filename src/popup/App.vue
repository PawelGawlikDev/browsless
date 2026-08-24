<template>
  <template v-if="retrieved">
    <router-view />
    <ui-dialog />
  </template>
</template>
<script setup>
import { extensionStorage } from '@/lib/extensionStorage';
import { ref, onMounted } from 'vue';
import { useStore } from '@/stores/main';
import { sendMessage } from '@/utils/message';
import { useWorkflowStore } from '@/stores/workflow';
import { loadLocaleMessages, setI18nLanguage } from '@/lib/vueI18n';

const store = useStore();
const workflowStore = useWorkflowStore();

const retrieved = ref(false);

extensionStorage.local.get('isRecording').then(({ isRecording }) => {
  if (!isRecording) return;

  sendMessage('open:dashboard', '/recording', 'background').then(() => {
    window.close();
  });
});

onMounted(async () => {
  try {
    await store.loadSettings();
    await loadLocaleMessages(store.settings.locale, 'popup');
    setI18nLanguage(store.settings.locale);

    await workflowStore.loadData();

    retrieved.value = true;
  } catch (error) {
    console.error(error);
    retrieved.value = true;
  }
});
</script>
<style>
html,
body {
  height: 500px;
  width: 350px;
  font-size: 16px;
  overscroll-behavior: none;
}

#app {
  height: 100%;
  overscroll-behavior: none;
}
</style>
