<template>
  <p v-if="recording.isChanged" class="mb-4 text-gray-600 dark:text-gray-200">
    {{ t('settings.language.reloadPage') }}
  </p>
  <div class="mb-8 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
    <p class="mb-2 font-semibold capitalize">Browsless</p>
    <ui-list>
      <ui-list-item class="group">
        <p class="flex-1">Shortcut</p>
        <template v-if="recording.id === 'browsless:shortcut'">
          <kbd v-for="key in recording.keys" :key="key">
            {{ getReadableShortcut(key) }}
          </kbd>
          <button v-tooltip="t('common.cancel')" class="mr-2 ml-4" @click="cleanUp">
            <v-remixicon name="riCloseLine" />
          </button>
          <button
            v-tooltip="t('workflow.blocks.trigger.shortcut.stopRecord')"
            @click="stopRecording"
          >
            <v-remixicon name="riStopLine" />
          </button>
        </template>
        <template v-else>
          <button
            v-tooltip="'Remove shortcut'"
            class="invisible mr-4 group-hover:visible"
            @click="removeShortcut('browsless:shortcut')"
          >
            <v-remixicon name="riDeleteBin7Line" />
          </button>
          <button
            v-tooltip="t('workflow.blocks.trigger.shortcut.tooltip')"
            class="invisible group-hover:visible"
            @click="startRecording({ id: 'browsless:shortcut' })"
          >
            <v-remixicon name="riRecordCircleLine" />
          </button>
          <kbd v-for="key in browslessShortcut.split('+')" :key="key">
            {{ key }}
          </kbd>
        </template>
      </ui-list-item>
    </ui-list>
  </div>
  <div
    v-for="(items, category) in shortcutsCats"
    :key="category"
    class="mb-8 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
  >
    <p class="mb-2 font-semibold capitalize">{{ category }}</p>
    <ui-list class="space-y-1 text-gray-600 dark:text-gray-200">
      <ui-list-item v-for="shortcut in items" :key="shortcut.id" class="group h-12">
        <p class="mr-4 flex-1 capitalize">
          {{ shortcut.name }}
        </p>
        <template v-if="recording.id === shortcut.id">
          <kbd v-for="key in recording.keys" :key="key">
            {{ getReadableShortcut(key) }}
          </kbd>
          <button v-tooltip="t('common.cancel')" class="mr-2 ml-4" @click="cleanUp">
            <v-remixicon name="riCloseLine" />
          </button>
          <button
            v-tooltip="t('workflow.blocks.trigger.shortcut.stopRecord')"
            @click="stopRecording"
          >
            <v-remixicon name="riStopLine" />
          </button>
        </template>
        <template v-else>
          <button
            v-tooltip="t('workflow.blocks.trigger.shortcut.tooltip')"
            class="invisible group-hover:visible"
            @click="startRecording(shortcut)"
          >
            <v-remixicon name="riRecordCircleLine" />
          </button>
          <kbd v-for="key in shortcut.keys" :key="key">
            {{ key }}
          </kbd>
        </template>
      </ui-list-item>
    </ui-list>
  </div>
</template>
<script setup>
import { extensionStorage } from '@/lib/extensionStorage';
import { ref, reactive, computed, onBeforeUnmount, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import { mapShortcuts, getReadableShortcut } from '@/composable/shortcut';
import { recordShortcut } from '@/utils/recordKeys';
const { t } = useI18n();
const toast = useToast();
const shortcuts = ref(mapShortcuts);
const browslessShortcut = ref(getReadableShortcut('mod+shift+e'));
const recording = reactive({
  id: '',
  keys: [],
  isChanged: false,
});
const shortcutsCats = computed(() => {
  const arr = Object.values(shortcuts.value);
  const result = {};
  arr.forEach((item) => {
    const [category, shortcutName] = item.id.split(':');
    const readableKey = getReadableShortcut(item.combo);
    const name = shortcutName.replace('-', ' ');
    (result[category] = result[category] || []).push({
      ...item,
      name,
      keys: readableKey.split('+'),
    });
  });
  return result;
});
const keydownListener = (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (!recording.id) {
    document.removeEventListener('keydown', keydownListener, true);
    return;
  }
  recordShortcut(event, (keys) => {
    recording.keys = keys;
  });
};
const cleanUp = () => {
  recording.id = '';
  recording.keys = [];
  document.removeEventListener('keydown', keydownListener, true);
};
const startRecording = ({ id }) => {
  if (!recording.id) {
    document.addEventListener('keydown', keydownListener, true);
  }
  recording.keys = [];
  recording.id = id;
};
const removeShortcut = (shortcutId) => {
  if (shortcutId !== 'browsless:shortcut') return;
  extensionStorage.local.set({ browslessShortcut: [] });
  browslessShortcut.value = '';
};
const stopRecording = () => {
  if (recording.keys.length === 0) return;
  const newCombo = recording.keys.join('+');
  if (recording.id.startsWith('browsless')) {
    extensionStorage.local.set({ browslessShortcut: newCombo });
    browslessShortcut.value = getReadableShortcut(newCombo);
    cleanUp();
    return;
  }
  const isDuplicate = Object.keys(shortcuts.value).find((key) => {
    return shortcuts.value[key].combo === newCombo && key !== recording.id;
  });
  if (isDuplicate) {
    toast.error(t('settings.shortcuts.duplicate', { name: isDuplicate }));
    return;
  }
  shortcuts.value[recording.id].combo = newCombo;
  cleanUp();
  recording.isChanged = true;
  extensionStorage.local.set({
    shortcuts: JSON.parse(JSON.stringify(shortcuts.value)),
  });
};
onMounted(() => {
  extensionStorage.local.get('browslessShortcut').then((storage) => {
    if (!storage.browslessShortcut) return;
    browslessShortcut.value = getReadableShortcut(storage.browslessShortcut);
  });
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', keydownListener, true);
});
</script>
<style scoped>
kbd {
  min-width: 30px;
  text-align: center;
  text-transform: uppercase;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(203 213 225);
  font-size: 0.875rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
  margin-left: 0.25rem;
}
</style>
