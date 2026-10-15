<template>
  <edit-interaction-base v-bind="{ data, hide: hideBase }" @change="updateData">
    <ui-select
      :model-value="data.eventName"
      :placeholder="t('workflow.blocks.trigger-event.selectEvent')"
      class="mt-4 w-full"
      @change="handleSelectChange"
    >
      <option v-for="event in eventList" :key="event.id" :value="event.id">
        {{ event.name }}
      </option>
    </ui-select>
    <button
      class="mb-2 mt-1 block flex w-full items-center text-left"
      @click="showOptions = !showOptions"
    >
      <v-remixicon
        name="riArrowLeftSLine"
        class="mr-1 -ml-1 transition-transform"
        :rotate="showOptions ? 270 : 180"
      />
      <span class="flex-1">{{ t('common.options') }}</span>
      <a
        v-if="data.eventName"
        :href="getEventDetailsUrl()"
        rel="noopener"
        target="_blank"
        @click.stop
      >
        <v-remixicon name="riInformationLine" size="20" />
      </a>
    </button>
    <transition-expand>
      <div v-if="showOptions">
        <div class="mb-4 grid grid-cols-2 gap-2">
          <ui-checkbox
            :model-value="params.bubbles"
            @change="updateParams({ ...params, bubbles: $event })"
          >
            Bubbles
          </ui-checkbox>
          <ui-checkbox
            :model-value="params.cancelable"
            @change="updateParams({ ...params, cancelable: $event })"
          >
            Cancelable
          </ui-checkbox>
        </div>
        <component
          :is="eventComponents[data.eventType]"
          v-if="eventComponents[data.eventType]"
          :key="data.eventName"
          :params="params"
          @update="updateParams({ ...params, ...$event })"
        />
      </div>
    </transition-expand>
  </edit-interaction-base>
</template>
<script setup lang="ts">
import type { TriggerEventData } from '@/types/block-editor';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { eventList } from '@/utils/shared';
import { toCamelCase } from '@/utils/helper';
import EditInteractionBase from './EditInteractionBase.vue';
import TriggerEventMouse from './TriggerEvent/TriggerEventMouse.vue';
import TriggerEventTouch from './TriggerEvent/TriggerEventTouch.vue';
import TriggerEventWheel from './TriggerEvent/TriggerEventWheel.vue';
import TriggerEventInput from './TriggerEvent/TriggerEventInput.vue';
import TriggerEventKeyboard from './TriggerEvent/TriggerEventKeyboard.vue';
const props = defineProps({
  data: {
    type: Object as () => TriggerEventData,
    default: () => ({}),
  },
  hideBase: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits<{ 'update:data': [value: TriggerEventData] }>();
const { t } = useI18n();
const eventComponents: Record<string, import('vue').Component | string> = {
  'mouse-event': TriggerEventMouse,
  'focus-event': '',
  event: '',
  'touch-event': TriggerEventTouch,
  'keyboard-event': TriggerEventKeyboard,
  'wheel-event': TriggerEventWheel,
  'input-event': TriggerEventInput,
};
const params = ref(props.data.eventParams);
const showOptions = ref(false);
const getEventDetailsUrl = () => {
  const eventType = toCamelCase(props.data.eventType);
  return `https://developer.mozilla.org/en-US/docs/Web/API/${eventType}/${eventType}`;
};
const updateData = (value: Partial<TriggerEventData>) => {
  emit('update:data', { ...props.data, ...value });
};
const updateParams = (value: import('@/types/block-editor').TriggerEventParams) => {
  params.value = value;
  updateData({ eventParams: value });
};
const handleSelectChange = (value: string) => {
  const eventType = eventList.find(({ id }) => id === value).type;
  const payload: Partial<TriggerEventData> = { eventName: value, eventType };
  if (eventType !== props.data.eventType) {
    const defaultParams = { bubbles: true, cancelable: true };
    payload.eventParams = defaultParams;
    params.value = defaultParams;
  }
  updateData(payload);
};
</script>
