import { fileURLToPath } from 'node:url';
import { wcagContrast } from 'culori';
import { describe, expect, it } from 'vitest';
import { AXES, buildTokens, contrastRatio, readSource } from '../scripts/build.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const { json } = buildTokens(readSource(root));
const byRole = (role) => json.find((t) => t.path === `semantic.color.${role}`);

/** The published value of a role for a theme and preset, read from tokens.json variants. */
const valueIn = (role, combo) => {
  const token = byRole(role);
  const key = token.varies
    .filter((axis) => combo[axis] !== AXES[axis].default)
    .map((axis) => `${axis}.${combo[axis]}`)
    .join('+');
  return token.variants[key] ?? token.value;
};
const combos = AXES.theme.values.flatMap((theme) =>
  AXES.preset.values.map((preset) => ({ theme, preset })),
);
const pairs = json.flatMap((t) =>
  t.contrast.map((pair) => ({ ...pair, fg: t.path.replace('semantic.color.', '') })),
);
const label = ({ theme, preset }) => `${theme}/${preset}`;

describe('documented contrast pairs', () => {
  const gated = combos.flatMap((combo) =>
    pairs.filter((p) => p.min).map((p) => [label(combo), p.fg, p.on, p.min, combo]),
  );

  it.each(gated)('%s: %s on %s meets %s:1', (_, fg, bg, min, combo) => {
    expect(wcagContrast(valueIn(fg, combo), valueIn(bg, combo))).toBeGreaterThanOrEqual(min);
  });

  it('covers every foreground role the components need', () => {
    const documented = new Set(pairs.map((p) => p.fg));
    for (const role of ['text.primary', 'text.secondary', 'text.on-accent', 'accent.text']) {
      expect(documented).toContain(role);
    }
  });

  it('reports exempt pairs with their reasons', () => {
    const rows = combos.flatMap((combo) =>
      pairs
        .filter((p) => p.exempt)
        .map((p) => {
          const ratio = wcagContrast(valueIn(p.fg, combo), valueIn(p.on, combo));
          return `${label(combo)}: ${p.fg} on ${p.on}: ${ratio.toFixed(2)}:1 (${p.exempt})`;
        }),
    );
    console.info(`Exempt contrast pairs\n${rows.join('\n')}`);
    expect(pairs.filter((p) => p.exempt).every((p) => p.exempt.trim().length > 0)).toBe(true);
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
