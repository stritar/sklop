import { fileURLToPath } from 'node:url';
import { wcagContrast } from 'culori';
import { describe, expect, it } from 'vitest';
import { buildTokens, contrastRatio, readSource } from '../scripts/build.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const { json } = buildTokens(readSource(root));
const value = (role) => json.find((t) => t.path === `semantic.color.${role}`).value;
const pairs = json.flatMap((t) =>
  t.contrast.map((pair) => ({ ...pair, fg: t.path.replace('semantic.color.', '') })),
);
const gated = pairs.filter((p) => p.min).map((p) => [p.fg, p.on, p.min]);
const exempt = pairs.filter((p) => p.exempt);

describe('documented contrast pairs', () => {
  it.each(gated)('%s on %s meets %s:1', (fg, bg, min) => {
    expect(wcagContrast(value(fg), value(bg))).toBeGreaterThanOrEqual(min);
  });

  it('covers every foreground role the components need', () => {
    const documented = new Set(pairs.map((p) => p.fg));
    for (const role of ['text.primary', 'text.secondary', 'text.on-accent', 'accent.text']) {
      expect(documented).toContain(role);
    }
  });

  it('reports exempt pairs with their reasons', () => {
    const rows = exempt.map(
      (p) =>
        `${p.fg} on ${p.on}: ${wcagContrast(value(p.fg), value(p.on)).toFixed(2)}:1 (${p.exempt})`,
    );
    console.info(`Exempt contrast pairs\n${rows.join('\n')}`);
    expect(exempt.every((p) => p.exempt.trim().length > 0)).toBe(true);
  });

  it('computes WCAG ratios the way culori does', () => {
    for (const [a, b] of [
      ['#58576a', '#f7f7f9'],
      ['#0b0402', '#ff7080'],
      ['#ffffff', '#000000'],
    ]) {
      expect(contrastRatio(a, b)).toBeCloseTo(wcagContrast(a, b), 6);
    }
  });
});
