# Sklop

An AI-native React UI library you can use from npm, or copy into your app and own.

> Early foundations. Not ready for production.

## Use from npm

```sh
npm install @sklop/react
```

No components yet. The theme provider is ready: it sets the theme, density, font scale, radius,
motion and direction for the whole page or for one region.

```tsx
// app/layout.tsx in the Next.js App Router
import '@sklop/tokens/tokens.css';
import { SklopProvider, SklopScript } from '@sklop/react';

const sklop = { theme: 'system', persistKey: 'sklop' } as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <SklopScript {...sklop} />
      </head>
      <body>
        <SklopProvider {...sklop}>{children}</SklopProvider>
      </body>
    </html>
  );
}
```

`SklopScript` applies stored choices before first paint, so a saved dark theme never flashes light.
Pass it the same props as `SklopProvider`. `useSklop()` reads and changes the axes, and `useMotion()`
returns the motion level in effect. A `SklopProvider` inside another one scopes its region.

## Tokens

```sh
npm install @sklop/tokens
```

```ts
import '@sklop/tokens/tokens.css';
```

Colours, type, spacing, sizes, shape and motion as CSS custom properties, such as
`--sk-color-text-primary`, with light and dark themes and axes set by data attributes. Load the
Figtree font in your app. See [packages/tokens](packages/tokens/README.md).

## Own a component

```sh
npx @sklop/cli add <component>
```

Copies the component's `.tsx` and `.module.css` into `src/components/sklop/`. Change the
folder with `sklop.json`: `{ "componentsDir": "app/ui" }`.

## In this repository

- `packages/tokens`, `packages/react`, `packages/cli`: the published packages.
- `apps/hub`: the token page, where every token and axis can be reviewed live.
- `apps/next-example`: a Next.js App Router app built and tested in CI.
- `e2e`: Playwright suites for the apps and the token cascade.

## License

MIT
