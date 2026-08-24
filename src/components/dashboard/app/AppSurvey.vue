<template>
  <ui-card
    v-if="modalState.show"
    class="group fixed bottom-8 right-8 w-72 border-2 shadow-2xl"
  >
    <button
      class="absolute -right-2 -top-2 scale-0 rounded-full bg-white shadow-md transition group-hover:scale-100"
      @click="closeModal"
    >
      <v-remixicon class="text-gray-600" name="riCloseLine" />
    </button>
    <h2 class="text-lg font-semibold">
      {{ activeModal.title }}
    </h2>
    <p class="mt-1 text-gray-700 dark:text-gray-100">
      {{ activeModal.body }}
    </p>
    <div class="mt-4 space-y-2">
      <ui-button
        :href="activeModal.url"
        tag="a"
        target="_blank"
        rel="noopener"
        class="block w-full"
        variant="accent"
      >
        {{ activeModal.button }}
      </ui-button>
    </div>
  </ui-card>
</template>
<script setup>
import {
  extensionStorage,
  getExtensionStorageValue,
  setExtensionStorageValue,
} from '@/lib/extensionStorage';
import dayjs from '@/lib/dayjs';
import { computed, onMounted, shallowReactive } from 'vue';
const modalTypes = {
  testimonial: {
    title: 'Hi There 👋',
    body: 'Thanks for using Browsless. If it is helping, would you like to leave a short testimonial?',
    button: 'Give Testimonial',
    url: 'https://testimonial.to/browsless',
  },
  survey: {
    title: "How do you think we're doing?",
    body: 'To keep improving Browsless, we would appreciate a few minutes of feedback.',
    button: 'Take Survey',
    url: '',
  },
};
const modalState = shallowReactive({
  show: true,
  type: 'survey',
});
const closeModal = () => {
  let value = true;
  if (modalState.type === 'survey') {
    value = new Date().toString();
  }
  modalState.show = false;
  setExtensionStorageValue('local', `has-${modalState.type}`, value);
};
const checkModal = async () => {
  try {
    const { isFirstTime } = await extensionStorage.local.get('isFirstTime');
    if (isFirstTime) {
      modalState.show = false;
      await setExtensionStorageValue('local', 'has-testimonial', true);
      await setExtensionStorageValue('local', 'has-survey', Date.now());
      return;
    }
    const survey = await getExtensionStorageValue('local', 'has-survey');
    if (!survey) return;
    const daysDiff = dayjs().diff(survey, 'day');
    const showTestimonial =
      daysDiff >= 2 && !(await getExtensionStorageValue('local', 'has-testimonial'));
    if (showTestimonial) {
      modalState.show = true;
      modalState.type = 'testimonial';
    } else {
      modalState.show = false;
    }
  } catch (error) {
    console.error(error);
  }
};
const activeModal = computed(() => modalTypes[modalState.type]);
onMounted(checkModal);
</script>
