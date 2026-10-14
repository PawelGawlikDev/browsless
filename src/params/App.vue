<template>
  <div
    v-if="retrieved"
    class="mx-auto flex h-full w-full max-w-lg flex-col dark:text-gray-100"
  >
    <nav class="mb-4 flex w-full items-center border-b p-4">
      <span class="p-1 dark:bg-none">
        <img src="@/assets/logo.svg" class="w-10" />
      </span>
      <p class="ml-4 text-lg font-semibold">Browsless</p>
    </nav>
    <div class="scroll flex-1 overflow-auto px-4 pb-4">
      <p class="my-4 text-gray-600 dark:text-gray-200">
        Input these workflows parameters before it runs.
      </p>
      <ui-expand
        v-for="(workflow, index) in sortedWorkflows"
        :key="index"
        :model-value="true"
        append-icon
        header-class="flex items-center text-left p-4 w-full rounded-lg"
        class="mb-4 rounded-lg bg-white dark:bg-gray-800"
      >
        <template #header>
          <ui-img
            v-if="workflow.data.icon?.startsWith('http')"
            :src="workflow.data.icon"
            class="overflow-hidden rounded-lg"
            style="height: 40px; width: 40px"
            alt="Can not display"
          />
          <span v-else class="bg-box-transparent rounded-lg p-2">
            <v-remixicon :name="workflow.data.icon" />
          </span>
          <div class="ml-4 ml-2 flex-1 overflow-hidden">
            <p class="text-overflow mr-4 leading-tight">
              {{ workflow.data.name }}
            </p>
            <p class="text-overflow leading-tight text-gray-600 dark:text-gray-200">
              {{ workflow.data.description }}
            </p>
          </div>
        </template>
        <p v-if="workflow.type === 'block'" class="px-4 pb-2">
          By Parameter Prompt block
        </p>
        <div class="px-4 pb-4">
          <ul class="space-y-4 divide-y">
            <li
              v-for="(param, paramIdx) in workflow.params"
              :key="paramIdx"
              class="flex flex-col gap-3"
            >
              <component
                :is="paramsList[param.type].valueComp"
                v-if="paramsList[param.type]"
                v-model="param.value"
                :autofocus="paramIdx === 0"
                :label="param.name + (param.data?.required ? '*' : '')"
                :param-data="param"
                class="w-full"
                @execute="
                  workflow.type === 'block'
                    ? continueWorkflow(index, workflow)
                    : runWorkflow(index, workflow)
                "
              />
              <ui-input
                v-else
                v-model="param.value"
                :type="param.inputType"
                :label="param.name + (param.data?.required ? '*' : '')"
                :placeholder="param.placeholder"
                class="w-full"
              />
              <p
                v-if="param.description"
                title="Description"
                class="ml-1 text-sm leading-tight"
              >
                {{ param.description }}
              </p>
            </li>
          </ul>
          <div class="mt-6 flex items-center">
            <p>{{ dayjs(workflow.addedDate).fromNow() }}</p>
            <div class="grow" />
            <template v-if="workflow.type === 'block'">
              <ui-button
                class="mr-4"
                @click="cancelParamBlock(index, workflow, 'Canceled')"
              >
                Cancel
              </ui-button>
              <ui-button
                :disabled="!isValidParams(workflow.params)"
                variant="accent"
                @click="continueWorkflow(index, workflow)"
              >
                Continue
              </ui-button>
            </template>
            <template v-else>
              <ui-button class="mr-4" @click="deleteWorkflow(index)"> Cancel </ui-button>
              <ui-button
                :disabled="!isValidParams(workflow.params)"
                variant="accent"
                @click="runWorkflow(index, workflow)"
              >
                <v-remixicon name="riPlayLine" class="mr-2 -ml-1" />
                Run
              </ui-button>
            </template>
          </div>
        </div>
      </ui-expand>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Component } from 'vue';
import type { Workflow, WorkflowMap } from '@/types/models';
import type { WorkflowParameter } from '@/types/block-editor';
import { sendMessage } from '@/utils/message';

type ParameterValue = string | number | boolean;
interface InputParameter extends WorkflowParameter {
  value?: ParameterValue;
  inputType?: string;
}
interface PromptData {
  promptId: string;
  timeout: number;
  timeoutMs: number;
  name: string;
  icon?: string;
  description?: string;
}
type PendingWorkflow = {
  params: InputParameter[];
  addedDate: number;
} & ({ type: 'workflow'; data: Workflow } | { type: 'block'; data: PromptData });
type ParamsMessage =
  | { name: 'workflow:params'; data: string | Workflow }
  | { name: 'workflow:params-block'; data: PromptData & { params: InputParameter[] } };

import { extensionStorage } from '@/lib/extensionStorage';
import { onMounted, ref, computed } from 'vue';
import { browser } from 'wxt/browser';
import { useTheme } from '@/composable/theme';
import dayjs from '@/lib/dayjs';
import { parseJSON } from '@/utils/helper';
import ParameterInputValue from '@/components/dashboard/workflow/edit/Parameter/ParameterInputValue.vue';
import ParameterJsonValue from '@/components/dashboard/workflow/edit/Parameter/ParameterJsonValue.vue';
import ParameterCheckboxValue from '@/components/dashboard/workflow/edit/Parameter/ParameterCheckboxValue.vue';
const paramsList: Record<
  string,
  { id: string; name: string; valueComp: Component; data?: { required: boolean } }
