import { readFileSync } from 'node:fs';
import { converter } from 'culori';
import { describe, expect, it } from 'vitest';
import { ANCHORS, generateColors, HUE_FROM } from '../scripts/generate-ramp.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const fixture = read('../fixtures/figma-sample.json');
const semantic = read('../src/semantic.tokens.json');
const colors = read('../src/primitive.tokens.json').primitive.color;
const toOklch = converter('oklch');
const hueDistance = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

describe('primitive colours', () => {
  it('are exactly what the generator writes, with every contrast gate passing', () => {
    const { tree, errors } = generateColors({ fixture, semantic });
    expect(errors).toEqual([]);
    expect(colors).toEqual(tree);
  });

  describe.each(Object.keys(ANCHORS))('%s', (ramp) => {
    const steps = Object.entries(colors[ramp]).sort(([a], [b]) => Number(a) - Number(b));

    it('gets darker at every step', () => {
      const lightness = steps.map(([, token]) => toOklch(token.$value.hex).l);
      lightness.slice(1).forEach((l, i) => {
        expect(l).toBeLessThan(lightness[i]);
      });
    });

    it('pins sampled steps to the Figma fills', () => {
      for (const [step, id] of Object.entries(ANCHORS[ramp])) {
        expect(colors[ramp][step].$value.hex).toBe(fixture.nodes[id].fill);
        expect(colors[ramp][step].$extensions.sklop.origin).toBe('sample');
      }
    });

    it('keeps the ramp hue on vivid generated steps', () => {
      const anchorHues = HUE_FROM[ramp].map(
        (step) => toOklch(fixture.nodes[ANCHORS[ramp][step]].fill).h,
      );
      const hue = anchorHues.reduce((a, b) => a + b, 0) / anchorHues.length;
      for (const [, token] of steps.filter(([, t]) => t.$extensions.sklop.origin === 'generated')) {
        const { c, h } = toOklch(token.$value.hex);
        if (c > 0.02) expect(hueDistance(h, hue)).toBeLessThan(3);
      }
    });
  });
});
