<template>
  <ui-tabs
    v-if="!hideBlocks || selectElements.length > 0"
    :model-value="activeTab"
    class="mt-2"
    fill
    @change="$emit('update:activeTab', $event)"
  >
    <ui-tab value="attributes"> Attributes </ui-tab>
    <ui-tab v-if="selectElements.length > 0" value="options"> Options </ui-tab>
    <ui-tab v-if="!hideBlocks" value="blocks"> Blocks </ui-tab>
  </ui-tabs>
  <ui-tab-panels
    :model-value="activeTab"
    class="scroll overflow-y-auto"
    style="max-height: calc(100vh - 17rem)"
  >
    <ui-tab-panel value="attributes">
      <selector-element-list
        :elements="selectedElements"
        @highlight="$emit('highlight', $event)"
      >
        <template #item="{ element }">
          <div
            v-for="(value, name) in element.attributes"
            :key="name"
            class="bg-box-transparent mb-1 rounded-lg py-2 px-3"
          >
            <p
              class="text-overflow text-sm leading-tight text-gray-600"
              title="Attribute name"
            >
              {{ name }}
            </p>
            <ui-input
              :model-value="value"
              :placeholder="!value ? 'EMPTY' : null"
              :data-testid="name"
              :title="name"
              readonly
              class="w-full"
            >
              <template #prepend>
                <button class="absolute ml-2" @click="copySelector(name, value)">
                  <v-remixicon name="riFileCopyLine" />
                </button>
              </template>
            </ui-input>
          </div>
        </template>
      </selector-element-list>
    </ui-tab-panel>
    <ui-tab-panel value="options">
      <selector-element-list
        :elements="selectElements"
        element-name="Select element options"
        @highlight="
          $emit('highlight', {
            index: $event.element.elIndex,
            highlight: $event.highlight,
          })
        "
      >
        <template #item="{ element }">
          <div
            v-for="option in element.options"
            :key="option.name"
            class="bg-box-transparent mb-1 rounded-lg py-2 px-3"
          >
            <p
              class="text-overflow text-sm leading-tight text-gray-600"
              title="Option name"
            >
              {{ option.name }}
            </p>
            <input
              :value="option.value"
              title="Option value"
              class="text-overflow w-full bg-transparent"
              readonly
              @click="($event.target as HTMLInputElement).select()"
            />
          </div>
        </template>
      </selector-element-list>
    </ui-tab-panel>
    <ui-tab-panel value="blocks">
      <selector-blocks
        :elements="selectedElements"
        :selector="elSelector"
        @execute="$emit('execute', $event)"
        @update="$emit('update')"
      />
    </ui-tab-panel>
  </ui-tab-panels>
</template>
<script setup lang="ts">
import { inject } from 'vue';
import type { SelectedElementRect } from '@/content/elementSelector/types';
import SelectorBlocks from './SelectorBlocks.vue';
import SelectorElementList from './SelectorElementList.vue';

const props = withDefaults(
  defineProps<{
    activeTab?: string;
    selectElements?: SelectedElementRect[];
    selectedElements?: SelectedElementRect[];
    elSelector?: string;
    hideBlocks?: boolean;
  }>(),
  {
    activeTab: '',
    selectElements: () => [],
    selectedElements: () => [],
    elSelector: '',
  }
);
defineEmits<{
  'update:activeTab': [value: string];
  execute: [running: boolean];
  highlight: [payload: { highlight: boolean; index: number }];
  update: [];
}>();
const rootElement = inject<HTMLElement>('rootElement');
const copySelector = (name: string, value: unknown) => {
  (
    rootElement?.shadowRoot?.querySelector(
      `[data-testid="${name}"] input`
    ) as HTMLInputElement | null
  )?.select();
  const type = (
    rootElement?.shadowRoot?.querySelector(`select#select--1`) as HTMLSelectElement | null
  )?.value;
  const tagName = props.selectedElements[0]?.tagName?.toLowerCase();
  navigator.clipboard
    .writeText(
      type === 'css'
        ? `${tagName}[${name}="${value}"]`
        : `//${tagName}[@${name}='${value}']`
    )
    .catch((error) => {
      document.execCommand('copy');
      console.error(error);
    });
};
</script>
