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
<script setup lang="ts">
import { extensionStorage } from '@/lib/extensionStorage';
import { useDialog } from '@/composable/dialog';
import { useHasPermissions } from '@/composable/hasPermissions';
import dbStorage from '@/db/storage';
import { readableCron } from '@/lib/cronstrue';
import { useWorkflowStore, type WorkflowStoreInstance } from '@/stores/workflow';
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
import type { Workflow } from '@/types/models';

interface BackupPayload {
  isProtected: boolean;
  workflows: string;
  storageTables?: string;
  storageVariables?: string;
}

const BACKUP_SCHEDULES: Record<string, string> = {
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
const workflowStore = useWorkflowStore() as WorkflowStoreInstance;
const downloadPermission = useHasPermissions(['downloads']);
const state = reactive<{
  lastSync: number | null;
  encrypt: boolean;
  lastBackup: number | null;
  loadingSync: boolean;
  updateIfExists: boolean;
}>({
  lastSync: null,
  encrypt: false,
  lastBackup: null,
  loadingSync: false,
  updateIfExists: false,
});
const localBackupSchedule = reactive<{
  schedule: string;
  lastBackup: number | null;
  includedItems: string[];
  customSchedule: string;
  folderName: string;
}>({
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
      const parsedExpression = cronParser.parse(expression).next();
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
    return (error as Error).message;
  }
};
const backupWorkflows = async () => {
  try {
    const workflows = workflowStore.getWorkflows.reduce<Partial<Workflow>[]>(
      (acc, workflow) => {
        if (workflow.isProtected) return acc;
        const workflowCopy = { ...workflow } as Partial<Workflow>;
        delete workflowCopy.$id;
        delete workflowCopy.createdAt;
        delete workflowCopy.data;
        delete workflowCopy.isDisabled;
        delete workflowCopy.isProtected;
        acc.push(workflowCopy);
        return acc;
      },
      []
    );
    const payload: BackupPayload = {
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
    const downloadFile = (data: BackupPayload) => {
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
        onConfirm: (password: string) => {
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
    const insertWorkflows = (workflows: Partial<Workflow>[]) => {
      const newWorkflows = workflows.map((workflow) => {
        if (!state.updateIfExists) {
          workflow.createdAt = Date.now();
          delete workflow.id;
        }
        return workflow;
      });
      const showMessage = (event: Record<string, unknown>) => {
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
    reader.onload = ({ target }: ProgressEvent<FileReader>) => {
      let payload = parseJSON<BackupPayload | null>(target?.result as string, null);
      if (!payload) {
        payload = parseJSON<BackupPayload | null>(
          window.decodeURIComponent(target?.result as string),
          null
        );
      }
      if (!payload) return;
      const storageTables = parseJSON<unknown>(payload.storageTables as string, null);
      if (Array.isArray(storageTables)) {
        dbStorage.tablesItems.bulkPut(storageTables);
      }
      const storageVariables = parseJSON<unknown>(
        payload.storageVariables as string,
        null
      );
      if (Array.isArray(storageVariables)) {
        dbStorage.variables.bulkPut(storageVariables);
      }
      if (payload.isProtected) {
        dialog.prompt({
          placeholder: t('common.password'),
          title: t('settings.backupWorkflows.restore.title'),
          okText: t('settings.backupWorkflows.restore.button'),
          inputType: 'password',
          onConfirm: (password: string) => {
            if (!payload) return;
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
            const parsedWorkflows = parseJSON<Partial<Workflow>[]>(
              decryptedWorkflows,
              []
            );
            insertWorkflows(parsedWorkflows);
          },
        });
      } else {
        const parsedWorkflows = parseJSON<Partial<Workflow>[]>(payload.workflows, []);
        insertWorkflows(parsedWorkflows);
      }
    };
    reader.readAsText(file);
  } catch (error) {
    console.error(error);
    toast.error((error as Error).message);
  }
};
onMounted(async () => {
  const { lastBackup, lastSync, localBackupSettings } = (await extensionStorage.local.get(
    ['lastSync', 'lastBackup', 'localBackupSettings']
  )) as {
    lastSync?: number;
    lastBackup?: number;
    localBackupSettings?: Partial<typeof localBackupSchedule>;
  };
  Object.assign(localBackupSchedule, localBackupSettings || {});
  state.lastSync = lastSync ?? null;
  state.lastBackup = lastBackup ?? null;
});
</script>
