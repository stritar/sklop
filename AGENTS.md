# Sklop — agent guide

AI-native React UI library. Components are authored in CSS Modules, shipped on npm, and can be
ejected into an app with the CLI.

## Packages

| Package | Role |
| --- | --- |
| `@sklop/tokens` | DTCG JSON → `tokens.css` (custom properties) + `tokens.json` |
| `@sklop/react` | Components. Ships compiled `dist/` and raw source in `registry/` |
| `@sklop/cli` | `sklop add <component>` copies source from the installed `@sklop/react` |

## Commands

`pnpm check` runs everything CI runs: lint, build, typecheck, test, pack checks.
`pnpm format` fixes formatting. `pnpm changeset` records a release note.

## Rules

- **CSS Modules in, plain CSS out.** Consumers never compile our `.module.css`; the build emits
  stable class names `sk-{Component}-{class}` in `@sklop/react/styles.css`. Ejected copies are
  raw `.module.css`.
- **Layers.** Tokens live in `@layer sklop.tokens`, components in `@layer sklop.components`.
  Every CSS file declares `@layer sklop.tokens, sklop.components;` first.
- **Token grammar:** `--sk-{category|component}[-{slot}]-{property}[--{modifier}]`. Logical
  only: no `left/right/top/bottom/width/height`. The generator throws on violations.
- **Tiers.** Primitives hold literals. Semantics alias primitives and never reuse a primitive's
  name (that makes a `var()` cycle). Component properties are read in module CSS only.
- **Every `var()` ends in a literal fallback**, so a missing token still renders:
  `var(--sk-button-label-padding--inline, var(--sk-space-inset--label, 8px))`.
- **Themes and motion** are attributes: `data-sk-theme="light|dark"`, `data-sk-motion="reduced|off"`.
  Media-query fallbacks guard on the attribute's absence (`:root:not([data-sk-motion])`).
- **Icon + label controls:** the label sits in its own padded box, `gap: 0`. Container
  padding insets the icon; label padding insets the text.
- **A component folder is self-contained:** `Name.tsx`, `Name.module.css`, `index.ts`, tests.
  Imports within the package use `.js` specifiers. `index.ts` is not ejected.
- Comments and docs: minimal and concise.

## Release

Changesets + npm Trusted Publishing from `.github/workflows/publish.yml`. No npm tokens in the
repo or CI secrets.
