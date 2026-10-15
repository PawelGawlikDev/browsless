# Project guidance

Read `CLAUDE.md` for architecture, commands, and conventions. OpenCode also loads it through `opencode.json` so this guidance stays shared with Claude Code.

## Working safely

- Use Bun for project commands. Check `package.json` before assuming a script exists.
- Preserve existing staged and unstaged work. Do not commit, publish, or change extension permissions unless requested.
- This is a local-first Chrome MV3 extension, not a hosted website. Respect service-worker, content-script, offscreen, and sandbox boundaries.
- Validate code changes with `bun run typecheck` and `bun run lint`. No unit or E2E runner is currently configured; never report tests as passed if they were not run.
- Verify `bun run build` separately when packaging matters; see `docs/build-and-install.md` for the known generated-entrypoint issue.

## Design and frontend skills

Skills live in `.agents/skills/`, which OpenCode discovers automatically. Load only skills relevant to the task rather than combining every aesthetic direction.

- Vue changes: `vue-best-practices`; follow existing component conventions and prefer Composition API for new components.
- Existing UI audits and polish: `impeccable` or `redesign-existing-projects`.
- Broader visual direction: `design-taste-frontend`; use style-specific skills only when the brief calls for them.
- Shared UI, themes, and consistency: `tailwind-design-system`, `design-system-patterns`, and `design-tokens`.
- Image/brand skills require a suitable image-generation tool. Do not claim generated assets exist when that capability is unavailable or add image-generation services automatically.

Project conventions take priority over generic skill examples:

- Tailwind v4 is CSS-first. Extend `src/assets/css/tailwind.css` and its existing tokens; do not introduce a v3 `tailwind.config.js` or a parallel `globals.css` token system.
- Reuse `src/components/ui/` primitives, existing theme behavior, icons, and dependencies. Adapt React examples to Vue; do not install React, GSAP, or another UI framework just to match a skill example.
- Design for the workflow editor, dashboard, compact popup, and injected content UI as appropriate, not a marketing landing page. Preserve keyboard interaction, visible focus, readable density, contrast, and reduced-motion support.
- `shadcn-vue` is available as a reference skill, not the current component architecture. There is no `components.json` or shadcn component setup. Do not run initialization or replace primitives without approval.

## OpenCode tooling

- `.opencode/agents/` contains Browsless-specific developer, reviewer, and tester profiles adapted from ChessInsights. Select them explicitly; delegate only when the user asks.
- `opencode.json` uses native OpenCode V2 configuration. Leave model/provider selection and credentials in the user's global setup.
- No project-local shadcn MCP or component configuration is included.
- Global MCPs remain inherited. Do not duplicate global credentials, copy dependency caches, or assume image/browser/design MCPs exist just because a skill mentions them.
