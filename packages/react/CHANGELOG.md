# @sklop/react

## 0.0.3

### Patch Changes

- bd51957: Add `SklopProvider`, `SklopScript`, `useSklop` and `useMotion`. The provider sets every theming axis
  on `<html>`, or on a wrapper when nested or scoped, and can persist choices. `SklopScript` applies
  stored choices before first paint. Both work in the Next.js App Router.
- Updated dependencies
  - @sklop/tokens@0.2.0

## 0.0.2

### Patch Changes

- dc99df3: Add design tokens from the Figma sample as CSS custom properties: colour roles, type, spacing,
  sizes, radius, shadow and motion. `@sklop/react` now depends on `@sklop/tokens`.
- Updated dependencies [dc99df3]
  - @sklop/tokens@0.1.0
