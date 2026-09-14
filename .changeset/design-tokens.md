---
'@sklop/tokens': minor
'@sklop/react': patch
---

Add design tokens from the Figma sample as CSS custom properties: colour roles, type, spacing,
sizes, radius, shadow and motion. `@sklop/react` now depends on `@sklop/tokens`.

Tokens vary by seven data attributes: theme (light, dark, system), preset (default, neutral),
density, font scale, radius, motion personality and motion level. Motion includes transitions,
enter, exit and press roles, and a `linear()` spring. `@sklop/tokens/theme` exports the typed
`Theme` map, every token name and the axis registry; `@sklop/tokens/presets.json` holds presets as
flat override maps. Documented contrast pairs pass WCAG AA in every theme and preset.
