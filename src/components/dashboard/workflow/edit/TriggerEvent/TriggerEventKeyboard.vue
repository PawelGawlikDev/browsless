<template>
  <div class="grid grid-cols-2 gap-2">
    <ui-checkbox
      v-for="item in ['altKey', 'ctrlKey', 'metaKey', 'shiftKey']"
      :key="item"
      v-model="defaultParams[item]"
    >
      {{ item }}
    </ui-checkbox>
  </div>
  <ui-input
    v-model="defaultParams.key"
    class="mt-2 w-full"
    label="key"
    placeholder="a"
    @change="findKeyDefintion"
  />
  <div class="mt-1 flex items-center space-x-2">
    <ui-input
      v-model="defaultParams.code"
      class="flex-1"
      label="code"
      placeholder="KeyA"
    />
    <ui-input
      v-model.number="defaultParams.keyCode"
      type="number"
      class="flex-1"
      label="keyCode"
    />
  </div>
  <ui-checkbox v-model="defaultParams.repeat" class="mt-4"> Repeat </ui-checkbox>
</template>
<script setup lang="ts">
import type { TriggerEventParams } from '@/types/block-editor';
import { shallowReactive, watch, onMounted } from 'vue';
import { keyDefinitions } from '@/utils/USKeyboardLayout';
const props = defineProps({
  params: {
    type: Object as () => TriggerEventParams,
    default: () => ({}),
  },
});
const emit = defineEmits<{ update: [params: TriggerEventParams] }>();
const defaultParams = shallowReactive({
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  code: '',
  key: '',
  keyCode: 0,
  repeat: false,
});
const findKeyDefintion = (value: string) => {
  const keyDefinition = keyDefinitions[value as keyof typeof keyDefinitions];
  if (!keyDefinition) return;
  defaultParams.code = 'code' in keyDefinition ? keyDefinition.code : '';
  defaultParams.keyCode = 'keyCode' in keyDefinition ? keyDefinition.keyCode : 0;
};
watch(
  defaultParams,
  (value) => {
    emit('update', value);
  },
  { deep: true }
);
onMounted(() => {
  (Object.keys(defaultParams) as (keyof typeof defaultParams)[]).forEach((key) => {
    const value: unknown = props.params[key];
    if (typeof value === typeof defaultParams[key])
      Object.assign(defaultParams, { [key]: value });
  });
});
</script>
