import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AXES, buildTokens, CROSS, readSource, staleFiles } from '../scripts/build.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const DEFAULTS = Object.fromEntries(Object.entries(AXES).map(([axis, def]) => [axis, def.default]));

/** Top-level rules at one indent: selector, raw body and declarations. */
function blocks(css, indent) {
  const pattern = new RegExp(
    `^ {${indent}}(\\S[^\\n{]*) \\{\\n([\\s\\S]*?)\\n {${indent}}\\}$`,
    'gm',
  );
  return [...css.matchAll(pattern)].map(([, selector, body]) => ({
    selector,
    body,
    declarations: Object.fromEntries(
      [...body.matchAll(/^\s+([a-z-]+): ([^;]+);$/gm)].map(([, name, value]) => [name, value]),
    ),
  }));
}

/** The value a token should declare for concrete axis values. */
const valueIn = (token, combo) => {
  const key = token.varies
    .filter((axis) => combo[axis] !== DEFAULTS[axis])
    .map((axis) => `${axis}.${combo[axis]}`)
    .join('+');
  return token.variants[key] ?? token.value;
};
const expectedBlock = (tokens, combo, scheme) => ({
  ...(scheme ? { 'color-scheme': scheme } : {}),
  ...Object.fromEntries(tokens.map((t) => [t.name, valueIn(t, combo)])),
});

describe('generated CSS', () => {
  const { css, json } = buildTokens(readSource(root));
  const semantic = json.filter((t) => t.tier === 'semantic');
  const top = blocks(css, 2);
  const block = (selector) => top.find((b) => b.selector === selector)?.declarations;
  const mediaRule = top.find((b) => b.selector === '@media (prefers-color-scheme: dark)');
  const inMedia = (selector) =>
    blocks(mediaRule.body, 4).find((b) => b.selector === selector)?.declarations;
  const variedBy = (...axes) =>
    semantic.filter((t) => axes.every((axis) => t.varies.includes(axis)));

  it('declares the layer order before any tokens', () => {
    expect(css.indexOf('@layer sklop.tokens, sklop.components;')).toBeLessThan(
      css.indexOf('--sk-'),
    );
  });

  it('puts every semantic default on :root, and only custom properties', () => {
    expect(block(':root')).toEqual(expectedBlock(semantic, DEFAULTS));
    expect(css).not.toContain('var(');
    expect(css).not.toContain('primitive');
    expect(json.filter((t) => t.tier === 'primitive').every((t) => t.name === null)).toBe(true);
  });

  it('gives every theme a complete block that declares its colour scheme', () => {
    const themed = variedBy('theme');
    for (const theme of ['light', 'dark']) {
      expect(block(`[data-sk-theme="${theme}"]`)).toEqual(
        expectedBlock(themed, { ...DEFAULTS, theme }, theme),
      );
    }
    expect(block('[data-sk-theme="system"]')).toEqual(expectedBlock(themed, DEFAULTS, 'light'));
    expect(inMedia('[data-sk-theme="system"]')).toEqual(
      expectedBlock(themed, { ...DEFAULTS, theme: 'dark' }, 'dark'),
    );
  });

  it('gives every preset a block, and every explicit theme and preset pair a compound block', () => {
    const preset = variedBy('preset');
    const both = variedBy('theme', 'preset');
    for (const value of ['default', 'neutral']) {
      expect(block(`[data-sk-preset="${value}"]`)).toEqual(
        expectedBlock(preset, { ...DEFAULTS, preset: value }),
      );
      for (const theme of ['light', 'dark', 'system']) {
        const selector = `[data-sk-theme="${theme}"][data-sk-preset="${value}"]`;
        if (theme === 'light' && value === 'default') {
          expect(block(selector)).toBeUndefined();
          continue;
        }
        const concrete = theme === 'system' ? 'light' : theme;
        expect(block(selector)).toEqual(
          expectedBlock(both, { ...DEFAULTS, theme: concrete, preset: value }),
        );
      }
      expect(inMedia(`[data-sk-theme="system"][data-sk-preset="${value}"]`)).toEqual(
        expectedBlock(both, { ...DEFAULTS, theme: 'dark', preset: value }),
      );
    }
  });

  it('keeps color-scheme out of :root and preset blocks', () => {
    const withScheme = top
      .filter((b) => !b.selector.startsWith('@media') && 'color-scheme' in b.declarations)
      .map((b) => b.selector);
    expect(withScheme).toEqual([
      '[data-sk-theme="light"]',
      '[data-sk-theme="dark"]',
      '[data-sk-theme="system"]',
    ]);
  });

  it('varies every colour and the shadow by theme, and only accent roles by preset', () => {
    const colours = semantic.filter((t) => ['color', 'shadow'].includes(t.type));
    expect(colours.filter((t) => !t.varies.includes('theme')).map((t) => t.path)).toEqual([]);
    expect(variedBy('preset').map((t) => t.path)).toEqual([
      'semantic.color.text.on-accent',
      'semantic.color.border.focus',
      'semantic.color.accent.solid',
      'semantic.color.accent.solid-hover',
      'semantic.color.accent.subtle',
      'semantic.color.accent.border',
      'semantic.color.accent.text',
    ]);
  });
});

