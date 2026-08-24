# Development Structure

## Overview

This repository is a WXT-based Chrome MV3 extension.

Main source areas:

- `entrypoints/`
  WXT entrypoints. These are the actual extension surfaces WXT builds.

- `src/background/`
  Background service worker logic.

- `src/content/`
  Content scripts, injected UI, selector tools, and recording helpers.

- `src/dashboard/`
  Main dashboard application. It builds to `dashboard.html` and does not override the browser new tab page.

- `src/popup/`
  Popup UI opened from the browser action.

- `src/params/`
  Parameter input page used before running workflows that require user input.

- `src/offscreen/`
  Offscreen document support for workflows and related background tasks.

- `src/sandbox/`
  Sandbox runtime support.

- `src/components/`
  Shared Vue components, block components, dashboard components, and UI primitives.

- `src/stores/`
  Pinia stores.

- `src/utils/`
  Shared helpers and extension/runtime utilities.

- `src/workflowEngine/`
  Core workflow execution logic.

## WXT Config Notes

- `wxt.config.ts`
  Uses `srcDir: 'src'` and `entrypointsDir: '../entrypoints'`.

- The app is Chrome-only.

- `dashboard.html` is an unlisted page, not a `chrome_url_overrides.newtab` entry.

## Simplifications Already Made

- Firefox support removed.
- External hosted Browsless integration removed.
- Community / marketplace / team-sharing style surfaces removed.
- Dashboard routing no longer depends on a browser new-tab override.

## Likely Future Cleanup Targets

- Further reduce legacy `// @ts-nocheck` usage in runtime-heavy modules.

## Workflow Runtime API

Workflow runtime helpers exposed to user-authored JavaScript blocks use the
`browsless*` prefix, for example:

- `browslessNextBlock`
- `browslessSetVariable`
- `browslessFetch`
- `browslessRefData`

These names are part of the workflow runtime API available inside JavaScript
blocks.
