# Sklop — agent guide

AI-native React UI library. Components are authored in CSS Modules, shipped on npm, and can be
ejected into an app with the CLI.

## Packages

| Package | Role |
| --- | --- |
| `@sklop/tokens` | DTCG JSON → committed `generated/`: `tokens.css`, `tokens.json`, `presets.json`, `theme.js` + `theme.d.ts` |
| `@sklop/react` | `SklopProvider`, `SklopScript`, hooks, components. Ships compiled `dist/` and raw source in `registry/` |
| `@sklop/cli` | `sklop add <component>` copies source from the installed `@sklop/react` |
| `apps/hub` | Review surface (token page today). Chrome uses `--hub-*` only. Never published |
| `apps/next-example` | Next.js App Router consumer, rendered in CI. Pins TypeScript 6 for Next's type check |
| `e2e/` | Playwright: app smoke and axe, the token cascade oracle, screenshots |

## Commands

`pnpm check` runs lint, build, typecheck, unit tests and pack checks. It is browser-free.
`pnpm test:e2e` runs the Playwright suites against built apps (`pnpm build` first); CI runs both.
`pnpm format` fixes formatting. `pnpm changeset` records a release note.
`pnpm --filter @sklop/tokens generate:ramp` rewrites the colour primitives and checks contrast gates.
`pnpm --filter @sklop/tokens generate:tokens` rewrites `generated/`; `build` fails when it is stale.
`pnpm --filter @sklop/react generate:component-tokens` rewrites component token regions from manifests.

## Rules

- **CSS Modules in, plain CSS out.** Consumers never compile our `.module.css`; the build emits
  stable class names `sk-{Component}-{class}` in `@sklop/react/styles.css`. Ejected copies are
  raw `.module.css`. No components exist yet, so the `./styles.css` export is removed; the build
  fails once a component exists without it.
- **Layers.** Tokens live in `@layer sklop.tokens`, components in `@layer sklop.components`;
  `tokens.css` declares the order.
- **Token grammar:** DTCG source `{tier}.{category}.{role}[.{variant}][.{state}]`, category from a
  fixed list, no physical direction words. Primitives hold literals; semantic tokens alias
  primitives only. CSS emits semantic tokens only, resolved to literals:
  `--sk-{category}-{role}[-{variant}][-{state}]`. Components use `--sk-*`, never raw values.
- **Axes.** `data-sk-theme`, `-preset`, `-density`, `-font-scale`, `-radius`,
  `-motion-personality`, `-motion`. A token varies through `$extensions.sklop.axes`, and through
  `cross` for the theme × preset pair; the registry is `AXES` in `packages/tokens/scripts/build.mjs`.
  Every axis value gets a complete CSS block, so nested scopes restore values. **Set all axis
  attributes together on one element**: a token two axes vary is only right when both attributes
  sit on the same element. `SklopProvider` always writes all of them.
- **Motion levels.** `reduced` keeps durations, opacity and colour changes and drops travel and
  scale; `off` makes durations `1ms`; no attribute follows `prefers-reduced-motion`. The level
  overrides the personality. UI durations stay under 300ms; only `motion.loop.*` run longer.
- **Contrast.** Foreground roles list documented pairs in `$extensions.sklop.contrast`
  (`{ on, min }` or `{ on, exempt: reason }`); the build fails a pair below its minimum in any
  theme and preset.
- **Token origins** (`$extensions.sklop.origin`): `sample` values are tested against
  `fixtures/figma-sample.json`; `generated` and `proposed` values need Denis's sign-off before a
  component relies on them, recorded as `approved: "YYYY-MM-DD"`. A role that moves off the sample
  records `diverges: { from, reason, date }`. Never hand-edit `primitive.color` or `generated/`:
  change the source or the generator's anchors or gates, then regenerate.
- **Component tier.** A manifest token becomes a generated `--_sk-{component}-{token}` on its part,
  reading `--sk-{component}-{token}`, then the semantic token, then its literal. Component CSS
  never declares a public `--sk-*` property.
- **Component CSS check** (`pnpm lint`): logical properties only; no raw colour, `px` or time
  outside the literal that ends a `var()` fallback chain; every `var()` has that chain.
- **`--sk-font-*` are `font` shorthands.** Declare font longhands after `font: var(--sk-font-…)`.
- **Icon + label controls:** the label sits in its own padded box, `gap: 0`. Container
  padding insets the icon; label padding insets the text.
- **A component folder is self-contained:** `Name.tsx`, `Name.module.css`, `Name.manifest.json`,
  `index.ts`, tests. Imports within the package use `.js` specifiers. `index.ts` is not ejected.
- **Client boundaries.** Modules with state or effects open with `'use client'`; the build fails
  if `dist/` loses it.
- **Screenshots** are compared only on CI Linux (`SKLOP_VISUAL=1`). Update baselines with the
  `Update visual baselines` workflow, or the `update-visual-baselines` pull request label before
  that workflow reaches `main`. Never commit screenshots made locally.
- Comments and docs: minimal and concise.

## Release

Changesets + npm Trusted Publishing from `.github/workflows/publish.yml`. No npm tokens in the
repo or CI secrets.

## Roadmap

`ROADMAP.md` is the only roadmap: phases, component coverage, settled decisions and the
definition of done. Phase status lines are edited there and nowhere else.
