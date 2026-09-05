<template>
  <div class="max-w-xl">
    <h2 class="mb-2 font-semibold">
      {{ t('settings.backupWorkflows.title') }}
    </h2>
    <div class="flex space-x-4">
      <div class="w-6/12 rounded-lg border p-4 dark:border-gray-700">
        <div class="text-center">
          <span class="bg-box-transparent inline-block rounded-full p-4">
            <v-remixicon name="riDownloadLine" size="36" />
          </span>
        </div>
        <ui-checkbox v-model="state.encrypt" class="mt-12 mb-4">
          {{ t('settings.backupWorkflows.backup.encrypt') }}
        </ui-checkbox>
        <div class="flex items-center gap-2">
          <ui-popover @close="registerScheduleBackup">
            <template #trigger>
              <ui-button
                v-tooltip="t('settings.backupWorkflows.backup.settings')"
                icon
                :class="{ 'text-primary': localBackupSchedule.schedule }"
              >
                <v-remixicon name="riSettings3Line" />
              </ui-button>
            </template>
            <div class="w-64">
              <p class="mb-2 font-semibold">
                {{ t('settings.backupWorkflows.backup.settings') }}
              </p>
              <p>Also backup</p>
              <div class="flex mt-1 flex-col gap-2">
                <ui-checkbox
                  v-for="item in BACKUP_ITEMS_INCLUDES"
                  :key="item.id"
                  :model-value="localBackupSchedule.includedItems.includes(item.id)"
                  @change="
                    $event
                      ? localBackupSchedule.includedItems.push(item.id)
                      : localBackupSchedule.includedItems.splice(
                          localBackupSchedule.includedItems.indexOf(item.id),
                          1
                        )
                  "
                >
                  {{ item.name }}
                </ui-checkbox>
              </div>
              <p class="mt-4">
                {{ t('settings.backupWorkflows.backup.schedule') }}
              </p>
              <template v-if="!downloadPermission.has.downloads">
                <p class="text-gray-600 dark:text-gray-300 mt-1">
                  Browsless requires the "Downloads" permission for the schedule backup to
                  work
                </p>
                <ui-button class="mt-2 w-full" @click="downloadPermission.request()">
                  Allow "Downloads" permission
                </ui-button>
              </template>
              <template v-else>
                <ui-select v-model="localBackupSchedule.schedule" class="w-full mt-2">
                  <option value="">Never</option>
                  <option
                    v-for="(value, key) in BACKUP_SCHEDULES"
                    :key="key"
                    :value="key"
                  >
                    {{ value }}
                  </option>
                  <option value="custom">Custom</option>
                </ui-select>
                <template v-if="localBackupSchedule.schedule === 'custom'">
                  <ui-input
                    v-model="localBackupSchedule.customSchedule"
                    label="Cron Expression"
                    class="w-full mt-2"
                    placeholder="0 8 * * *"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {{ getBackupScheduleCron() }}
                  </p>
                </template>
                <ui-input
                  v-if="localBackupSchedule.schedule !== ''"
                  v-model="localBackupSchedule.folderName"
                  label="Folder name"
                  class="w-full mt-2"
                  placeholder="backup-folder"
                />
                <p
                  v-if="localBackupSchedule.lastBackup"
                  class="text-gray-600 dark:text-gray-300 text-sm mt-4"
                >
                  Last backup:
                  {{ dayjs(localBackupSchedule.lastBackup).fromNow() }}
                </p>
              </template>
            </div>
          </ui-popover>
          <ui-button class="flex-1" @click="backupWorkflows">
            {{ t('settings.backupWorkflows.backup.button') }}
          </ui-button>
        </div>
      </div>
      <div class="w-6/12 rounded-lg border p-4 dark:border-gray-700">
        <div class="text-center">
          <span class="bg-box-transparent inline-block rounded-full p-4">
            <v-remixicon name="riUploadLine" size="36" />
          </span>
        </div>
        <ui-checkbox v-model="state.updateIfExists" class="mt-6 mb-4">
          {{ t('settings.backupWorkflows.restore.update') }}
        </ui-checkbox>
        <ui-button class="w-full" @click="restoreWorkflows">
          {{ t('settings.backupWorkflows.restore.button') }}
        </ui-button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { extensionStorage } from '@/lib/extensionStorage';
