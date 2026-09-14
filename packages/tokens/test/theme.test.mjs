import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { axes, tokenNames } from '../generated/theme.js';
import { AXES, buildTokens, readSource } from '../scripts/build.mjs';

const root = new URL('..', import.meta.url);
const { css, json } = buildTokens(readSource(fileURLToPath(root)));
const semanticNames = json.filter((t) => t.tier === 'semantic').map((t) => t.name);
const presets = JSON.parse(readFileSync(new URL('generated/presets.json', root), 'utf8'));
const types = readFileSync(new URL('generated/theme.d.ts', root), 'utf8');

/** Declarations of one top-level rule in the generated CSS. */
const declarations = (selector) => {
  const start = css.indexOf(`\n  ${selector} {\n`);
  const body = css.slice(start, css.indexOf('\n  }\n', start));
  return Object.fromEntries(
    [...body.matchAll(/^\s+(--sk-[a-z0-9-]+): ([^;]+);$/gm)].map(([, name, value]) => [
      name,
      value,
    ]),
  );
};

describe('theme module', () => {
  it('lists every public token name', () => {
    expect(tokenNames).toEqual(semanticNames);
  });

  it('exposes the runtime axes without build-only fields', () => {
    for (const [name, axis] of Object.entries(AXES)) {
      const { categories, ...runtime } = axis;
      expect(axes[name]).toEqual(runtime);
    }
  });

  it('types every token name and axis value', () => {
    for (const name of semanticNames) expect(types).toContain(`| '${name}'`);
    expect(types).toContain('export type Theme = Partial<Record<SklopTokenName, string>>;');
    expect(types).toContain("'theme': 'light' | 'dark' | 'system';");
    expect(types).toContain("'motion': 'full' | 'reduced' | 'off' | 'system';");
  });
});

describe('presets', () => {
  it('are flat maps of public token names, one per theme', () => {
    expect(Object.keys(presets)).toEqual(['neutral']);
    for (const theme of AXES.theme.values) {
      const map = presets.neutral[theme];
      expect(Object.keys(map).length).toBeGreaterThan(0);
      for (const [name, value] of Object.entries(map)) {
        expect(tokenNames).toContain(name);
        expect(typeof value).toBe('string');
      }
    }
  });

  it('match the compound CSS blocks the attributes select', () => {
    for (const theme of AXES.theme.values) {
      expect(presets.neutral[theme]).toEqual(
        declarations(`[data-sk-theme="${theme}"][data-sk-preset="neutral"]`),
      );
    }
  });
});
