<template>
  <div
    :class="[data.color || 'white', colors[data.color || 'white']]"
    class="block-note rounded-lg p-4"
    style="min-width: 192px"
  >
    <div class="flex items-center border-b pb-2">
      <v-remixicon name="riFileEditLine" size="20" />
      <p class="mx-2 flex-1 font-semibold">Note</p>
      <ui-popover class="note-color">
        <template #trigger>
          <v-remixicon name="riSettings3Line" size="20" class="cursor-pointer" />
        </template>
        <p class="mb-1 ml-1 text-sm text-gray-600 dark:text-gray-200">Colors</p>
        <div class="flex items-center space-x-2">
          <span
            v-for="(color, colorId) in colors"
            :key="colorId"
            :class="color"
            style="border-width: 3px"
            class="inline-block h-8 w-8 cursor-pointer rounded-full"
            @click="updateData({ color: colorId })"
          />
        </div>
        <ui-select
          :model-value="data.fontSize"
          label="Font size"
          class="mt-2 w-full"
          @change="updateData({ fontSize: $event })"
        >
          <option v-for="(size, fontId) in fontSize" :key="fontId" :value="fontId">
            {{ size.name }}
          </option>
        </ui-select>
      </ui-popover>
      <hr class="mx-2 h-7 border-r" />
      <v-remixicon
        name="riDeleteBin7Line"
        size="20"
        class="cursor-pointer"
        @click="$emit('delete', id)"
      />
    </div>
    <textarea
      :value="data.note"
      :style="initialSize"
      :class="[fontSize[data.fontSize || 'regular'].class]"
      placeholder="Write a note here..."
      cols="30"
      rows="7"
      style="resize: both; min-width: 280px; min-height: 168px"
      class="mt-2 bg-transparent focus:ring-0"
      @keydown.stop
      @input="onNoteInput"
      @mousedown.stop
      @mouseup="onMouseup"
    />
  </div>
</template>
<script setup lang="ts">
import { debounce } from '@/utils/helper';

type NoteColor = 'white' | 'red' | 'indigo' | 'green' | 'amber' | 'sky';
type NoteFontSize = 'regular' | 'medium' | 'large' | 'extra-large';

const props = withDefaults(
  defineProps<{
    id?: string;
    label?: string;
    data?: {
      width?: number;
      height?: number;
      color?: NoteColor;
      fontSize?: NoteFontSize;
      note?: string;
    };
  }>(),
  {
    id: '',
    label: '',
    data: () => ({}),
  }
);
const emit = defineEmits<{
  update: [payload: Record<string, unknown>];
  delete: [id: string];
}>();
const initialSize = {
  width: `${props.data.width}px`,
  height: `${props.data.height}px`,
};
const colors: Record<NoteColor, string> = {
  white: 'bg-white dark:bg-gray-800',
  red: 'bg-red-200 dark:bg-red-300',
  indigo: 'bg-indigo-200 dark:bg-indigo-300',
  green: 'bg-green-200 dark:bg-green-300',
  amber: 'bg-amber-200 dark:bg-amber-300',
  sky: 'bg-sky-200 dark:bg-sky-300',
};
const fontSize: Record<NoteFontSize, { name: string; class: string }> = {
  regular: {
    name: 'Regular',
    class: 'text-base',
  },
  medium: {
    name: 'Medium',
    class: 'text-xl',
  },
  large: {
    name: 'Large',
    class: 'text-2xl',
  },
  'extra-large': {
    name: 'Extra Large',
    class: 'text-3xl',
  },
};
const updateData = debounce((data: Record<string, unknown>) => {
  emit('update', data);
}, 250);
const onNoteInput = (event: Event) => {
  updateData({ note: (event.target as HTMLTextAreaElement).value });
};
const onMouseup = ({ target }: MouseEvent) => {
  const { height, width } = (target as HTMLTextAreaElement).style;
  const parsedWidth = parseInt(width, 10);
  const parsedHeight = parseInt(height, 10);
  if (parsedWidth === props.data.width && parsedHeight === props.data.height) return;
  updateData({ height: parsedHeight, width: parsedWidth });
};
</script>
<style>
.note-color .ui-popover__trigger {
  display: flex;
  align-items: center;
}
.block-note * {
  border-color: rgb(0 0 0 / 12%);
}
.dark .block-note {
  &:not(.white) {
    color: rgb(17 24 39);
  }
  &.white * {
    border-color: rgb(255 255 255 / 12%);
  }
  * {
    border-color: rgb(0 0 0 / 12%);
  }
}
</style>
