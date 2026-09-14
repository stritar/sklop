// @vitest-environment node
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkCss } from '../scripts/check-css.mjs';
import { readTokensJson, semanticTokens } from '../scripts/check-manifests.mjs';
import {
  applyRegion,
  componentRegion,
  staleComponents,
  writeComponentTokens,
} from '../scripts/generate-component-tokens.mjs';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/components', import.meta.url));
const semantic = semanticTokens(readTokensJson(packageRoot));
const manifest = JSON.parse(readFileSync(join(fixtures, 'Sample/Sample.manifest.json'), 'utf8'));
const copyFixtures = () => {
  const dir = mkdtempSync(join(tmpdir(), 'sklop-tier-'));
  cpSync(fixtures, dir, { recursive: true });
  return dir;
};

describe('component token tier', () => {
  it('reads the public token, then the semantic default, then its literal, on each part', () => {
    const region = componentRegion(manifest, semantic);
    expect(region).toContain(
      '.root {\n  --_sk-sample-root-gap: var(--sk-sample-root-gap, var(--sk-space-gap-sm, 8px));\n}',
    );
    expect(region).toContain(
      '.bubble {\n  --_sk-sample-bubble-bg-agent: var(--sk-sample-bubble-bg-agent, var(--sk-color-bg-raised, #ffffff));',
    );
    expect(region).not.toMatch(/^\s+--sk-/m);
  });

  it('keeps the committed fixture in step with its manifest, whatever the formatting', () => {
    expect(staleComponents(fixtures, semantic)).toEqual([]);
  });

  it('flags a hand-edited or missing region, and rewrites it', () => {
    const dir = copyFixtures();
    const css = join(dir, 'Sample/Sample.module.css');
    writeFileSync(css, readFileSync(css, 'utf8').replace('#ffffff', '#fafafa'));
    expect(staleComponents(dir, semantic)).toEqual(['Sample']);
    writeFileSync(css, applyRegion(readFileSync(css, 'utf8'), ''));
    expect(staleComponents(dir, semantic)).toEqual(['Sample']);
    expect(writeComponentTokens(dir, semantic)).toEqual(['Sample']);
    expect(staleComponents(dir, semantic)).toEqual([]);
  });

  it('adds a region at the top once, then replaces it in place', () => {
    const region = componentRegion(manifest, semantic);
    const once = applyRegion('.root {\n  gap: 0;\n}\n', region);
    expect(once.startsWith('/* @sklop:tokens:start')).toBe(true);
    expect(applyRegion(once, region)).toBe(once);
  });

  it('fails on a default that is not a semantic token', () => {
    const tokens = { 'bubble-bg': { part: 'bubble', default: 'color.bg.nope' } };
    expect(() => componentRegion({ ...manifest, tokens }, semantic)).toThrow(
      /defaults to unknown "color\.bg\.nope"/,
    );
  });

  it('writes CSS the component CSS check accepts', () => {
    const css = readFileSync(join(fixtures, 'Sample/Sample.module.css'), 'utf8');
    expect(checkCss(css, 'Sample.module.css')).toEqual([]);
  });
});
