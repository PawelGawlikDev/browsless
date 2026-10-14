<template>
  <div ref="imageContainer" class="ui-image relative">
    <div class="flex items-center justify-center">
      <slot v-if="state.loading" name="loading">
        <div class="bg-input-dark absolute h-full w-full animate-pulse rounded-lg"></div>
      </slot>
      <slot v-else-if="state.error" name="error">
        <p class="text-lighter text-center">Failed to load image</p>
      </slot>
      <div
        v-else
        :style="{
          backgroundImage: `url(${src})`,
          backgroundSize: contain ? 'contain' : 'cover',
        }"
        v-bind="{ role: alt ? 'img' : null, 'aria-label': alt }"
        class="absolute top-0 left-0 h-full w-full bg-center bg-no-repeat"
      >
        <slot></slot>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, shallowReactive, onMounted } from 'vue';

const props = withDefaults(
  defineProps<{
    src?: string;
    alt?: string;
    lazy?: boolean;
    contain?: boolean;
  }>(),
  {
    src: '',
    alt: '',
  }
);
const emit = defineEmits<{
  error: [value: boolean];
  load: [value: boolean];
}>();

const imageContainer = ref<HTMLDivElement | null>(null);
const state = shallowReactive({
  loading: true,
  error: false,
});
const handleImageLoad = () => {
  state.loading = false;
  state.error = false;
  emit('load', true);
};
const handleImageError = () => {
  state.loading = false;
  state.error = true;
  emit('error', true);
};
const loadImage = () => {
  const image = new Image();
  image.onload = () => handleImageLoad();
  image.onerror = handleImageError;
  image.src = props.src;
};
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const { target } = entry;
      loadImage();
      observer.unobserve(target);
    }
  });
});
onMounted(() => {
  if (props.lazy && imageContainer.value) observer.observe(imageContainer.value);
  else loadImage();
});
</script>
