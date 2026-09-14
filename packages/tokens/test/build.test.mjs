import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildTokens, MODES, readSource } from '../scripts/build.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

describe('source', () => {
  const { css, json } = buildTokens(readSource(root));
  const semantic = json.filter((t) => t.tier === 'semantic');
  const [base, reduced] = css.split(MODES['reduced-motion']);
  const declared = (block) => [...block.matchAll(/^\s+(--sk-[a-z0-9-]+): ([^;]+);$/gm)];

  it('declares the layer order before any tokens', () => {
    expect(css.indexOf('@layer sklop.tokens, sklop.components;')).toBeLessThan(
      css.indexOf('--sk-'),
    );
  });

  it('emits every semantic token once, as a literal', () => {
    const names = declared(base).map(([, name]) => name);
    expect(names).toEqual(semantic.map((t) => t.name));
    expect(css).not.toContain('var(');
  });

  it('keeps primitives out of the CSS', () => {
    expect(json.filter((t) => t.tier === 'primitive').every((t) => t.name === null)).toBe(true);
    expect(css).not.toContain('primitive');
  });

  it('sets nothing on :root except custom properties', () => {
    const lines = css.split('\n').filter((line) => /^\s+(?!--)[a-z-]+:/.test(line));
    expect(lines).toEqual([]);
  });

  it('collapses every duration, and only durations, under reduced motion', () => {
    const durations = semantic.filter((t) => t.type === 'duration');
    expect(declared(reduced).map(([, name, value]) => [name, value])).toEqual(
      durations.map((t) => [t.name, '1ms']),
    );
  });
});

describe('guards', () => {
  const meta = (origin = 'proposed', extra = {}) => ({
    $description: 'Test token.',
    $extensions: { sklop: { origin, ...extra } },
  });
  const px = (value) => ({ value, unit: 'px' });
  const color = (hex, components) => ({ colorSpace: 'srgb', components, hex });
  const minimal = () => ({
    primitive: {
      space: { $type: 'dimension', 4: { $value: px(4), ...meta() } },
      color: { $type: 'color', black: { $value: color('#000000', [0, 0, 0]), ...meta() } },
    },
    semantic: {
      space: { $type: 'dimension', gap: { xs: { $value: '{primitive.space.4}', ...meta() } } },
      color: { $type: 'color', text: { $value: '{primitive.color.black}', ...meta() } },
    },
  });
  const build = (edit) => {
    const source = minimal();
    edit(source);
    return () => buildTokens(source);
  };

  it('builds the minimal source', () => {
    expect(build(() => {})).not.toThrow();
  });

  it('rejects an unknown tier', () => {
    expect(build((s) => Object.assign(s, { component: {} }))).toThrow(/unknown tier/);
  });

  it('rejects segments outside lowercase words and digits', () => {
    expect(
      build((s) => Object.assign(s.semantic.space.gap, { Tight: s.semantic.space.gap.xs })),
    ).toThrow(/lowercase/);
  });

  it('rejects a token without $type, $description or origin', () => {
    expect(build((s) => delete s.primitive.space.$type)).toThrow(/missing \$type/);
    expect(build((s) => delete s.primitive.space[4].$description)).toThrow(/missing \$description/);
    expect(build((s) => Object.assign(s.primitive.space[4], meta('guessed')))).toThrow(/origin/);
  });

  it('rejects aliases in primitives and literals in semantic tokens', () => {
    expect(
      build((s) =>
        Object.assign(s.primitive.space, { 8: { $value: '{primitive.space.4}', ...meta() } }),
      ),
    ).toThrow(/primitives hold literals/);
    expect(build((s) => Object.assign(s.semantic.space.gap.xs, { $value: px(4) }))).toThrow(
      /alias a primitive/,
    );
  });

  it('rejects unresolved aliases, semantic-to-semantic aliases and type mismatches', () => {
    expect(
      build((s) => Object.assign(s.semantic.space.gap.xs, { $value: '{primitive.space.5}' })),
    ).toThrow(/unresolved alias/);
    expect(
      build((s) =>
        Object.assign(s.semantic.color, { ink: { $value: '{semantic.color.text}', ...meta() } }),
      ),
    ).toThrow(/not a primitive/);
    expect(
      build((s) => Object.assign(s.semantic.space.gap.xs, { $value: '{primitive.color.black}' })),
    ).toThrow(/expects dimension/);
  });

  it('rejects a hex that disagrees with its components', () => {
    expect(build((s) => Object.assign(s.primitive.color.black.$value, { hex: '#010101' }))).toThrow(
      /does not match/,
    );
  });

  it('rejects composites with missing parts or literal parts outside the exceptions', () => {
    const layer = () => ({
      color: '{primitive.color.black}',
      offsetX: px(0),
      offsetY: px(1),
      blur: px(2),
      spread: px(0),
    });
    const withShadow = (value) => (s) =>
      Object.assign(s.semantic, {
        shadow: { $type: 'shadow', raised: { $value: value, ...meta() } },
      });
    expect(build(withShadow([layer()]))).not.toThrow();
    const missing = layer();
    delete missing.spread;
    expect(build(withShadow([missing]))).toThrow(/missing spread/);
    expect(build(withShadow([{ ...layer(), color: color('#000000', [0, 0, 0]) }]))).toThrow(
      /must alias a primitive/,
    );
  });

  it('rejects letter spacing the font shorthand cannot carry', () => {
    expect(
      build((s) => {
        Object.assign(s.primitive, {
          font: {
            family: { $type: 'fontFamily', ui: { $value: 'Figtree', ...meta() } },
            weight: { $type: 'fontWeight', bold: { $value: 700, ...meta() } },
            size: { $type: 'dimension', 14: { $value: px(14), ...meta() } },
          },
        });
        Object.assign(s.semantic, {
          font: {
            $type: 'typography',
            label: {
              $value: {
                fontFamily: '{primitive.font.family.ui}',
                fontSize: '{primitive.font.size.14}',
                fontWeight: '{primitive.font.weight.bold}',
                letterSpacing: '{primitive.space.4}',
                lineHeight: 1.2,
              },
              ...meta(),
            },
          },
        });
      }),
    ).toThrow(/letter spacing/);
  });

  it('rejects two tokens with one CSS name', () => {
    expect(
      build((s) =>
        Object.assign(s.semantic.space, { 'gap-xs': { $value: '{primitive.space.4}', ...meta() } }),
      ),
    ).toThrow(/already the name/);
  });

  it('rejects unknown modes and modes on primitives', () => {
    expect(
      build((s) =>
        Object.assign(
          s.semantic.space.gap.xs,
          meta('proposed', { modes: { dark: '{primitive.space.4}' } }),
        ),
      ),
    ).toThrow(/unknown mode/);
    expect(
      build((s) =>
        Object.assign(
          s.primitive.space[4],
          meta('proposed', { modes: { 'reduced-motion': px(0) } }),
        ),
      ),
    ).toThrow(/only semantic tokens take modes/);
  });

  it('rejects an unused primitive', () => {
    expect(
      build((s) => Object.assign(s.primitive.space, { 8: { $value: px(8), ...meta() } })),
    ).toThrow(/unused primitive/);
  });

  it('rejects sampled semantic tokens that cite no Figma node', () => {
    expect(build((s) => Object.assign(s.semantic.space.gap.xs, meta('sample')))).toThrow(
      /cite their Figma/,
    );
  });
});
