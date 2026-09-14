import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildTokens, readSource } from '../scripts/build.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/figma-sample.json', import.meta.url), 'utf8'),
);
const { json } = buildTokens(readSource(root));
const sampled = json.filter((t) => t.origin === 'sample' && t.figma.length);

/** "1:5.padding.0" → the fixture value at node 1:5, path padding.0. */
const read = (cite) => {
  const [id, ...path] = cite.split('.');
  const node = fixture.nodes[id];
  if (!node) throw new Error(`${cite}: node ${id} is not in the fixture`);
  return { node, value: path.reduce((value, key) => value?.[key], node) };
};
const px = (css) => Number(css.replace(/px$/, ''));
const oneDecimal = (n) => Math.round(n * 10) / 10;

describe('sampled tokens match the Figma sample', () => {
  it.each(sampled.map((t) => [t.path, t]))('%s', (_, token) => {
    for (const cite of token.figma) {
      const { node, value } = read(cite);
      switch (token.type) {
        case 'color':
          expect(value, cite).toBe(token.value);
          break;
        case 'dimension':
          if (px(token.value) >= 9999) {
            // A pill: any radius of at least half the short side renders the same.
            expect(value, cite).toBeGreaterThanOrEqual(Math.min(node.width, node.height) / 2);
          } else {
            expect(value, cite).toBe(px(token.value));
          }
          break;
        case 'fontFamily':
          expect(value, cite).toBe(token.value.split(', ')[0]);
          break;
        case 'typography': {
          const [, weight, size, lineBox, families] = token.value.match(
            /^(\d+) ([\d.]+)rem\/([\d.]+)rem (.+)$/,
          );
          expect(node.fontWeight, cite).toBe(Number(weight));
          expect(node.fontSize, cite).toBe(Number(size) * 16);
          expect(node.lineHeight, cite).toEqual({ unit: 'PIXELS', value: Number(lineBox) * 16 });
          expect(node.letterSpacing, cite).toEqual({ unit: 'PERCENT', value: 0 });
          expect(node.fontFamily, cite).toBe(families.split(', ')[0]);
          break;
        }
        case 'shadow': {
          // Figma lists effects bottom to top; CSS lists shadows top to bottom.
          const layers = [...value]
            .reverse()
            .map(
              (e) =>
                `${oneDecimal(e.x)}px ${oneDecimal(e.y)}px ${oneDecimal(e.blur)}px ${oneDecimal(e.spread)}px ${e.color}`,
            );
          expect(token.value, cite).toBe(layers.join(', '));
          break;
        }
        default:
          throw new Error(`${token.path}: no Figma comparison for $type ${token.type}`);
      }
    }
  });
});

describe('the sample is fully covered', () => {
  const cited = new Set(sampled.flatMap((t) => t.figma));
  const nodes = Object.entries(fixture.nodes);

  it('cites every fill', () => {
    const fills = nodes.filter(([, n]) => n.fill).map(([id]) => `${id}.fill`);
    expect(fills.filter((cite) => !cited.has(cite))).toEqual([]);
  });

  it('cites every text node in a text style', () => {
    const texts = nodes.filter(([, n]) => n.type === 'TEXT').map(([id]) => id);
    expect(texts.filter((id) => !cited.has(id))).toEqual([]);
  });

  it('cites every radius and the shadow', () => {
    const radii = nodes.filter(([, n]) => n.radius).map(([id]) => `${id}.radius`);
    expect([...radii, '1:4.effects'].filter((cite) => !cited.has(cite))).toEqual([]);
  });
});
