# Sklop

An AI-native React UI library you can theme with CSS custom properties, or copy into your app
and own.

> Early foundations. Not ready for production.

## Use from npm

```sh
npm install @sklop/react
```

```tsx
import '@sklop/tokens/tokens.css';
import '@sklop/react/styles.css';
import { Button } from '@sklop/react';
```

## Theme

- Set tokens: `:root { --sk-color-fill--accent: #0a7; }`
- Set one component: `--sk-button-container-padding--inline: 20px`
- Target stable classes: `.sk-Button-label { … }`. Sklop styles sit in CSS layers, so your
  CSS wins.
- Switch modes: `data-sk-theme="dark"`, `data-sk-motion="reduced"`

## Own a component

```sh
npx @sklop/cli add button
```

Copies `Button.tsx` and `Button.module.css` into `src/components/sklop/`. Change the folder
with `sklop.json`: `{ "componentsDir": "app/ui" }`.

## License

MIT