describe('drift check', () => {
  it('finds the committed generated files up to date', () => {
    expect(staleFiles(root)).toEqual([]);
  });

  it('flags a hand-edited or missing generated file', () => {
    const copy = mkdtempSync(join(tmpdir(), 'sklop-tokens-'));
    cpSync(join(root, 'src'), join(copy, 'src'), { recursive: true });
    cpSync(join(root, 'generated'), join(copy, 'generated'), { recursive: true });
    expect(staleFiles(copy)).toEqual([]);
    writeFileSync(join(copy, 'generated', 'tokens.css'), '/* edited by hand */\n');
    rmSync(join(copy, 'generated', 'tokens.json'));
    expect(staleFiles(copy)).toEqual(['tokens.css', 'tokens.json']);
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
  const build = (edit, registry) => {
    const source = minimal();
    edit(source);
    return () => buildTokens(source, registry);
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

  it('rejects names outside the grammar', () => {
    expect(
      build((s) =>
        Object.assign(s.semantic, {
          mood: { $type: 'color', calm: { $value: '{primitive.color.black}', ...meta() } },
        }),
      ),
    ).toThrow(/"mood" is not a category/);
    expect(
      build((s) =>
        Object.assign(s.semantic.space, {
          one: { two: { three: { four: { $value: '{primitive.space.4}', ...meta() } } } },
        }),
      ),
    ).toThrow(/\{category\}\.\{role\}\[\.\{variant\}\]\[\.\{state\}\]/);
  });

  it('rejects a physical direction in a name', () => {
    expect(
      build((s) =>
        Object.assign(s.semantic.space.gap, {
          'inset-left': { $value: '{primitive.space.4}', ...meta() },
        }),
      ),
    ).toThrow(/"inset-left" names a physical direction/);
    expect(
      build((s) => Object.assign(s.primitive.space, { top: { $value: px(4), ...meta() } })),
    ).toThrow(/"top" names a physical direction/);
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

  it('rejects an unused primitive', () => {
    expect(
      build((s) => Object.assign(s.primitive.space, { 8: { $value: px(8), ...meta() } })),
    ).toThrow(/unused primitive/);
  });

  it('keeps unused sampled anchors, and allows anchors on primitives only', () => {
    const anchor = { $value: px(8), ...meta('sample', { anchor: true }) };
    expect(build((s) => Object.assign(s.primitive.space, { 8: anchor }))).not.toThrow();
    expect(
      build((s) => Object.assign(s.semantic.space.gap.xs, meta('proposed', { anchor: true }))),
    ).toThrow(/anchor/);
  });

  it('rejects malformed approval and divergence records', () => {
    const on = (extra) => (s) => Object.assign(s.semantic.color.text, meta('generated', extra));
    expect(build(on({ approved: '2026-09-14' }))).not.toThrow();
    expect(build(on({ approved: 'yesterday' }))).toThrow(/approved/);
    expect(build(on({ diverges: { from: [], reason: 'Too light.', date: '2026-09-14' } }))).toThrow(
      /diverges/,
    );
    expect(build(on({ diverges: { from: ['1:12.fill'], reason: 'Too light.' } }))).toThrow(
      /diverges.date/,
    );
  });

  describe('axes', () => {
    const white = (s) =>
      Object.assign(s.primitive.color, {
        white: { $value: color('#ffffff', [1, 1, 1]), ...meta() },
      });
    const vary = (sklop, registry) =>
      build((s) => {
        white(s);
        Object.assign(s.semantic.color.text, meta('proposed', sklop));
      }, registry);
    const W = '{primitive.color.white}';

    it('accept a dark value and a complete cross product', () => {
      expect(vary({ axes: { theme: { dark: W } } })).not.toThrow();
      expect(
        vary({
          axes: { preset: { neutral: W } },
          cross: { 'theme.dark+preset.neutral': '{primitive.color.black}' },
        }),
      ).not.toThrow();
    });

    it('reject modes, axis values on primitives, unknown axes and default values', () => {
      expect(vary({ modes: { 'reduced-motion': W } })).toThrow(/sklop.modes/);
      expect(
        build((s) =>
          Object.assign(
            s.primitive.space[4],
            meta('proposed', { axes: { theme: { dark: px(8) } } }),
          ),
        ),
      ).toThrow(/only semantic tokens vary/);
      expect(vary({ axes: { mood: { dark: W } } })).toThrow(/unknown axis "mood"/);
      expect(vary({ axes: { theme: { light: W } } })).toThrow(/no non-default value "light"/);
    });

    it('reject an axis varying a category it does not own', () => {
      expect(
        build((s) =>
          Object.assign(
            s.semantic.space.gap.xs,
            meta('proposed', { axes: { theme: { dark: '{primitive.space.4}' } } }),
          ),
        ),
      ).toThrow(/theme axis does not vary space tokens/);
    });

    it('require every cross value, under a well-formed key', () => {
      expect(vary({ axes: { theme: { dark: W }, preset: { neutral: W } } })).toThrow(
        /needs cross "theme\.dark\+preset\.neutral"/,
      );
      expect(vary({ cross: { 'preset.neutral+theme.dark': W } })).toThrow(/cross key/);
    });

    it('reject two axes that are not a declared pair', () => {
      const mood = {
        attribute: 'data-sk-mood',
        values: ['calm', 'loud'],
        default: 'calm',
        categories: ['color'],
      };
      const registry = { axes: { ...AXES, mood }, cross: CROSS };
      expect(vary({ axes: { theme: { dark: W }, mood: { loud: W } } }, registry)).toThrow(
        /axes theme, mood vary this token together, but only a declared pair may/,
      );
    });

    it('gate documented pairs in every theme and preset', () => {
      expect(
        build((s) => {
          white(s);
          Object.assign(s.semantic.color, {
            page: {
              $value: W,
              ...meta('proposed', { axes: { theme: { dark: '{primitive.color.black}' } } }),
            },
          });
          Object.assign(
            s.semantic.color.text,
            meta('proposed', { contrast: [{ on: 'page', min: 4.5 }] }),
          );
        }),
      ).toThrow(
        /semantic\.color\.text on page \(theme dark\): 1\.00:1 is below the documented 4\.5:1/,
      );
    });
  });

  describe('documented contrast pairs', () => {
    const paper = (hex, components) => (s) => {
      Object.assign(s.primitive.color, { paper: { $value: color(hex, components), ...meta() } });
      Object.assign(s.semantic.color, { bg: { $value: '{primitive.color.paper}', ...meta() } });
    };
    const pair = (contrast, hex = '#ffffff', components = [1, 1, 1]) =>
      build((s) => {
        paper(hex, components)(s);
        Object.assign(s.semantic.color.text, meta('proposed', { contrast }));
      });

    it('pass when they meet their minimum or carry an exemption', () => {
      expect(pair([{ on: 'bg', min: 4.5 }])).not.toThrow();
      expect(pair([{ on: 'bg', exempt: 'Decoration.' }], '#333333', [0.2, 0.2, 0.2])).not.toThrow();
    });

    it('fail below their minimum', () => {
      expect(pair([{ on: 'bg', min: 4.5 }], '#333333', [0.2, 0.2, 0.2])).toThrow(
        /1\.66:1 is below the documented 4\.5:1/,
      );
    });

    it('reject unknown roles, ambiguous pairs and non-colour tokens', () => {
      expect(pair([{ on: 'bg.nope', min: 3 }])).toThrow(/unknown colour role/);
      expect(pair([{ on: 'bg', min: 3, exempt: 'Both.' }])).toThrow(/each contrast pair/);
      expect(
        build((s) =>
          Object.assign(
            s.semantic.space.gap.xs,
            meta('proposed', { contrast: [{ on: 'bg', min: 3 }] }),
          ),
        ),
      ).toThrow(/semantic colour tokens/);
    });
  });

  it('rejects sampled semantic tokens that cite no Figma node', () => {
    expect(build((s) => Object.assign(s.semantic.space.gap.xs, meta('sample')))).toThrow(
      /cite their Figma/,
    );
  });
});
