# Build And Install

This project is a local-first Chrome extension built with `WXT`, `Vue 3`, and `TypeScript`.

## Prerequisites

- `Node.js`
- `pnpm`
- A Chromium browser for testing

## Install Dependencies

```bash
pnpm install
```

## Development Build

Run the extension in WXT dev mode:

```bash
pnpm dev
```

Use this for local iteration while developing the extension.

## Production Build

Build the Chrome MV3 extension:

```bash
pnpm build
```

Expected output location:

- `.output/chrome-mv3/`

## Zip Package

Create a distributable archive:

```bash
pnpm zip
```

WXT writes the packaged build under `.output/`.

## Load The Extension In Chrome

To install the local build in Chrome or another Chromium-based browser:

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the build directory from `.output/chrome-mv3/`

## Current Build Status

The build flow is configured, but the current repository state is not producing a successful production build.

Verified locally:

- `pnpm build`
- `pnpm zip`

Both currently fail with an `ENOENT` error while WXT tries to rename generated HTML entrypoints inside `.output/chrome-mv3/`, for example:

```text
ENOENT: no such file or directory, rename
'/Users/pawel/browsless_v2/.output/chrome-mv3/entrypoints/params/index.html'
'->'
'/Users/pawel/browsless_v2/.output/chrome-mv3/params.html'
```

and:

```text
ENOENT: no such file or directory, rename
'/Users/pawel/browsless_v2/.output/chrome-mv3/entrypoints/dashboard/index.html'
'->'
'/Users/pawel/browsless_v2/.output/chrome-mv3/dashboard.html'
```

Until that is fixed, use `pnpm typecheck` for validation and treat the production packaging flow as blocked.
