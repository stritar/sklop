import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildTokens, tokenName } from '../scripts/build.mjs';

const read = (f) => JSON.parse(readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8'));
const seed = { primitive: read('primitive.tokens.json'), semantic: read('semantic.tokens.json') };
const color = (value, extra = {}) => ({ $type: 'color', $value: value, ...extra });

describe('seed', () => {
  const { css, json } = buildTokens(seed);

  it('builds', () => {
    expect(json.length).toBeGreaterThan(0);
    expect(css).toContain('@layer sklop.tokens');
  });

  it('ends every var() chain in a literal', () => {
    for (const t of json.filter((t) => t.tier === 'semantic')) {
      const fallback = t.css.match(/^var\(--sk-[a-z0-9-]+, (.*)\)$/)?.[1];
      expect(fallback).toBe(t.value);
      expect(fallback).not.toContain('var(');
    }
  });

  it('guards reduced motion on attribute presence', () => {
    expect(css).toContain(':root:not([data-sk-motion])');
    expect(css).not.toContain(":not([data-sk-motion='");
  });

  it('emits dark overrides as deltas only', () => {
    const block = css.split("[data-sk-theme='dark'] {")[1].split('}')[0];
    const moded = json.filter((t) => t.modes.dark);
    expect(block.match(/^\s+--sk-[a-z0-9-]+:/gm)).toHaveLength(moded.length);
  });
});

describe('guards', () => {
  it('rejects names outside the grammar', () => {
    expect(() => tokenName(['color'])).toThrow(/at least/);
    expect(() => tokenName(['Color', 'text', 'x'])).toThrow(/grammar/);
    expect(() => tokenName(['a', 'b', 'c', 'd', 'e'])).toThrow(/grammar/);
  });

  it('rejects physical direction words', () => {
    expect(() => tokenName(['space', 'padding', 'left'])).toThrow(/physical/);
    expect(() => tokenName(['space', 'inset', 'top-start'])).toThrow(/physical/);
  });

  it('rejects a semantic token reusing a primitive name', () => {
    const primitive = { font: { family: { sans: { $type: 'fontFamily', $value: 'x' } } } };
    const semantic = {
      font: { family: { sans: { $type: 'fontFamily', $value: '{font.family.sans}' } } },
    };
    expect(() => buildTokens({ primitive, semantic })).toThrow(/already used by primitive/);
  });

  it('rejects unresolved aliases, cycles and type mismatches', () => {
    const primitive = {
      color: { base: { a: color('#000') } },
      space: { s: { $type: 'dimension', $value: '4px' } },
    };
    expect(() =>
      buildTokens({ primitive, semantic: { color: { text: { x: color('{color.base.zz}') } } } }),
    ).toThrow(/unresolved/);
    expect(() =>
      buildTokens({
        primitive,
        semantic: { color: { text: { x: color('{color.text.y}'), y: color('{color.text.x}') } } },
      }),
    ).toThrow(/cycle/);
    expect(() =>
      buildTokens({ primitive, semantic: { color: { text: { x: color('{space.s}') } } } }),
    ).toThrow(/\$type/);
  });

  it('rejects aliases in primitives', () => {
    const primitive = { color: { base: { a: color('#000'), b: color('{color.base.a}') } } };
    expect(() => buildTokens({ primitive, semantic: {} })).toThrow(/literal/);
  });
});
