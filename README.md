<img src="src/assets/icon.png" width="72" height="72" alt="Browsless extension icon" />

# Browsless

**Automate your browser with connected workflow blocks.**

A local-first Chrome extension for filling forms, repeating browser tasks, collecting page data, and scheduling workflows. Build visually, record interactions, or add JavaScript when you need more control.

<p>
  <a href="./LICENSE"><img alt="License: AGPL v3" src="https://img.shields.io/badge/license-AGPL--3.0--only-blue" /></a>
  <img alt="Chrome Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest_V3-4285F4" />
  <img alt="Vue 3 and TypeScript" src="https://img.shields.io/badge/Vue_3-TypeScript-42b883" />
</p>

Browsless is an independently modified version of [Automa](https://github.com/AutomaApp/automa), built with **WXT, Vue 3, TypeScript, and Tailwind CSS v4**. It is not an official Automa release.

## Features

- **Visual workflow editor** — connect blocks for navigation, page interactions, conditions, loops, and data processing.
- **Workflow recording and element picking** — capture browser interactions and identify page elements.
- **Scheduling** — configure triggers to run workflows automatically.
- **Local data tools** — work with variables, parameters, tables, and execution logs.
- **JavaScript blocks** — extend workflows with the public `browsless*` runtime helpers.
- **Light and dark themes** — including system theme selection and a cobalt/gray interface.

This fork targets **Chrome Manifest V3** and requires **Chrome 116 or newer**. Firefox support and the hosted community, marketplace, and team-sharing integrations are not included.

## Install from source

### Requirements

- [Bun](https://bun.sh/) for dependencies and project commands.
- A current supported [Node.js](https://nodejs.org/) runtime for dependency tooling.
- Google Chrome 116+ for loading and testing the extension.

Development has been validated with Bun 1.4.2 and Node.js 24.18.0. The legacy Volta Node pin in `package.json` is not the validated toolchain; use the versions above if your installed tooling reports an engine mismatch.

```bash
git clone https://github.com/PawelGawlikDev/browsless.git
cd browsless
bun install
bun run build
```

### Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `.output/chrome-mv3/` inside this repository.
5. Pin Browsless to the toolbar and open its popup to access the dashboard.

After rebuilding, reload the extension on `chrome://extensions`. Reload any target tabs if they still contain content scripts from an earlier build.

### First workflow

Open the dashboard, create a workflow, add and connect blocks, and configure their inputs. Try a small workflow on a test page before enabling scheduled runs or using it on important accounts.

## Development

```bash
bun install
bun run dev
```

WXT manages the development build. Its development output is `.output/chrome-mv3-dev/`; the production output is `.output/chrome-mv3/`. Use the matching directory when loading an unpacked extension manually.

| Command                | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `bun run dev`          | Start WXT development mode for Chrome.               |
| `bun run build`        | Build the production Chrome MV3 extension.           |
| `bun run zip`          | Build and package an extension ZIP under `.output/`. |
| `bun run typecheck`    | Check TypeScript and Vue templates.                  |
| `bun run lint`         | Check application code with ESLint.                  |
| `bun run lint:fix`     | Apply ESLint fixes across the configured lint scope. |
| `bun run format:check` | Check formatting across the configured format scope. |
| `bun run format`       | Apply Prettier formatting across that scope.         |
| `bun run lint:staged`  | Fix lint and formatting on staged files only.        |

`bun install` configures **Husky** through the `prepare` script. The pre-commit hook uses **lint-staged** to run ESLint fixes, then Prettier, and blocks the commit if errors remain. Avoid whole-project fix commands when you only intend to change staged files.

There is no automated unit or end-to-end test runner configured. Before submitting a change, run typecheck, lint, and build, then manually check the affected extension surfaces.

## Project structure

```text
entrypoints/         WXT bootstraps: background, content, dashboard, popup, and other surfaces
src/background/      MV3 service worker implementation
src/content/         Injected UI, element selection, recording, and page interactions
src/dashboard/       Dashboard routes and application shell
src/popup/           Browser action popup
src/workflowEngine/  Workflow execution and block handlers
src/components/      Shared components, workflow blocks, and UI primitives
src/composable/      Vue composables
src/stores/          Pinia stores
src/db/              Local IndexedDB storage
src/assets/          Icons, fonts, and Tailwind/theme styles
public/              Static build assets
docs/                Build, architecture, and styling documentation
```

The dashboard is an extension page, not a replacement for Chrome's new-tab page. Background, content, offscreen, and sandbox code run in different extension contexts; see the architecture guide before changing cross-context behavior.

## Permissions and safety

Browsless requests broad browser capabilities because workflows can interact with websites, tabs, storage, scripts, and other browser features. Additional capabilities such as cookies, downloads, clipboard reads, and notifications use optional permissions where configured.

Local-first does **not** mean every workflow stays offline: workflows can navigate websites, submit forms, call APIs, or send data to configured destinations. Review imported workflows and JavaScript before running them. Do not publish credentials, secrets, or private workflow exports in issues or pull requests.

## Documentation and contributions

- [Build and install](./docs/build-and-install.md)
- [Architecture and workflow runtime API](./docs/development-structure.md)
- [Styling, color tokens, and themes](./docs/styling-and-tailwind.md)
- [Project guidance for coding agents](./AGENTS.md)
- [Report a bug or request a feature](https://github.com/PawelGawlikDev/browsless/issues)

For bug reports, include your Chrome version, reproduction steps, and relevant errors with sensitive information removed. For contributions, keep changes focused, describe the behavior changed, and include the checks you ran. Thanks to Browsless contributors and the original [Automa contributors](https://github.com/AutomaApp/automa/graphs/contributors).

## License and attribution

The Browsless application is distributed under **GNU AGPL version 3 only (`AGPL-3.0-only`)**, except for separately licensed third-party materials.

See [LICENCE.txt](./LICENCE.txt) for scope, [LICENSE](./LICENSE) for the complete terms, and [NOTICE](./NOTICE) for upstream attribution and the dated modification notice. Automa's original notice is preserved in [LICENSES/Automa-LICENSE.txt](./LICENSES/Automa-LICENSE.txt). This project does not grant an Automa Commercial License or permission to redistribute Automa's commercially licensed code.

When distributing an extension build:

- WXT copies the repository's `LICENSE`, `LICENCE.txt`, `NOTICE`, and `LICENSES/` texts into the build and ZIP. Include any additional third-party notices required by the materials you distribute.
- Provide recipients access to the corresponding source for that exact release, including required build scripts.
- If the modified application supports remote network interaction, comply with AGPL section 13's source-offer requirements.
- Review applicable interactive-interface notice requirements.

Adding license files alone does not establish full distribution compliance. Dependency, asset, and source-provenance review is still needed before publishing a release.
