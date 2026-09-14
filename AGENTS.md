# Sklop — agent guide

AI-native React UI library. Components are authored in CSS Modules, shipped on npm, and can be
ejected into an app with the CLI.

## Packages

| Package | Role |
| --- | --- |
| `@sklop/react` | Components. Ships compiled `dist/` and raw source in `registry/` |
| `@sklop/cli` | `sklop add <component>` copies source from the installed `@sklop/react` |

## Commands

`pnpm check` runs everything CI runs: lint, build, typecheck, test, pack checks.
`pnpm format` fixes formatting. `pnpm changeset` records a release note.

## Rules

- **CSS Modules in, plain CSS out.** Consumers never compile our `.module.css`; the build emits
  stable class names `sk-{Component}-{class}` in `@sklop/react/styles.css`. Ejected copies are
  raw `.module.css`. No components exist yet, so the `./styles.css` export is removed; the first
  component adds it back.
- **Layers.** Component styles live in `@layer sklop.components`.
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
