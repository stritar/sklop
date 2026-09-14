# Sklop

An AI-native React UI library you can use from npm, or copy into your app and own.

> Early foundations. Not ready for production.

## Use from npm

```sh
npm install @sklop/react
```

No components yet.

## Tokens

```sh
npm install @sklop/tokens
```

```ts
import '@sklop/tokens/tokens.css';
```

Colours, type, spacing, sizes, shape and motion as CSS custom properties, such as
`--sk-color-text-primary`. Load the Figtree font in your app. See
[packages/tokens](packages/tokens/README.md).

## Own a component

```sh
npx @sklop/cli add <component>
```

Copies the component's `.tsx` and `.module.css` into `src/components/sklop/`. Change the
folder with `sklop.json`: `{ "componentsDir": "app/ui" }`.

## License

MIT
