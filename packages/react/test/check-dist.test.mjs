// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { missingDirectives } from '../scripts/check-dist.mjs';

function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'sklop-dist-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return { src: join(root, 'src'), dist: join(root, 'dist') };
}

describe("'use client' in the build", () => {
  it('passes when every client module keeps its directive', () => {
    const { src, dist } = project({
      'src/provider/Provider.tsx': "'use client';\nexport const a = 1;\n",
      'src/provider/script.tsx': 'export const b = 1;\n',
      'dist/provider/Provider.js': '"use client";\nexport const a = 1;\n',
      'dist/provider/script.js': 'export const b = 1;\n',
    });
    expect(missingDirectives(src, dist)).toEqual([]);
  });

  it('fails when the build drops a directive or a client module', () => {
    const { src, dist } = project({
      'src/provider/Provider.tsx': "'use client';\nexport const a = 1;\n",
      'src/hooks.ts': '"use client"\nexport const b = 1;\n',
      'dist/provider/Provider.js': 'export const a = 1;\n',
    });
    expect(missingDirectives(src, dist)).toEqual(['hooks.js', 'provider/Provider.js']);
  });
});
