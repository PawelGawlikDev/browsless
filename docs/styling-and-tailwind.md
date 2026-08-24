# Styling And Tailwind

## Current Styling Stack

- Tailwind CSS v4
- PostCSS via `@tailwindcss/postcss`
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

The main visual identity is driven by CSS variables in `src/assets/css/tailwind.css`:

- `--color-primary`
- `--color-secondary`
- `--color-accent`

These are used by custom utilities such as:

- `bg-primary`
- `text-primary`
- `bg-accent`
- `text-accent`
- `border-accent`
- `ring-accent`

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
