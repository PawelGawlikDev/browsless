<template>
  <div class="flex items-center">
    <label class="flex items-center">
      <ui-switch v-model="options.useMask" />
      <span class="ml-2"> Use input masking </span>
    </label>
    <v-remixicon
      v-tooltip="{ content: maskInfo, allowHTML: true }"
      name="riInformationLine"
      class="ml-1 text-gray-600 dark:text-gray-200"
      size="20"
    />
  </div>
  <div v-if="options.useMask" class="mt-2">
    <p>Masks</p>
    <div class="space-y-2">
      <div v-for="(mask, index) in options.masks" :key="index" class="flex items-center">
        <ui-input v-model="options.masks[index].mask" placeholder="aaa-aaa-aaa" />
        <ui-checkbox v-model="mask.isRegex" class="ml-4"> Is RegEx </ui-checkbox>
        <div class="grow" />
        <v-remixicon
          name="riDeleteBin7Line"
          class="ml-1 shrink-0 cursor-pointer"
          @click="options.masks.splice(index, 1)"
        />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { ParameterOptions } from '@/types/block-editor';
import { reactive, watch, onMounted } from 'vue';
import cloneDeep from 'lodash.clonedeep';
const props = defineProps({
  modelValue: {
    type: Object as () => ParameterOptions,
    default: () => ({}),
  },
  defaultValue: {
    type: Object as () => ParameterOptions,
    default: () => ({}),
  },
});
const emit = defineEmits<{
  'update:modelValue': [value: ParameterOptions];
}>();
const maskInfo = `
Add mask to the input field
<p class="mt-2">Supported patterns</p>
<table class="tokens">
	<tbody>
		<tr>
			<td>0</td>
			<td>Any digit</td>
		</tr>
		<tr>
			<td>a</td>
			<td>Any letter</td>
		</tr>
		<tr>
			<td>*</td>
			<td>Any char</td>
		</tr>
		<tr>
			<td>[]</td>
			<td>Make input optional</td>
		</tr>
		<tr>
			<td>{}</td>
			<td>Include fixed part in unmasked value</td>
		</tr>
		<tr>
			<td>\`</td>
			<td>Prevent symbols shift back</td>
		</tr>
    <tr>
      <td>!</td>
      <td>Escape char</td>
    </tr>
	<tbody>
</table>
`;
const cloneData = cloneDeep(props.modelValue || {});
const options = reactive<ParameterOptions>({
  ...(props.defaultValue || {}),
  ...cloneData,
});
const addMask = () => {
  options.masks.push({
    isRegex: false,
    mask: '',
    lazy: false,
  });
};
watch(
  options,
  () => {
    emit('update:modelValue', options);
  },
  { deep: true }
);
onMounted(() => {
  if (options.masks.length === 0) {
    addMask();
  }
});
</script>
