# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Browsless (`browsless-v2`) is a local-first Chrome MV3 extension for browser automation (workflows built from connected blocks — think Automa-style). Built with WXT, Vue 3, TypeScript, and Tailwind CSS v4.

## Commands

Package manager: `bun` (see `bun.lock`; ignore stray `pnpm` references in older docs/README).

- `bun run dev` — start WXT dev mode (Chrome)
- `bun run build` — production build for Chrome MV3
- `bun run zip` — build + package a distributable zip
- `bun run typecheck` — `vue-tsc --noEmit`
- `bun run lint` / `bun run lint:fix` — ESLint over `entrypoints src wxt.config.ts global.d.ts eslint.config.mjs`
- `bun run format` / `bun run format:check` — Prettier over the same set plus config files

There is no test suite/runner configured in this repo. Use `bun run typecheck` and `bun run lint` as the correctness gates.

**Known build issue**: per `docs/build-and-install.md`, `bun run build` / `bun run zip` may fail with an `ENOENT` renaming generated HTML entrypoints (e.g. `params.html`, `dashboard.html`) inside `.output/chrome-mv3/`. If you hit this, `bun run typecheck` is the fallback for validating changes; don't assume packaging works until verified.

## Architecture

### Entrypoints vs. src

WXT is configured with `srcDir: 'src'` and `entrypointsDir: '../entrypoints'` (see `wxt.config.ts`). Each surface has a thin bootstrap file under `entrypoints/` (e.g. `entrypoints/dashboard/main.ts`) that mounts the real Vue app/logic living under the matching `src/<surface>/` directory. When adding a new page/surface, wire both: the entrypoint HTML/main.ts and the `src/` implementation.

Extension surfaces:
- `entrypoints/background.ts` → `src/background/` — MV3 service worker
- `entrypoints/content.ts` (+ `contentScript.bundle.ts`, `elementSelector.bundle.ts`, `recordWorkflow.bundle.ts`) → `src/content/` — injected content scripts, element picker, workflow recording
- `entrypoints/dashboard/` → `src/dashboard/` — main app UI (workflow editor, tables, logs). Builds to `dashboard.html`, an **unlisted** page (not a `chrome_url_overrides.newtab`)
- `entrypoints/popup/` → `src/popup/` — browser action popup
- `entrypoints/params/` → `src/params/` — modal/tab shown to collect user input before a workflow with parameters runs
- `entrypoints/offscreen/` → `src/offscreen/` — offscreen document for tasks the service worker can't do directly (e.g. clipboard, some DOM-dependent work)
- `entrypoints/sandbox/` → `src/sandbox/` — sandboxed page (declared in the manifest `sandbox.pages`) used for evaluating untrusted/user JS safely

Chrome-only; Firefox and the old hosted-Browsless/community/marketplace integrations have been removed (see `docs/development-structure.md`).

### Cross-context messaging

All postMessage/runtime messaging goes through `src/utils/message.ts` (`MessageListener` + `sendMessage`), which wraps `browser.runtime.sendMessage`/`onMessage` with named, optionally-prefixed message envelopes (`prefix--name`). Prefer this over calling `browser.runtime.sendMessage` directly.

Browser extension APIs (tabs, windows, debugger, proxy, storage, etc.) are accessed through `src/service/browser-api/BrowserAPIService.ts`, not directly from `wxt/browser`, wherever the calling code might run in a context without direct API access (e.g. sandboxed/offscreen/content contexts) — it transparently proxies calls to the background page via `MessageListener` when `IS_BROWSER_API_AVAILABLE` is false. `browser-api-map.ts` defines what's exposed.

### Workflow execution engine (`src/workflowEngine/`)

This is the core runtime and the most complex part of the codebase:
- `WorkflowEngine.ts` — owns one running workflow instance: parses the drawflow `nodes`/`edges` graph into `blocks` + `connectionsMap`, manages reference data (`variables`, `table`, `secrets`, `loopData`, `globalData`), history/logging, and lifecycle (`init` → spawns workers → `destroy`).
- `WorkflowWorker.ts` — walks the block graph for one execution path (a workflow can fan out into multiple concurrent workers, e.g. loops/new tabs); resolves the next block via `connectionsMap` and dispatches to the matching handler.
- `blocksHandler.ts` + `blocksHandler/handler*.ts` — one file per block type (e.g. `handlerNewTab.ts`, `handlerJavascriptCode.ts`, `handlerLoopElements.ts`, `handlerWebhook.ts`, `handlerCookie.ts`). Adding a new block type means adding a handler here plus its block definition (see `getSharedData`/`SharedBlocksMap`) and UI component.
- `WorkflowManager.ts` — tracks/coordinates multiple running `WorkflowEngine` instances (start/stop/list running workflows).
- `WorkflowState.ts` — persisted execution state (used for e.g. `reuseLastState`, resume-after-stop).
- `templating/` — the `{{ }}` mustache-style templating engine used to interpolate variables/table/secrets into block params at runtime (`renderString.ts`, `mustacheReplacer.ts`, `templatingFunctions.ts`).
- `utils/` — smaller helpers (condition evaluation, JS-block sandboxing, webhook helpers).

User-authored JavaScript blocks get runtime helpers injected with a `browsless*` naming convention (`browslessNextBlock`, `browslessSetVariable`, `browslessFetch`, `browslessRefData`, etc. — see `docs/development-structure.md`). These names are part of the public workflow runtime API; don't rename without checking user-facing docs/templates that reference them.

### Data layer

`src/db/storage.ts` defines a Dexie (IndexedDB) database (`storage`, currently version 2) with `tablesData`, `tablesItems`, `variables`, `credentials` stores — this is the primary local persistence for workflow tables/variables/credentials. `src/db/logs.ts` is the separate log storage. Schema changes need a new Dexie `.version()` bump, not an edit to the existing version.

### State/UI layer

- `src/stores/` — Pinia stores (dashboard/app state)
- `src/components/` — shared Vue components, split into block-specific, dashboard, and UI-primitive components
- `src/composable/` — Vue composables
- `src/directives/` — custom Vue directives

## Styling

Tailwind CSS v4, configured CSS-first from `src/assets/css/tailwind.css` (theme tokens: `--color-primary`, `--color-secondary`, `--color-accent`, exposed as utilities like `bg-primary`, `text-accent`, `border-accent`). See `docs/styling-and-tailwind.md` for v4 migration gotchas:
- use `@reference` only where a scoped style still needs `@apply`
- prefer plain CSS for one-off single-property tweaks; keep `@apply` only when it composes multiple utilities and stays readable
- avoid `bg-opacity-*`-style old opacity utilities and `@apply ... !important`
- any custom utility used via `@apply` must be defined in `src/assets/css/tailwind.css`

`src/assets/css/flow.css` (Vue Flow) and `src/assets/css/drawflow.css` (legacy editor) hold flow-editor-specific styling.

## Path alias

`@/*` resolves to `src/*` (see `wxt.config.ts` vite alias and `tsconfig.json`).

## Lint/format conventions worth knowing

`eslint.config.mjs` deliberately disables a number of default rules project-wide (`no-console`, `@typescript-eslint/no-explicit-any`, `prefer-const`, several `vue/*` style rules, etc.) — don't "fix" these findings unless asked; they're intentionally off. `.d.ts` files also have unused-vars rules turned off.