> = {
  string: {
    id: 'string',
    name: 'Input (string)',
    valueComp: ParameterInputValue,
  },
  json: {
    id: 'json',
    name: 'Input (JSON)',
    valueComp: ParameterJsonValue,
  },
  checkbox: {
    id: 'checkbox',
    name: 'Checkbox',
    valueComp: ParameterCheckboxValue,
    data: {
      required: false,
    },
  },
};
const theme = useTheme();
theme.init();
const retrieved = ref(false);
const workflows = ref<PendingWorkflow[]>([]);
const sortedWorkflows = computed(() =>
  workflows.value.slice().sort((a, b) => b.addedDate - a.addedDate)
);
const findWorkflow = async (workflowId: string): Promise<Workflow | null> => {
  if (!workflowId) return null;
  const { workflows: localWorkflows } = await extensionStorage.local.get(['workflows']);
  const saved = localWorkflows as WorkflowMap | Workflow[] | undefined;
  const workflow = Array.isArray(saved)
    ? saved.find(({ id }) => id === workflowId)
    : saved?.[workflowId];
  return workflow || null;
};
const deleteWorkflow = (index: number) => {
  const target = sortedWorkflows.value[index];
  if (!target) return;
  workflows.value.splice(workflows.value.indexOf(target), 1);
  if (workflows.value.length === 0) {
    window.close();
  }
};
const addWorkflow = async (workflowId: string | Workflow) => {
  try {
    const workflow =
      typeof workflowId === 'string' ? await findWorkflow(workflowId) : workflowId;
    if (!workflow) return;
    const triggerBlock = workflow.drawflow.nodes.find((node) => node.label === 'trigger');
    if (!triggerBlock) return;
    const parameters = triggerBlock.data.parameters as WorkflowParameter[] | undefined;
    const params = (parameters || []).map((param) => ({
      ...param,
      value: param.defaultValue,
      inputType: param.type === 'string' ? 'text' : 'number',
    }));
    workflows.value.push({
      type: 'workflow',
      params,
      data: workflow,
      addedDate: Date.now(),
    });
  } catch (error) {
    console.error(error);
  }
};
const getParamsValues = (params: InputParameter[]) => {
  const getParamVal: Record<string, (value: ParameterValue) => unknown> = {
    string: (str) => str,
    number: (num) => (Number.isNaN(+num) ? 0 : +num),
    json: (value) => parseJSON(value, null),
    default: (value) => value,
  };
  return params.reduce<Record<string, unknown>>((acc, param) => {
    const valueFunc = getParamVal[param.type] || getParamVal.default;
    const value = valueFunc(param.value ?? param.defaultValue ?? '');
    acc[param.name] = value;
    return acc;
  }, {});
};
const runWorkflow = (index: number, workflow: PendingWorkflow) => {
  if (workflow.type !== 'workflow') return;
  const { data, params } = workflow;
  const isParamsValid = isValidParams(params);
  if (!isParamsValid) return;
  const variables = getParamsValues(params);
  sendMessage(
    'workflow:execute',
    {
      ...data,
      options: { checkParams: false, data: { variables } },
    },
    'background'
  )
    .then(() => {
      deleteWorkflow(index);
    })
    .catch((error) => {
      console.error(error);
    });
};
const cancelParamBlock = (index: number, workflow: PendingWorkflow, message: string) => {
  if (workflow.type !== 'block') return;
  const { data } = workflow;
  extensionStorage.local
    .set({
      [data.promptId]: {
        message,
        $isError: true,
      },
    })
    .then(() => {
      deleteWorkflow(index);
    });
};
const continueWorkflow = (index: number, workflow: PendingWorkflow) => {
  if (workflow.type !== 'block') return;
  const { data, params } = workflow;
  const isParamsValid = isValidParams(params);
  if (!isParamsValid) return;
  const timeout = data.timeoutMs > 0 ? Date.now() > data.timeout : false;
  extensionStorage.local
    .set({
      [data.promptId]: timeout ? { $timeout: true } : getParamsValues(params),
    })
    .then(() => {
      deleteWorkflow(index);
    });
};
const isValidParams = (params: InputParameter[]) => {
  const isValid = params.every((param) => {
    if (!param.data?.required) return true;
    return param.value;
  });
  return isValid;
};
let checkTimeout: ReturnType<typeof setInterval> | null = null;
browser.runtime.onMessage.addListener((message: ParamsMessage) => {
  if (message.name === 'workflow:params') {
    addWorkflow(message.data);
  } else if (message.name === 'workflow:params-block') {
    const { params, ...data } = message.data;
    workflows.value.push({
      data,
      params,
      type: 'block',
      addedDate: Date.now(),
    });
    if (!checkTimeout) {
      checkTimeout = setInterval(() => {
        sortedWorkflows.value.forEach((workflow, index) => {
          if (
            workflow.type !== 'block' ||
            Date.now() < workflow.data.timeout ||
            workflow.data.timeoutMs <= 0
          )
            return;
          cancelParamBlock(index, workflow, 'Timeout');
        });
      }, 1000);
    }
  }
});
onMounted(async () => {
  try {
    const query = new URLSearchParams(window.location.search);
    const workflowId = query.get('workflowId');
    if (workflowId) addWorkflow(workflowId);
  } catch (error) {
    console.log(error);
  } finally {
    retrieved.value = true;
  }
});
</script>
