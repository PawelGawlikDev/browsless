# Build And Install

This project is a local-first Chrome extension built with `WXT`, `Vue 3`, and `TypeScript`.

## Prerequisites

- Bun for package management and project commands
- A current supported Node.js runtime for dependency tooling
- Chrome 116 or newer

Development has been validated with Bun 1.4.2 and Node.js 24.18.0. The existing Volta Node pin is legacy metadata, not the validated toolchain.

## Install Dependencies

```bash
bun install
```

## Development Build

Run the extension in WXT dev mode:

```bash
bun run dev
```

Use this for local iteration while developing the extension. The development build is written to `.output/chrome-mv3-dev/`.

## Production Build

Build the Chrome MV3 extension:

```bash
bun run build
```

Expected output location:

- `.output/chrome-mv3/`

## Zip Package

Create a distributable archive:

```bash
bun run zip
```

WXT writes the packaged build under `.output/`.

## Load The Extension In Chrome

To install the local build in Chrome or another Chromium-based browser:

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the build directory from `.output/chrome-mv3/`

## Validation and Troubleshooting

```bash
bun run typecheck
bun run lint
bun run build
```

These checks have passed locally with the current code. Build success does not replace manual checks of the loaded extension. Large-chunk warnings can appear during production bundling without failing the build.

Earlier builds failed with an `ENOENT` while WXT renamed generated HTML entrypoints such as `params.html` and `dashboard.html`. That is a historical issue, not the current verified build status. If it recurs, capture the actual error and check the entrypoint configuration. Typecheck and lint can still validate code, but they do not prove that packaging succeeded.

After rebuilding, reload the extension on `chrome://extensions` and reload target tabs as needed to replace old content scripts.

## Before Publishing

Review the license and attribution section in [README.md](../README.md), the project [licensing notice](../LICENCE.txt), and [NOTICE](../NOTICE). The WXT `build:publicAssets` hook copies the canonical `LICENSE`, `LICENCE.txt`, `NOTICE`, and the listed `LICENSES/` texts into builds and ZIPs. Include any additional required third-party notices, and make the corresponding source for the exact release available as required by the AGPL. The WXT build alone is not a license-compliance check.
