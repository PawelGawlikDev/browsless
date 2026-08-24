<template>
  <div class="max-w-lg">
    <div class="bg-box-transparent mb-2 inline-block rounded-full p-3">
      <img src="@/assets/logo.svg" class="w-14" />
    </div>
    <p class="text-2xl font-semibold">Browsless</p>
    <p class="mb-2 mt-1">Version: {{ extensionVersion }}</p>
    <p class="text-gray-600 dark:text-gray-200">
      Browsless is a local-first Chrome extension for browser automation. Use it to build
      workflows, record repetitive tasks, capture data, and automate browser actions
      without relying on a hosted service.
    </p>
    <div class="mt-4 rounded-xl border p-4 text-sm text-gray-600 dark:text-gray-200">
      <p class="font-semibold text-black dark:text-white">Project notes</p>
      <p class="mt-2">
        This build is focused on local workflows, local storage, and in-browser
        automation. External sharing, hosted marketplace features, and remote account
        integrations have been removed.
      </p>
    </div>
  </div>
</template>
<script setup>
import { getExtensionManifest } from '@/utils/extensionManifest';

const extensionVersion = getExtensionManifest().version;
</script>
