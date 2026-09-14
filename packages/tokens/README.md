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
  transition: opacity var(--sk-motion-duration-normal) var(--sk-motion-easing-enter);
}
```

`--sk-font-*` tokens are `font` shorthands, which reset the font longhands they do not set. Declare
longhands such as `font-variant-numeric` after them. Tokens sit in `@layer sklop.tokens`, so any
unlayered CSS in your app wins.

## Tokens

Every token, with its value, origin and description, is listed in `@sklop/tokens/tokens.json`.

| Group | Custom properties |
| --- | --- |
| Colour | `--sk-color-bg-*`, `--sk-color-text-*`, `--sk-color-border-*`, `--sk-color-accent-*` |
| Type | `--sk-font-family-base`, `--sk-font-label-{md,sm}`, `--sk-font-body-{md,sm}`, `--sk-font-input-md` |
| Space | `--sk-space-gap-{xs,sm}`, `--sk-space-inset-{sm,lg}` |
| Size | `--sk-size-icon-{sm,md}`, `--sk-size-control-{sm,lg}` |
| Shape | `--sk-radius-{lg,full}`, `--sk-border-width-default`, `--sk-shadow-raised` |
| Motion | `--sk-motion-duration-{fast,normal,moderate}`, `--sk-motion-easing-{standard,enter,exit}` |

## Names

The source is DTCG JSON named `{tier}.{category}.{role}.{variant}.{state}`. The CSS name drops the
tier: `--sk-{category}-{role}-{variant}-{state}`. Only semantic tokens reach the CSS, as final
values. Primitives, such as ramp steps, stay in the source.

To find a value, start from the category (`color`, `font`, `space`, `size`, `radius`, `border`,
`shadow`, `motion`), then the role, then the variant and state.

`primary` means the most prominent member of its group, as in `text-primary`. The brand colour is
always `accent`.

## Where values come from

Each token records an origin:

- `sample`: read from the Figma sample. A test checks every sampled token against the nodes it cites.
- `generated`: colour roles the sample does not show. They sit on OKLCH ramps that pass exactly
  through the sampled colours, and they need design review before a component relies on them.
- `proposed`: motion. The sample is a static frame.

## Motion

- `duration-fast` (100ms): small elements, such as a tooltip appearing.
- `duration-normal` (200ms): the default, such as a dropdown opening.
- `duration-moderate` (300ms): medium elements, such as a dialog entering.
- Use `easing-enter` for elements arriving, `easing-exit` for elements leaving and
  `easing-standard` for changes of state.
- Stagger related elements by 30 to 50ms. Elements in one group share a duration and an easing. A
  whole sequence stays under 500ms.

When the operating system asks for reduced motion, every duration becomes 1ms. Transitions end at
once, and their end events still fire. Loops, such as spinners, keep their own timing and do not use
these tokens.

## Contrast

Each foreground role lists the backgrounds it is used on in `$extensions.sklop.contrast`, and
`tokens.json` carries the same list. The build fails when a pair falls below its WCAG 2 minimum:
4.5:1 for text, 3:1 for borders and focus. A pair below AA records why instead:

- `accent-solid` measures 2.66:1 on `bg-raised`. The glyph identifies the control, and
  `text-on-accent` carries the contrast on the fill. White there would also measure 2.66:1.
- `text-disabled`: disabled controls are exempt from WCAG 1.4.3.
- `border-default`: decoration. Use `border-strong` when a border is the only visible edge.

`text-secondary` diverges from the sample. The sampled grey `#767587` measured 4.21:1 on `bg-page`
and 3.99:1 on `bg-hover`, so the role uses a darker step that reaches 4.5:1 on every background.

## Not designed yet

Status colours, focus ring width and offset, type above 14px, radius for fills inside a 12px
surface, z-index, breakpoints and a dark theme.

## Owner

Denis Stritar. Changes go through a pull request.
