#!/usr/bin/env node
// Component tier: each manifest token becomes a private property on its part, reading the public component
// token first, then the semantic default, then that default's literal. Library CSS never declares the public
// name, so a consumer can set it on any ancestor. `--check` fails when a region is stale.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { readTokensJson, semanticTokens } from './check-manifests.mjs';

const REGION = /\/\* @sklop:tokens:start[^*]*\*\/[\s\S]*?\/\* @sklop:tokens:end \*\/\n*/;
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** The generated region for one manifest, or '' when it declares no tokens. */
export function componentRegion(manifest, semantic) {
  const component = kebab(manifest.name);
  const entries = Object.entries(manifest.tokens ?? {});
  if (!entries.length) return '';
  const rules = manifest.parts
    .map((part) => {
      const lines = entries
        .filter(([, token]) => token.part === part)
        .map(([name, token]) => {
          const target = semantic.get(token.default);
          if (!target) {
            throw new Error(
              `${manifest.name}: token "${name}" defaults to unknown "${token.default}"`,
            );
          }
          const chain = `var(${target.name}, ${target.value})`;
          return `  --_sk-${component}-${name}: var(--sk-${component}-${name}, ${chain});`;
        });
      return lines.length ? `.${part} {\n${lines.join('\n')}\n}\n` : '';
    })
    .filter(Boolean);
  const start = `/* @sklop:tokens:start. Generated from ${manifest.name}.manifest.json by pnpm --filter @sklop/react generate:component-tokens */`;
  return `${start}\n${rules.join('\n')}/* @sklop:tokens:end */\n`;
}

/** The stylesheet with its region replaced, added at the top, or removed when `region` is ''. */
export function applyRegion(css, region) {
  const body = css.replace(REGION, '');
  return region ? `${region}\n${body}` : body;
}

/** Rules as selector and declarations, with whitespace normalised, so formatting never counts as drift. */
function canonical(css) {
  const normalize = (value) =>
    value
      .replace(/\s+/g, ' ')
      .replace(/\(\s/g, '(')
      .replace(/\s\)/g, ')')
      .replace(/\s*,\s*/g, ', ')
      .trim();
  const rules = [];
  postcss.parse(css).walkRules((rule) => {
    const decls = [];
    rule.walkDecls((decl) => decls.push(`${decl.prop}: ${normalize(decl.value)}`));
    rules.push(`${rule.selector} { ${decls.join('; ')} }`);
  });
  return rules.join('\n');
}

const regionOf = (css) => css.match(REGION)?.[0] ?? '';

/** Component folders under `componentsDir` that have a manifest, with their paths. */
function components(componentsDir) {
  if (!existsSync(componentsDir)) return [];
  return readdirSync(componentsDir)
    .sort()
    .map((name) => ({
      name,
      manifest: join(componentsDir, name, `${name}.manifest.json`),
      css: join(componentsDir, name, `${name}.module.css`),
    }))
    .filter(({ manifest, css }) => existsSync(manifest) && existsSync(css));
}

/** Components whose committed region differs from their manifest. */
export function staleComponents(componentsDir, semantic) {
  return components(componentsDir)
    .filter(({ manifest, css }) => {
      const expected = componentRegion(JSON.parse(readFileSync(manifest, 'utf8')), semantic);
      return canonical(expected) !== canonical(regionOf(readFileSync(css, 'utf8')));
    })
    .map(({ name }) => name);
}

/** Rewrites every component's region from its manifest; returns the components written. */
export function writeComponentTokens(componentsDir, semantic) {
  return components(componentsDir).map(({ name, manifest, css }) => {
    const region = componentRegion(JSON.parse(readFileSync(manifest, 'utf8')), semantic);
    writeFileSync(css, applyRegion(readFileSync(css, 'utf8'), region));
    return name;
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const componentsDir = join(root, 'src', 'components');
  const semantic = semanticTokens(readTokensJson(root));
  if (process.argv.includes('--check')) {
    const stale = staleComponents(componentsDir, semantic);
    if (stale.length) {
      console.error(
        `@sklop/react: component token regions out of date in ${stale.join(', ')}. Run pnpm --filter @sklop/react generate:component-tokens.`,
      );
      process.exit(1);
    }
    console.log('@sklop/react component tokens: regions match manifests');
  } else {
    const written = writeComponentTokens(componentsDir, semantic);
    console.log(`@sklop/react component tokens: ${written.join(', ') || '(no components)'}`);
  }
}
