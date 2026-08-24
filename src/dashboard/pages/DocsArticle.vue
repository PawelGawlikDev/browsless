<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { docsSections, getDocsArticle } from '@/docs';

const route = useRoute();

const section = computed(() => String(route.params.section || ''));
const slug = computed(() => String(route.params.slug || ''));

const article = computed(() => getDocsArticle(section.value, slug.value));
const sectionTitle = computed(
  () => docsSections.find((item) => item.id === section.value)?.title ?? 'Documentation'
);
</script>

<template>
  <div class="container py-8">
    <div class="mx-auto max-w-4xl">
      <template v-if="article">
        <router-link
          to="/docs"
          class="mb-6 inline-flex items-center text-sm text-gray-600 transition-colors hover:text-accent dark:text-gray-200"
        >
          <v-remixicon name="riArrowLeftLine" class="mr-1" />
          Back to docs
        </router-link>

        <div class="mb-8">
          <p class="text-sm font-medium uppercase tracking-[0.2em] text-accent">{{ sectionTitle }}</p>
          <h1 class="mt-3 text-3xl font-semibold">{{ article.title }}</h1>
        </div>

        <article
          class="docs-article prose prose-zinc max-w-none rounded-xl border p-6 dark:prose-invert"
          v-html="article.html"
        />
      </template>

      <div v-else class="rounded-xl border p-6">
        <h1 class="text-2xl font-semibold">Document not found</h1>
        <p class="mt-3 text-gray-600 dark:text-gray-200">
          The requested documentation article is not available.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.docs-article :deep(img) {
  max-width: 100%;
  border-radius: 0.75rem;
}

.docs-article :deep(pre) {
  overflow-x: auto;
}
</style>
