import { fileURLToPath } from 'node:url';
import { wcagContrast } from 'culori';
import { describe, expect, it } from 'vitest';
import { buildTokens, readSource } from '../scripts/build.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const { json } = buildTokens(readSource(root));
const color = (role) => {
  const token = json.find((t) => t.path === `semantic.color.${role}`);
  if (!token) throw new Error(`semantic.color.${role} does not exist`);
  return token.value;
};

// Pairs that render, or that a role promises in its description. WCAG 2: text 4.5:1, UI and focus 3:1.
const REQUIRED = [
  ['text.primary', 'bg.page', 4.5],
  ['text.primary', 'bg.surface', 4.5],
  ['text.primary', 'bg.raised', 4.5],
  ['text.primary', 'bg.hover', 4.5],
  ['text.primary', 'bg.active', 4.5],
  ['text.secondary', 'bg.surface', 4.5],
  ['text.secondary', 'bg.raised', 4.5],
  ['text.on-accent', 'accent.solid', 4.5],
  ['text.on-accent', 'accent.solid-hover', 4.5],
  ['accent.text', 'bg.page', 4.5],
  ['accent.text', 'bg.raised', 4.5],
  ['border.strong', 'bg.page', 3],
  ['border.strong', 'bg.raised', 3],
  ['border.focus', 'bg.page', 3],
  ['border.focus', 'bg.raised', 3],
];

// Measured and reported, never gated: they fail or have no threshold, and the colours are a design decision.
const ADVISORY = [
  ['text.secondary', 'bg.page'],
  ['text.secondary', 'bg.hover'],
  ['text.primary', 'accent.subtle'],
  ['accent.text', 'accent.subtle'],
  ['accent.solid', 'bg.raised'],
  ['text.disabled', 'bg.raised'],
  ['border.default', 'bg.raised'],
];

describe('contrast', () => {
  it.each(REQUIRED)('%s on %s meets %s:1', (fg, bg, min) => {
    expect(wcagContrast(color(fg), color(bg))).toBeGreaterThanOrEqual(min);
  });

  it('reports advisory pairs', () => {
    const rows = ADVISORY.map(
      ([fg, bg]) => `${fg} on ${bg}: ${wcagContrast(color(fg), color(bg)).toFixed(2)}:1`,
    );
    console.info(`Advisory contrast\n${rows.join('\n')}`);
    expect(rows).toHaveLength(ADVISORY.length);
  });
});
