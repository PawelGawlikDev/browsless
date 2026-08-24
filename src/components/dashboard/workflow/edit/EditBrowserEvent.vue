<template>
  <div>
    <ui-textarea
      :model-value="data.description"
      class="w-full"
      :placeholder="t('common.description')"
      @change="updateData({ description: $event })"
    />
    <ui-input
      :model-value="data.timeout"
      :label="t('workflow.blocks.browser-event.timeout')"
      type="number"
      class="w-full"
      @change="updateData({ timeout: +$event })"
    />
    <ui-select
      :placeholder="t('workflow.blocks.browser-event.events')"
      :model-value="data.eventName"
      class="mt-2 w-full"
      @change="updateData({ eventName: $event })"
    >
      <optgroup v-for="(events, label) in browserEvents" :key="label" :label="label">
        <option v-for="event in events" :key="event.id" :value="event.id">
          {{ event.name }}
        </option>
      </optgroup>
    </ui-select>
    <template v-if="data.eventName === 'tab:loaded'">
      <ui-input
        v-if="!data.activeTabLoaded"
        :model-value="data.tabLoadedUrl"
        type="url"
        class="mt-1 w-full"
        placeholder="https://example.org/*"
        @change="updateData({ tabLoadedUrl: $event })"
      >
        <template #label>
          <span>Match pattern</span>
          <a
            href="https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns#examples"
            target="_blank"
            rel="noopener"
            title="Examples"
          >
            <v-remixicon class="ml-1 inline-block" name="riInformationLine" size="18" />
          </a>
        </template>
      </ui-input>
      <ui-checkbox
        :model-value="data.activeTabLoaded"
        class="mt-1"
        @change="updateData({ activeTabLoaded: $event })"
      >
        {{ t('workflow.blocks.browser-event.activeTabLoaded') }}
      </ui-checkbox>
    </template>
    <template v-if="['tab:create', 'window:create'].includes(data.eventName)">
      <ui-input
        :model-value="data.tabUrl"
        type="url"
        label="Filter"
        class="mt-1 w-full"
        placeholder="URL or Regex"
        @change="updateData({ tabUrl: $event })"
      />
      <ui-checkbox
        :model-value="data.setAsActiveTab"
        class="mt-1"
        @change="updateData({ setAsActiveTab: $event })"
      >
        {{ t('workflow.blocks.browser-event.setAsActiveTab') }}
      </ui-checkbox>
    </template>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
type BrowserEventData = {
  description?: string;
  timeout?: number;
  eventName?:
    'tab:loaded' | 'tab:close' | 'tab:create' | 'window:create' | 'window:close';
  activeTabLoaded?: boolean;
  tabLoadedUrl?: string;
  tabUrl?: string;
  setAsActiveTab?: boolean;
  [key: string]: unknown;
};
type BrowserEventOption = {
  id: NonNullable<BrowserEventData['eventName']>;
  name: string;
};
const props = defineProps({
  data: {
    type: Object as () => BrowserEventData,
    default: () => ({}),
  },
});
const emit = defineEmits<{
  'update:data': [value: BrowserEventData];
}>();
const { t } = useI18n();
const browserEvents: Record<string, BrowserEventOption[]> = {
  Tab: [
    { id: 'tab:close', name: 'Tab closed' },
    { id: 'tab:loaded', name: 'Tab loaded' },
    { id: 'tab:create', name: 'Tab created' },
  ],
  Window: [
    { id: 'window:create', name: 'Window created' },
    { id: 'window:close', name: 'Window closed' },
  ],
};
const updateData = (value: Partial<BrowserEventData>) => {
  emit('update:data', { ...props.data, ...value });
};
</script>
