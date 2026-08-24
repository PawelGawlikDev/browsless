<template>
  <div class="mx-auto max-w-xl py-16">
    <h1 class="mb-8 text-3xl font-semibold">Quick start</h1>
    <p class="text-gray-600 dark:text-gray-200">
      Browsless is a local-first browser automation workspace. Build workflows, record
      actions, manage credentials, and run repeatable browser tasks from one place.
    </p>
    <router-link
      to="/docs"
      class="mt-4 inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
    >
      Read workflow and block documentation
    </router-link>
    <div class="mt-8 grid gap-3">
      <div class="rounded-xl border p-4">
        <p class="font-semibold">1. Create a workflow</p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-200">
          Start from an empty flow or record a task and refine it in the editor.
        </p>
      </div>
      <div class="rounded-xl border p-4">
        <p class="font-semibold">2. Add your data and credentials</p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-200">
          Store variables, tables, and secrets locally inside the extension.
        </p>
      </div>
      <div class="rounded-xl border p-4">
        <p class="font-semibold">3. Run and iterate</p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-200">
          Execute workflows from the dashboard or popup and inspect the logs.
        </p>
      </div>
    </div>
  </div>
</template>
