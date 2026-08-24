<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { docsSections } from '@/docs';
const searchQuery = ref('');
const expandedSections = reactive(
  docsSections.reduce<Record<string, boolean>>((acc, section) => {
    acc[section.id] = true;
    return acc;
  }, {})
);
const normalizedQuery = computed(() => searchQuery.value.trim().toLocaleLowerCase());
const filteredSections = computed(() => {
  return docsSections
    .map((section) => {
      const articles = normalizedQuery.value
        ? section.articles.filter((article) => {
            const haystack = `${article.title} ${section.title}`.toLocaleLowerCase();
            return haystack.includes(normalizedQuery.value);
          })
        : section.articles;
      return {
        ...section,
        articles,
      };
    })
    .filter((section) => section.articles.length > 0);
});
const resultsCount = computed(() => {
  return filteredSections.value.reduce(
    (total, section) => total + section.articles.length,
    0
  );
});
const toggleAllSections = (value: boolean) => {
  docsSections.forEach((section) => {
    expandedSections[section.id] = value;
  });
};
</script>

<template>
  <div class="container py-8">
    <div class="mx-auto max-w-5xl">
      <div class="mb-10">
        <p class="text-sm font-medium uppercase tracking-[0.2em] text-accent">
          Documentation
        </p>
        <h1 class="mt-3 text-3xl font-semibold">Browsless Docs</h1>
        <p class="mt-3 max-w-2xl text-gray-600 dark:text-gray-200">
          Read how blocks, workflow concepts, and runtime helpers work inside Browsless.
        </p>
      </div>

      <div class="mb-6 rounded-xl border p-4 md:p-5">
        <div class="flex flex-col gap-4 md:flex-row md:items-center">
          <ui-input
            v-model="searchQuery"
            :placeholder="'Search docs by block or topic'"
            prepend-icon="riSearch2Line"
            class="flex-1"
          />
          <div class="flex items-center gap-2 text-sm">
            <span
              class="rounded-full bg-slate-100 px-3 py-2 text-gray-700 dark:bg-slate-800 dark:text-gray-200"
            >
              {{ resultsCount }} article{{ resultsCount === 1 ? '' : 's' }}
            </span>
            <button
              class="rounded-lg border px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
              @click="toggleAllSections(true)"
            >
              Expand all
            </button>
            <button
              class="rounded-lg border px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
              @click="toggleAllSections(false)"
            >
              Collapse all
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredSections.length === 0" class="rounded-xl border p-6 text-center">
        <h2 class="text-lg font-semibold">No matching docs</h2>
        <p class="mt-2 text-gray-600 dark:text-gray-200">
          Try a different block name, workflow topic, or helper function.
        </p>
      </div>

      <div v-else class="space-y-4">
        <ui-expand
          v-for="section in filteredSections"
          :key="section.id"
          v-model="expandedSections[section.id]"
          active-class="rounded-xl border"
          header-class="flex w-full items-center px-5 py-4 text-left"
          panel-class="px-5 pb-5"
        >
          <template #header>
            <div class="flex flex-1 items-center justify-between gap-4">
              <div>
                <h2 class="text-lg font-semibold">{{ section.title }}</h2>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-200">
                  {{ section.articles.length }} article{{
                    section.articles.length === 1 ? '' : 's'
                  }}
                </p>
              </div>
              <span
                class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-600 dark:bg-slate-800 dark:text-gray-200"
              >
                {{ section.id }}
              </span>
            </div>
          </template>

          <ul class="grid gap-3 md:grid-cols-2">
            <li
              v-for="article in section.articles"
              :key="`${section.id}-${article.slug}`"
            >
              <router-link
                :to="`/docs/${section.id}/${article.slug}`"
                class="block rounded-xl border p-4 transition-colors hover:border-accent hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <p class="font-medium">{{ article.title }}</p>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-200">
                  Open {{ section.title.toLocaleLowerCase() }} documentation
                </p>
              </router-link>
            </li>
          </ul>
        </ui-expand>
      </div>
    </div>
  </div>
</template>
