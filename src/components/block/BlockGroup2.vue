<template>
  <div
    :style="{
      width: `${data.width || 400}px`,
      height: `${data.height || 300}px`,
    }"
    class="group-block-2 group relative rounded-lg border-2"
    style="
      min-width: 400px;
      min-height: 300px;
      border-color: #2563eb;
      background-color: rgb(37, 99, 235, 0.3);
    "
  >
    <div class="flex items-center p-4">
      <input
        :value="data.name"
        placeholder="name"
        type="text"
        class="rounded-lg bg-white px-4 py-2"
        @input="handleNameInput"
      />
      <div class="flex-1" />
      <v-remixicon
        name="riDeleteBin7Line"
        class="cursor-pointer"
        @click="$emit('delete', id)"
      />
    </div>
    <span
      ref="dragHandle"
      style="cursor: nw-resize"
      class="drag-handle invisible absolute bottom-0 right-0 h-4 w-4 bg-accent group-hover:visible"
    />
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { BlockNodeData } from '@/types/editor';

withDefaults(
  defineProps<{
    id?: string;
    label?: string;
    data?: BlockNodeData & { width?: number; height?: number; name?: string };
    position?: Record<string, unknown>;
    events?: Record<string, unknown>;
    dimensions?: Record<string, unknown>;
  }>(),
  {
    id: '',
    label: '',
    data: () => ({}),
    position: () => ({}),
    events: () => ({}),
    dimensions: () => ({}),
  }
);
const emit = defineEmits<{
  delete: [id: string];
  edit: [];
  update: [payload: Record<string, unknown>];
}>();
let parent: HTMLElement | null = null;
const initialRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};
const dragHandle = ref<HTMLElement | null>(null);
const handleNameInput = (event: Event) => {
  emit('update', { name: (event.target as HTMLInputElement).value });
};
const onMousemove = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  if (!parent) return;
  const width = initialRect.width + event.clientX - initialRect.x;
  const height = initialRect.height + event.clientY - initialRect.y;
  parent.style.width = `${width}px`;
  parent.style.height = `${height}px`;
  emit('update', { height, width });
};
const onMouseup = () => {
  document.documentElement.removeEventListener('mouseup', onMouseup);
  document.documentElement.removeEventListener('mousemove', onMousemove);
};
const initDragging = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  if (!parent) return;
  const { height, width } = getComputedStyle(parent);
  initialRect.x = event.clientX;
  initialRect.y = event.clientY;
  initialRect.width = parseInt(width, 10);
  initialRect.height = parseInt(height, 10);
  document.documentElement.addEventListener('mouseup', onMouseup);
  document.documentElement.addEventListener('mousemove', onMousemove);
};
onMounted(() => {
  parent = dragHandle.value?.closest('.group-block-2') as HTMLElement | null;
  dragHandle.value?.addEventListener('mousedown', initDragging as EventListener);
});
onBeforeUnmount(() => {
  dragHandle.value?.removeEventListener('mousedown', initDragging as EventListener);
});
</script>
