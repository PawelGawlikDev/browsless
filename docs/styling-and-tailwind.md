# Styling And Tailwind

## Current Styling Stack

- Tailwind CSS v4
- Vite integration via `@tailwindcss/vite`
- Vue SFC scoped styles where needed

## Key Files

- `src/assets/css/tailwind.css`
  Main Tailwind entry and custom utilities.

- `src/assets/css/flow.css`
  Vue Flow styling.

- `src/assets/css/drawflow.css`
  Older flow/editor visual rules.

- Tailwind is now configured from `src/assets/css/tailwind.css` using v4 CSS-first directives.

## Theme Tokens

The approved palette lives in `src/assets/css/tailwind.css` in three layers:

1. **Primitives**: `--color-gray-50` through `--color-gray-950` are neutral grays using zinc values; `--color-cobalt-*` is the custom blue ramp. Shade numbers increase from light to dark. Do not redefine Tailwind's `slate` family to hold neutral gray values.
2. **Semantic roles**: `--color-primary` is the action/highlight color, `--color-primary-hover` is its hover state, and `--color-primary-foreground` is text/icons placed on it. `--color-selection` is the subtle selected background; `--color-focus` is the keyboard focus indicator. `.dark` remaps roles without changing primitives.
3. **Component tokens**: the always-dark sidebar maps `--sidebar-primary`, `--sidebar-primary-foreground`, and `--sidebar-selection` to cobalt primitives independently of the page theme.

All color tokens contain complete CSS colors, not bare RGB channels. Use `color: var(--color-primary)` in CSS. Native Tailwind utilities such as `bg-primary`, `text-primary-foreground`, `hover:bg-primary-hover`, and `bg-primary/15` are generated from `@theme` and support opacity modifiers.

`accent` and `on-accent` are compatibility aliases for `primary` and `primary-foreground`, registered with `@theme inline` so generated utilities resolve the active theme locally. Existing `bg-accent`, `text-accent`, `border-accent`, and `ring-accent/25` usages remain supported; new code should prefer the primary role names. The former `secondary` token represented a hover state, not a second brand color, and has been replaced by `primary-hover`.

The shared `ui-action` and `ui-selected` utilities compose these roles. Do not hand-write `bg-primary`/`bg-accent` utilities that bypass Tailwind's native color and opacity handling.

## Tailwind v4 Migration Notes

Tailwind v4 is stricter than v3 about:

- `@apply` usage
- custom utility resolution
- scoped style references
- old `theme(...)` usage in CSS

To keep the migration stable:

- use `@reference` only in files that still need `@apply`
- prefer plain CSS for simple one-off style rules
- prefer CSS variables for custom brand colors
- avoid old opacity utilities like `bg-opacity-*` inside `@apply`
- avoid `@apply ... !important`

## Practical Rule Of Thumb

When editing styles:

- if a rule is a single margin/padding/color tweak, use plain CSS
- if a rule benefits from utility composition and stays readable, keep `@apply`
- if `@apply` needs custom utilities, make sure they exist in `src/assets/css/tailwind.css`

## Remaining Cleanup Direction

There is still some Tailwind compatibility scaffolding left in scoped styles. It is functional, but future cleanup should keep moving toward:

- fewer `@reference` directives
- fewer scoped `@apply` blocks
- more shared utilities in the main Tailwind entry
