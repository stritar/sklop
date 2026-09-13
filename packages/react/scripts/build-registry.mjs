#!/usr/bin/env node
// Copies component source into registry/ and writes registry.json for `sklop add`.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const componentsDir = join(root, 'src', 'components');
const outDir = join(root, 'registry');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const IMPORT = /(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;
// index.ts is package wiring (.js specifiers for node16 types); ejected code imports files directly.
const isSource = (f) => /\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f) && f !== 'index.ts';

rmSync(outDir, { recursive: true, force: true });
const components = [];

for (const name of readdirSync(componentsDir).sort()) {
  const files = readdirSync(join(componentsDir, name)).filter(isSource).sort();
  const dependencies = new Set();
  const registryDependencies = new Set();

  for (const file of files) {
    const text = readFileSync(join(componentsDir, name, file), 'utf8');
    for (const [, from, bare] of text.matchAll(IMPORT)) {
      const spec = from ?? bare;
      const sibling = spec.match(/^\.\.\/([^/]+)/);
      if (sibling) registryDependencies.add(sibling[1]);
      else if (spec.startsWith('../'))
        throw new Error(`${name}/${file}: import "${spec}" escapes components/`);
      else if (!spec.startsWith('.') && !/^react($|\/)/.test(spec)) {
        dependencies.add(
          spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0],
        );
      }
    }
    mkdirSync(join(outDir, name), { recursive: true });
    cpSync(join(componentsDir, name, file), join(outDir, name, file));
  }

  components.push({
    name,
    files,
    dependencies: [...dependencies].sort(),
    registryDependencies: [...registryDependencies].sort(),
  });
}

writeFileSync(
  join(outDir, 'registry.json'),
  `${JSON.stringify({ version: pkg.version, components }, null, 2)}\n`,
);
console.log(`@sklop/react registry: ${components.map((c) => c.name).join(', ')}`);
