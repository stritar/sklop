# Sklop

An AI-native React UI library you can use from npm, or copy into your app and own.

> Early foundations. Not ready for production.

## Use from npm

```sh
npm install @sklop/react
```

```tsx
import '@sklop/react/styles.css';
import { Button } from '@sklop/react';
```

## Style

Target stable classes: `.sk-Button-label { … }`. Sklop styles sit in a CSS layer, so your CSS
wins.

## Own a component

```sh
npx @sklop/cli add button
```

Copies `Button.tsx` and `Button.module.css` into `src/components/sklop/`. Change the folder
with `sklop.json`: `{ "componentsDir": "app/ui" }`.

## License

MIT
