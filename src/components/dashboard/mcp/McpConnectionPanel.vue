<script setup lang="ts">
import { shallowRef } from 'vue';
import { useMcpConnection } from '@/composable/useMcpConnection';
import { MCP_DEFAULT_PORT } from '@/mcp/protocol';

const { status, error, connectedPort, lastDraft, connect, disconnect } =
  useMcpConnection();
const port = shallowRef<string | number>(MCP_DEFAULT_PORT);
const code = shallowRef<string | number>('');
async function approve() {
  await connect(Number(port.value), String(code.value));
  code.value = '';
}
</script>

<template>
  <section class="max-w-2xl space-y-6" aria-labelledby="mcp-heading">
    <div>
      <h2 id="mcp-heading" class="text-xl font-semibold">External AI · MCP</h2>
      <p class="mt-2 text-gray-600 dark:text-gray-300">
        Connect Claude Desktop, Codex, or another MCP client through the local Browsless
        companion. No AI provider keys are stored in the extension.
      </p>
    </div>
    <ol class="list-decimal space-y-2 pl-5 text-sm">
      <li>Configure and start the Browsless MCP companion in your AI application.</li>
      <li>
        Ask it to call <code>get_connection_info</code> and show you the port and pairing
        code.
      </li>
      <li>Enter them here and approve access. Keep this dashboard window open.</li>
    </ol>
    <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <p class="font-semibold">You are approving draft-only access</p>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        The connected client can read block definitions, validate graphs, and create new
        disabled workflows. It cannot read existing workflows, inspect pages, run
        workflows, or access credentials. Generated workflows may contain code and side
        effects: inspect every block before enabling a draft.
      </p>
    </div>
    <p role="status" class="text-sm font-semibold">
      {{
        status === 'connected'
          ? `Connected · 127.0.0.1:${connectedPort}`
          : status === 'pairing'
            ? 'Pairing…'
            : 'Not connected'
      }}
    </p>
    <form v-if="status !== 'connected'" class="space-y-4" @submit.prevent="approve">
      <ui-input
        v-model="port"
        label="Local companion port"
        type="number"
        min="1024"
        max="65535"
        class="w-full"
        :disabled="status === 'pairing'"
      />
      <ui-input
        v-model="code"
        label="One-time pairing code"
        type="password"
        autocomplete="off"
        class="w-full"
        :disabled="status === 'pairing'"
      />
      <div class="flex flex-wrap gap-2">
        <ui-button
          type="submit"
          variant="primary"
          :loading="status === 'pairing'"
          :disabled="!code"
        >
          Approve and connect
        </ui-button>
        <ui-button v-if="status === 'pairing'" type="button" @click="disconnect()"
          >Cancel</ui-button
        >
      </div>
    </form>
    <ui-button v-else variant="danger" @click="disconnect()"
      >Disconnect and revoke access</ui-button
    >
    <p
      v-if="error"
      role="alert"
      class="whitespace-pre-wrap text-sm text-red-600 dark:text-red-400"
    >
      {{ error }}
    </p>
    <p v-if="lastDraft" class="text-sm">
      Latest draft:
      <router-link :to="`/workflows/${lastDraft.id}`" class="text-primary underline">{{
        lastDraft.name
      }}</router-link>
      — saved disabled for review.
    </p>
    <p class="text-sm text-gray-600 dark:text-gray-300">
      Approval lasts only for this dashboard session. Closing the window, stopping the
      companion, or losing the connection requires pairing again. For setup instructions,
      see <code>docs/mcp-connection.md</code> in the Browsless repository.
    </p>
  </section>
</template>
