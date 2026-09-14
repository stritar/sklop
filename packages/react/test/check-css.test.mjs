// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkCss, listComponentCss } from '../scripts/check-css.mjs';

const fixture = (name) => readFileSync(new URL(`./fixtures/css/${name}`, import.meta.url), 'utf8');
const rules = (css) => checkCss(css, 'test.module.css').map((p) => p.rule);

describe('component CSS check', () => {
  it('passes logical properties, token chains and generated regions', () => {
    expect(checkCss(fixture('good.module.css'), 'good.module.css')).toEqual([]);
  });

  it.each([
    ['bad-physical-property.module.css', ['physical-property']],
    ['bad-physical-keyword.module.css', ['physical-keyword']],
    ['bad-physical-shorthand.module.css', ['physical-shorthand', 'physical-shorthand']],
    ['bad-raw-color.module.css', ['raw-color', 'raw-color', 'raw-color']],
    ['bad-raw-unit.module.css', ['raw-unit', 'raw-unit', 'raw-unit']],
    ['bad-var-fallback.module.css', ['var-fallback', 'var-fallback']],
    ['bad-var-name.module.css', ['var-name', 'var-name']],
    ['bad-public-token.module.css', ['public-token']],
  ])('%s fails with %j', (name, expected) => {
    expect(rules(fixture(name))).toEqual(expected);
  });

  it('names the logical replacement for a physical property', () => {
    const css = `.a {
      top: 0; min-width: 0; border-left-color: currentColor;
      border-top-left-radius: 0; scroll-padding-right: 0;
    }`;
    expect(checkCss(css, 'test.module.css').map((p) => p.message)).toEqual([
      'top is physical; use inset-block-start',
      'min-width is physical; use min-inline-size',
      'border-left-color is physical; use border-inline-start-color',
      'border-top-left-radius is physical; use border-start-start-radius',
      'scroll-padding-right is physical; use scroll-padding-inline-end',
    ]);
  });

  it('allows raw values only as the literal at the end of a fallback chain', () => {
    expect(rules('.a { gap: var(--sk-space-gap-sm, var(--sk-space-gap-xs, 4px)); }')).toEqual([]);
    expect(rules('.a { gap: calc(var(--sk-space-gap-sm, 0.5rem) + 1px); }')).toEqual(['raw-unit']);
    expect(
      rules('.a { color: var(--sk-color-text-primary, var(--sk-color-text-secondary,)); }'),
    ).toEqual(['var-fallback']);
  });

  it('keeps names that look like colours out of the colour rule', () => {
    expect(
      rules('.a { font-family: Tan, sans-serif; grid-area: navy; animation-name: red; }'),
    ).toEqual([]);
  });

  it('flags physical keywords even inside a fallback', () => {
    expect(rules('.a { float: var(--_sk-sample-float, left); resize: horizontal; }')).toEqual([
      'physical-keyword',
      'physical-keyword',
    ]);
  });

  it('reports where each problem is', () => {
    expect(checkCss(fixture('bad-raw-unit.module.css'), 'bad.module.css')).toMatchObject([
      { file: 'bad.module.css', line: 2, column: 3, rule: 'raw-unit' },
      { line: 3, column: 3, rule: 'raw-unit' },
      { line: 6, column: 1, rule: 'raw-unit' },
    ]);
  });

  it('covers component CSS Modules only', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sklop-css-'));
    mkdirSync(join(dir, 'Card'));
    writeFileSync(join(dir, 'Card/Card.module.css'), '.root { gap: 0; }\n');
    writeFileSync(join(dir, 'Card/notes.css'), '.root { gap: 1px; }\n');
    expect(listComponentCss(dir)).toEqual([join(dir, 'Card/Card.module.css')]);
    expect(listComponentCss(join(dir, 'missing'))).toEqual([]);
  });
});
