#!/usr/bin/env node
// Every component folder has its files and a valid manifest, is in the registry, and ships styles.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMPONENT = /^[A-Z][A-Za-z0-9]*$/;
const SEGMENTS = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PHYSICAL = /(^|-)(left|right|top|bottom|horizontal|vertical)(-|$)/;
const MANIFEST_KEYS = new Set(['name', 'description', 'parts', 'states', 'tokens']);

/** Semantic tokens from @sklop/tokens/tokens.json, keyed by path without the tier ("color.bg.raised"). */
export function semanticTokens(tokensJson) {
  return new Map(
    tokensJson
      .filter((t) => t.tier === 'semantic')
      .map((t) => [t.path.replace(/^semantic\./, ''), t]),
  );
}

/** Semantic token paths without the tier, such as "color.bg.raised". */
export function semanticPaths(tokensJson) {
  return new Set(semanticTokens(tokensJson).keys());
}

/** The installed @sklop/tokens/tokens.json, resolved from a package root. */
export function readTokensJson(packageRoot) {
  const path = createRequire(join(resolve(packageRoot), 'package.json')).resolve(
    '@sklop/tokens/tokens.json',
  );
  return JSON.parse(readFileSync(path, 'utf8'));
}

const uniqueNames = (list) =>
  Array.isArray(list) && list.every((s) => SEGMENTS.test(s)) && new Set(list).size === list.length;

/** Problems in one manifest; `folder` is the component folder name. */
export function checkManifest(manifest, folder, semantic) {
  const problems = [];
  const fail = (message) => problems.push(`${folder}: ${message}`);
  for (const key of Object.keys(manifest)) {
    if (!MANIFEST_KEYS.has(key)) fail(`unknown manifest key "${key}"`);
  }
  if (manifest.name !== folder) fail(`manifest name "${manifest.name}" must equal the folder name`);
  if (!uniqueNames(manifest.parts) || !manifest.parts.includes('root')) {
    fail('parts must be unique lowercase names and include "root"');
  }
  if (!uniqueNames(manifest.states)) fail('states must be unique lowercase names');
  const tokens = manifest.tokens ?? {};
  if (typeof tokens !== 'object' || Array.isArray(tokens)) {
    fail('tokens must map token names to { part, default }');
    return problems;
  }
  for (const [name, token] of Object.entries(tokens)) {
    if (!SEGMENTS.test(name)) fail(`token "${name}" must be lowercase words joined by hyphens`);
    if (PHYSICAL.test(name))
      fail(`token "${name}" names a physical direction; use start, end, block or inline`);
    if (!manifest.parts?.includes(token?.part))
      fail(`token "${name}" uses unknown part "${token?.part}"`);
    if (!semantic.has(token?.default)) {
      fail(`token "${name}" defaults to "${token?.default}", which is not a semantic token`);
    }
  }
  return problems;
}

/** Problems across the components folder, the registry and the package exports. */
export function checkComponents({ componentsDir, registry, packageJson, semantic }) {
  const folders = existsSync(componentsDir)
    ? readdirSync(componentsDir)
        .filter((f) => statSync(join(componentsDir, f)).isDirectory())
        .sort()
    : [];
  const registered = new Map(registry.components.map((c) => [c.name, c]));
  const problems = [];

  for (const folder of folders) {
    if (!COMPONENT.test(folder)) problems.push(`${folder}: component folders are PascalCase`);
    const required = [
      `${folder}.tsx`,
      `${folder}.module.css`,
      'index.ts',
      `${folder}.manifest.json`,
    ];
    const missing = required.filter((file) => !existsSync(join(componentsDir, folder, file)));
    for (const file of missing) problems.push(`${folder}: missing ${file}`);
    if (!missing.includes(`${folder}.manifest.json`)) {
      const path = join(componentsDir, folder, `${folder}.manifest.json`);
      try {
        problems.push(...checkManifest(JSON.parse(readFileSync(path, 'utf8')), folder, semantic));
      } catch (error) {
        problems.push(`${folder}: ${folder}.manifest.json is not valid JSON (${error.message})`);
      }
    }
    if (!registered.has(folder)) problems.push(`${folder}: not in registry/registry.json`);
  }
  if (folders.length && !packageJson.exports?.['./styles.css']) {
    problems.push('package.json: components exist, so exports needs "./styles.css"');
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
  const problems = checkComponents({
    componentsDir: join(root, 'src', 'components'),
    registry: read(join(root, 'registry', 'registry.json')),
    packageJson: read(join(root, 'package.json')),
    semantic: semanticPaths(readTokensJson(root)),
  });
  for (const problem of problems) console.error(problem);
  if (problems.length) process.exit(1);
  console.log('@sklop/react components: manifests and registry agree');
}
