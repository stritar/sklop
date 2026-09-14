#!/usr/bin/env node
// Next.js treats a module as client code only when 'use client' opens it, so a bundler that drops the
// directive breaks the App Router. Fails when a source module has it and its built module does not.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIRECTIVE = /^\s*(['"])use client\1/;
const isModule = (file) => /\.tsx?$/.test(file) && !/\.(test|d)\.tsx?$/.test(file);

/** Built modules, relative to `distDir`, that lost the directive their source declares. */
export function missingDirectives(srcDir, distDir) {
  return readdirSync(srcDir, { recursive: true })
    .filter((file) => isModule(file) && DIRECTIVE.test(readFileSync(join(srcDir, file), 'utf8')))
    .map((file) => file.replace(/\.tsx?$/, '.js'))
    .filter((file) => {
      const built = join(distDir, file);
      return !existsSync(built) || !DIRECTIVE.test(readFileSync(built, 'utf8'));
    })
    .sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const missing = missingDirectives(join(root, 'src'), join(root, 'dist'));
  if (missing.length) {
    console.error(`@sklop/react: 'use client' is missing from dist/${missing.join(', dist/')}`);
    process.exit(1);
  }
  console.log("@sklop/react dist: every client module keeps 'use client'");
}
