// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkComponents, semanticPaths } from '../scripts/check-manifests.mjs';

const semantic = semanticPaths([
  { tier: 'semantic', path: 'semantic.color.bg.raised' },
  { tier: 'primitive', path: 'primitive.color.white' },
]);
const manifest = (overrides = {}) => ({
  name: 'Sample',
  parts: ['root', 'bubble'],
  states: ['default'],
  tokens: { 'bubble-bg-agent': { part: 'bubble', default: 'color.bg.raised' } },
  ...overrides,
});

/** A components folder holding one Sample component, written to a temp dir. */
function setup({ files, manifestJson = manifest() } = {}) {
  const componentsDir = mkdtempSync(join(tmpdir(), 'sklop-components-'));
  mkdirSync(join(componentsDir, 'Sample'));
  const contents = {
    'Sample.tsx': 'export function Sample() { return null; }\n',
    'Sample.module.css': '.root { gap: 0; }\n',
    'index.ts': "export { Sample } from './Sample.js';\n",
    'Sample.manifest.json': JSON.stringify(manifestJson),
  };
  for (const file of files ?? Object.keys(contents)) {
    writeFileSync(join(componentsDir, 'Sample', file), contents[file]);
  }
  return componentsDir;
}
const registered = { components: [{ name: 'Sample', files: ['Sample.module.css', 'Sample.tsx'] }] };
const withStyles = { exports: { '.': './dist/index.js', './styles.css': './dist/styles.css' } };
const check = (componentsDir, { registry = registered, packageJson = withStyles } = {}) =>
  checkComponents({ componentsDir, registry, packageJson, semantic });

describe('component manifests', () => {
  it('accepts a complete, registered component', () => {
    expect(check(setup())).toEqual([]);
  });

  it('accepts an empty components folder without a styles export', () => {
    expect(check(join(tmpdir(), 'sklop-no-components'), { packageJson: {} })).toEqual([]);
  });

  it('fails when a file or the manifest is missing', () => {
    expect(check(setup({ files: ['Sample.tsx', 'index.ts'] }))).toEqual([
      'Sample: missing Sample.module.css',
      'Sample: missing Sample.manifest.json',
    ]);
  });

  it('fails when a token default is not a semantic token', () => {
    const tokens = { 'bubble-bg-agent': { part: 'bubble', default: 'color.bg.nope' } };
    expect(check(setup({ manifestJson: manifest({ tokens }) }))).toEqual([
      'Sample: token "bubble-bg-agent" defaults to "color.bg.nope", which is not a semantic token',
    ]);
  });

  it('fails on a wrong name, unknown part, physical token name or unknown key', () => {
    const tokens = { 'border-left': { part: 'tail', default: 'color.bg.raised' } };
    expect(check(setup({ manifestJson: manifest({ name: 'Other', tokens, extra: 1 }) }))).toEqual([
      'Sample: unknown manifest key "extra"',
      'Sample: manifest name "Other" must equal the folder name',
      'Sample: token "border-left" names a physical direction; use start, end, block or inline',
      'Sample: token "border-left" uses unknown part "tail"',
    ]);
  });

  it('fails when the component is not in the registry', () => {
    expect(check(setup(), { registry: { components: [] } })).toEqual([
      'Sample: not in registry/registry.json',
    ]);
  });

  it('fails when components exist but styles.css is not exported', () => {
    expect(check(setup(), { packageJson: { exports: { '.': './dist/index.js' } } })).toEqual([
      'package.json: components exist, so exports needs "./styles.css"',
    ]);
  });
});
