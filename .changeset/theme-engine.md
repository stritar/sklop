---
'@sklop/tokens': minor
---

Tokens now vary by seven data attributes: theme (light, dark, system), preset (default, neutral),
density, font scale, radius, motion personality and motion level. `@sklop/tokens/theme` exports the
typed `Theme` map, every token name and the axis registry, and `@sklop/tokens/presets.json` holds
presets as flat override maps. Documented contrast pairs pass WCAG AA in every theme and preset.

Changed since 0.1.0: `--sk-radius-full` is now `--sk-radius-pill` and `--sk-radius-circle`.
`--sk-color-text-secondary` is darker and reaches 4.5:1 on every background. Motion adds transitions,
enter, exit and press roles and a `linear()` spring, `--sk-motion-duration-moderate` is 250ms, and
reduced motion keeps durations while removing travel and scale.
