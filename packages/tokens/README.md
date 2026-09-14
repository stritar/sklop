# @sklop/tokens

Design tokens for Sklop, as CSS custom properties.

## Use

```sh
npm install @sklop/tokens
```

```ts
import '@sklop/tokens/tokens.css';
```

Load the Figtree font in your app. Without it, text falls back to `system-ui`.

```css
.menu {
  background: var(--sk-color-bg-raised);
  border-radius: var(--sk-radius-lg);
  box-shadow: var(--sk-shadow-raised);
  font: var(--sk-font-body-md);
  transition: var(--sk-motion-transition-base);
}
```

`--sk-font-*` tokens are `font` shorthands, which reset the font longhands they do not set. Declare
longhands such as `font-variant-numeric` after them. Tokens sit in `@layer sklop.tokens`, so any
unlayered CSS in your app wins.

## Axes

Seven data attributes change the tokens under an element. `SklopProvider` in `@sklop/react` sets
them for you. In plain CSS, set them on `<html>`:

```html
<html data-sk-theme="system" data-sk-density="compact">
```

| Attribute | Values | Without it |
| --- | --- | --- |
| `data-sk-theme` | `light`, `dark`, `system` | `light` |
| `data-sk-preset` | `default`, `neutral` | `default` |
| `data-sk-density` | `compact`, `default`, `comfortable`, `spacious` | `default` |
| `data-sk-font-scale` | `small`, `medium`, `large`, `extra-large` | `medium` |
| `data-sk-radius` | `sharp`, `default`, `soft`, `round` | `default` |
| `data-sk-motion-personality` | `crisp`, `soft`, `playful` | `crisp` |
| `data-sk-motion` | `full`, `reduced`, `off`, `system` | follows `prefers-reduced-motion` |

`system` follows the operating system. A theme attribute also sets `color-scheme`, so scrollbars and
form controls match.

**Set the attributes together on one element.** They can be set again on any element to scope a
region, and a nested element restores what an ancestor changed. Theme and preset change the same
tokens, as do motion level and personality, so a value is only right when both attributes sit on
the same element.

## Tokens

Every token, with its value, the values it takes on each axis, origin and description, is listed in
`@sklop/tokens/tokens.json`.

| Group | Custom properties |
| --- | --- |
| Colour | `--sk-color-bg-*`, `--sk-color-text-*`, `--sk-color-border-*`, `--sk-color-accent-*` |
| Type | `--sk-font-family-base`, `--sk-font-label-{md,sm}`, `--sk-font-body-{md,sm}`, `--sk-font-input-md` |
| Space | `--sk-space-gap-{xs,sm}`, `--sk-space-inset-{sm,lg}` |
| Size | `--sk-size-icon-{sm,md}`, `--sk-size-control-{sm,lg}` |
| Shape | `--sk-radius-{lg,pill,circle}`, `--sk-border-width-default`, `--sk-shadow-raised` |
| Motion | `--sk-motion-duration-*`, `--sk-motion-easing-*`, `--sk-motion-transition-{hover,focus,base}`, `--sk-motion-{enter,exit,press,release}-*`, `--sk-motion-stagger-step`, `--sk-motion-stream-cadence`, `--sk-motion-loop-*` |

`radius-pill` squares off only on the sharp radius scale. `radius-circle` stays round on every scale,
for avatars and square controls.

## Theme and presets in JavaScript

```ts
import { axes, tokenNames, type Theme } from '@sklop/tokens/theme';
import presets from '@sklop/tokens/presets.json';
```

- `Theme` is a flat map of token names to CSS values, for overrides.
- `tokenNames` lists every public name, so a `Theme` from a URL or a user can be checked.
- `axes` describes each attribute: its values, default and system query.
- `presets.json` holds each preset as one flat `Theme` per theme, such as `presets.neutral.dark`.

## Names

The source is DTCG JSON named `{tier}.{category}.{role}.{variant}.{state}`. The CSS name drops the
tier: `--sk-{category}-{role}-{variant}-{state}`. Only semantic tokens reach the CSS, as final
values. Primitives, such as ramp steps, stay in the source. The build rejects a name outside the
categories or one that names a physical direction, such as `left`.

`primary` means the most prominent member of its group, as in `text-primary`. The brand colour is
always `accent`.

## Where values come from

Each token records an origin:

- `sample`: read from the Figma sample. A test checks every sampled token against the nodes it cites.
- `generated`: colour roles the sample does not show, including the dark theme and the neutral
  preset. They sit on OKLCH ramps that pass exactly through the sampled colours.
- `proposed`: scales and motion the sample cannot show, such as density and font scale steps.

`generated` and `proposed` values need design review. A reviewed token records the date in
`approved`. A role that moves away from the sample records what it replaced and why in `diverges`.

## Motion

- Durations: `fast` for small elements such as a tooltip appearing, `normal` for a dropdown opening,
  `moderate` for a dialog entering. With the crisp personality they are 100, 200 and 250ms. UI motion
  stays under 300ms; only the `loop` tokens run longer.
- `transition-hover`, `-focus` and `-base` are complete `transition` values. Gate hover transitions
  behind `(hover: hover)`. Focus rings appear at once.
- `enter` and `exit` give duration, easing, travel and the scale an element grows from or shrinks
  to. Press is slower than release.
- Personalities change durations, easings and travel together: `crisp`, `soft`, and `playful`, which
  enters on a `linear()` spring.
- `reduced` keeps durations, so fades and colour changes stay visible, and removes travel and scale.
  `off` makes every duration 1ms, so transitions end at once and their end events still fire.
  Loops keep their timing: under reduced motion a spinner swaps rotation for an opacity pulse
  rather than freezing.

## Contrast

Each foreground role lists the backgrounds it is used on in `$extensions.sklop.contrast`, and
`tokens.json` carries the same list. The build fails when a pair falls below its WCAG 2 minimum, in
any theme and preset: 4.5:1 for text, 3:1 for borders and focus. A pair below AA records why instead:

- `accent-solid` measures 2.66:1 on `bg-raised`. The glyph identifies the control, and
  `text-on-accent` carries the contrast on the fill. White there would also measure 2.66:1.
- `text-disabled`: disabled controls are exempt from WCAG 1.4.3.
- `border-default`: decoration. Use `border-strong` when a border is the only visible edge.

`text-secondary` diverges from the sample. The sampled grey `#767587` measured 4.21:1 on `bg-page`
and 3.99:1 on `bg-hover`, so the role uses a darker step that reaches 4.5:1 on every background.

## Not designed yet

Status colours, focus ring width and offset, a heading scale, radius for fills inside a 12px
surface, z-index and breakpoints.

## Changing tokens

Edit `src/`, then run `pnpm --filter @sklop/tokens generate:tokens` and commit `generated/` with the
change. `build` fails when `generated/` does not match `src/`. Colour primitives come from
`generate:ramp`; never edit them by hand.

## Owner

Denis Stritar. Changes go through a pull request.
