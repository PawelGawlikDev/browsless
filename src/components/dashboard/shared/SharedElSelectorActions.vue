<template>
  <div class="inline-flex items-center">
    <ui-button
      v-tooltip.group="$t('workflow.blocks.base.element.select')"
      icon
      class="mr-2"
      @click="selectElement"
    >
      <v-remixicon name="riFocus3Line" />
    </ui-button>
    <ui-button
      v-tooltip.group="$t('workflow.blocks.base.element.verify')"
      :disabled="!selector"
      icon
      @click="verifySelector"
    >
      <v-remixicon name="riCheckDoubleLine" />
    </ui-button>
  </div>
</template>
<script setup lang="ts">
import { useToast } from 'vue-toastification';
import { useGroupTooltip } from '@/composable/groupTooltip';
import elementSelector from '@/dashboard/utils/elementSelector';

const props = withDefaults(
  defineProps<{
    findBy?: string | null;
    multiple?: boolean;
    selector?: string;
  }>(),
  {
    findBy: null,
    multiple: false,
    selector: '',
  }
);
const emit = defineEmits<{
  'update:selector': [selector: string];
}>();
useGroupTooltip();
const toast = useToast();
const selectElement = () => {
  elementSelector.selectElement().then((selector) => {
    emit('update:selector', selector);
  });
};
const verifySelector = () => {
  elementSelector
    .verifySelector({
      selector: props.selector,
      multiple: props.multiple,
      findBy: props.findBy,
    })
    .then((result) => {
      if (!('notFound' in result) || !result.notFound) return;
      toast.error('Element not found');
    });
};
</script>
