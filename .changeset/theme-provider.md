---
'@sklop/react': patch
---

Add `SklopProvider`, `SklopScript`, `useSklop` and `useMotion`. The provider sets every theming axis
on `<html>`, or on a wrapper when nested or scoped, and can persist choices. `SklopScript` applies
stored choices before first paint. Both work in the Next.js App Router.
