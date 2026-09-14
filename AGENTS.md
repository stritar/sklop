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
`pnpm --filter @sklop/tokens generate:ramp` rewrites the colour primitives and checks contrast gates.

## Rules

- **CSS Modules in, plain CSS out.** Consumers never compile our `.module.css`; the build emits
  stable class names `sk-{Component}-{class}` in `@sklop/react/styles.css`. Ejected copies are
  raw `.module.css`. No components exist yet, so the `./styles.css` export is removed; the first
  component adds it back.
- **Layers.** Tokens live in `@layer sklop.tokens`, components in `@layer sklop.components`;
  `tokens.css` declares the order.
- **Token grammar:** DTCG source `{tier}.{category}.{role}[.{variant}][.{state}]`. Primitives hold
  literals; semantic tokens alias primitives only. CSS emits semantic tokens only, resolved to
  literals: `--sk-{category}-{role}[-{variant}][-{state}]`. Components use `--sk-*`, never raw values.
- **Token origins** (`$extensions.sklop.origin`): `sample` values are tested against
  `fixtures/figma-sample.json`; `generated` and `proposed` values need Denis's sign-off before a
  component relies on them. Never hand-edit `primitive.color`: change the generator's anchors or
  gates, or a semantic reference, then run `generate:ramp`.
- **Light theme only** until a dark sample exists. Reduced motion collapses durations to `1ms`.
- **`--sk-font-*` are `font` shorthands.** Declare font longhands after `font: var(--sk-font-…)`.
- **Icon + label controls:** the label sits in its own padded box, `gap: 0`. Container
  padding insets the icon; label padding insets the text.
- **A component folder is self-contained:** `Name.tsx`, `Name.module.css`, `index.ts`, tests.
  Imports within the package use `.js` specifiers. `index.ts` is not ejected.
- Comments and docs: minimal and concise.

## Release

Changesets + npm Trusted Publishing from `.github/workflows/publish.yml`. No npm tokens in the
repo or CI secrets.

## Roadmap

`ROADMAP.md` is the only roadmap: phases, component coverage, settled decisions and the
definition of done. Phase status lines are edited there and nowhere else.