import { useDialog } from '@/composable/dialog';
import { useHasPermissions } from '@/composable/hasPermissions';
import dbStorage from '@/db/storage';
import { readableCron } from '@/lib/cronstrue';
import { useWorkflowStore } from '@/stores/workflow';
import { fileSaver, openFilePicker, parseJSON } from '@/utils/helper';
import cronParser from 'cron-parser';
import AES from 'crypto-js/aes';
import encUtf8 from 'crypto-js/enc-utf8';
import hmacSHA256 from 'crypto-js/hmac-sha256';
import dayjs from 'dayjs';
import { onMounted, reactive, toRaw } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import { browser } from 'wxt/browser';
const BACKUP_SCHEDULES = {
  '0 8 * * *': 'Every day',
  '0 8 * * 0': 'Every week',
};
const BACKUP_ITEMS_INCLUDES = [
  { id: 'storage:table', name: 'Storage tables' },
  { id: 'storage:variables', name: 'Storage variables' },
];
const { t } = useI18n();
const toast = useToast();
const dialog = useDialog();
const workflowStore = useWorkflowStore();
const downloadPermission = useHasPermissions(['downloads']);
const state = reactive({
  lastSync: null,
  encrypt: false,
  lastBackup: null,
  loadingSync: false,
  updateIfExists: false,
});
const localBackupSchedule = reactive({
  schedule: '',
  lastBackup: null,
  includedItems: [],
  customSchedule: '',
  folderName: 'browsless-backup',
});
const registerScheduleBackup = async () => {
  try {
    if (!localBackupSchedule.schedule.trim()) {
      await browser.alarms.clear('schedule-local-backup');
    } else {
      const expression =
        localBackupSchedule.schedule === 'custom'
          ? localBackupSchedule.customSchedule
          : localBackupSchedule.schedule;
      const parsedExpression = cronParser.parseExpression(expression).next();
      if (!parsedExpression) return;
      await browser.alarms.create('schedule-local-backup', {
        when: parsedExpression.getTime(),
      });
    }
    extensionStorage.local.set({
      localBackupSettings: toRaw(localBackupSchedule),
    });
  } catch (error) {
    console.error(error);
  }
};
const getBackupScheduleCron = () => {
  try {
    const expression = localBackupSchedule.customSchedule;
    return `${readableCron(expression)}`;
  } catch (error) {
    return error.message;
  }
};
const backupWorkflows = async () => {
  try {
    const workflows = workflowStore.getWorkflows.reduce((acc, workflow) => {
      if (workflow.isProtected) return acc;
      delete workflow.$id;
      delete workflow.createdAt;
      delete workflow.data;
      delete workflow.isDisabled;
      delete workflow.isProtected;
      acc.push(workflow);
      return acc;
    }, []);
    const payload = {
      isProtected: state.encrypt,
      workflows: JSON.stringify(workflows),
    };
    if (localBackupSchedule.includedItems.includes('storage:table')) {
      const tables = await dbStorage.tablesItems.toArray();
      payload.storageTables = JSON.stringify(tables);
    }
    if (localBackupSchedule.includedItems.includes('storage:variables')) {
      const variables = await dbStorage.variables.toArray();
      payload.storageVariables = JSON.stringify(variables);
    }
    const downloadFile = (data) => {
      const fileName = `browsless-${dayjs().format('DD-MM-YYYY')}.json`;
      const blob = new Blob([JSON.stringify(data)], {
        type: 'application/json',
      });
      const objectUrl = URL.createObjectURL(blob);
      fileSaver(fileName, objectUrl);
      URL.revokeObjectURL(objectUrl);
    };
    if (state.encrypt) {
      dialog.prompt({
        placeholder: t('common.password'),
        title: t('settings.backupWorkflows.title'),
        okText: t('settings.backupWorkflows.backup.button'),
        inputType: 'password',
        onConfirm: (password) => {
          const encryptedWorkflows = AES.encrypt(payload.workflows, password).toString();
          const hmac = hmacSHA256(encryptedWorkflows, password).toString();
          payload.workflows = hmac + encryptedWorkflows;
          downloadFile(payload);
        },
      });
    } else {
      downloadFile(payload);
    }
  } catch (error) {
    console.error(error);
  }
};
const restoreWorkflows = async () => {
  try {
    const [file] = await openFilePicker('application/json');
    const reader = new FileReader();
    const insertWorkflows = (workflows) => {
      const newWorkflows = workflows.map((workflow) => {
        if (!state.updateIfExists) {
          workflow.createdAt = Date.now();
          delete workflow.id;
        }
        return workflow;
      });
      const showMessage = (event) => {
        toast(
          t('settings.backupWorkflows.workflowsAdded', {
            count: Object.values(event).length,
          })
        );
      };
      if (state.updateIfExists) {
        return workflowStore
          .insertOrUpdate(newWorkflows, { duplicateId: true })
          .then(showMessage);
      }
      return workflowStore.insert(newWorkflows).then(showMessage);
    };
    reader.onload = ({ target }) => {
      let payload = parseJSON(target.result, null);
      if (!payload) payload = parseJSON(window.decodeURIComponent(target.result), null);
      if (!payload) return;
      const storageTables = parseJSON(payload.storageTables, null);
      if (Array.isArray(storageTables)) {
        dbStorage.tablesItems.bulkPut(storageTables);
      }
      const storageVariables = parseJSON(payload.storageVariables, null);
      if (Array.isArray(storageVariables)) {
        dbStorage.variables.bulkPut(storageVariables);
      }
      if (payload.isProtected) {
        dialog.prompt({
          placeholder: t('common.password'),
          title: t('settings.backupWorkflows.restore.title'),
          okText: t('settings.backupWorkflows.restore.button'),
          inputType: 'password',
          onConfirm: (password) => {
            const hmac = payload.workflows.substring(0, 64);
            const encryptedWorkflows = payload.workflows.substring(64);
            const decryptedHmac = hmacSHA256(encryptedWorkflows, password).toString();
            if (hmac !== decryptedHmac) {
              toast.error(t('settings.backupWorkflows.invalidPassword'));
              return;
            }
            const decryptedWorkflows = AES.decrypt(encryptedWorkflows, password).toString(
              encUtf8
            );
            payload.workflows = parseJSON(decryptedWorkflows, []);
            insertWorkflows(payload.workflows);
          },
        });
      } else {
        payload.workflows = parseJSON(payload.workflows, []);
        insertWorkflows(payload.workflows);
      }
    };
    reader.readAsText(file);
  } catch (error) {
    console.error(error);
    toast.error(error.message);
  }
};
onMounted(async () => {
  const { lastBackup, lastSync, localBackupSettings } = await extensionStorage.local.get([
    'lastSync',
    'lastBackup',
    'localBackupSettings',
  ]);
  Object.assign(localBackupSchedule, localBackupSettings || {});
  state.lastSync = lastSync;
  state.lastBackup = lastBackup;
});
</script>
