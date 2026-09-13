import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { add } from '../src/add.mjs';

const registryDir = fileURLToPath(new URL('../../react/registry', import.meta.url));
const quiet = () => {};
const app = () => mkdtempSync(join(tmpdir(), 'sklop-cli-'));

describe('sklop add (needs `pnpm build` first)', () => {
  it('copies raw CSS Module source into the default folder', () => {
    const cwd = app();
    const { written } = add(['button'], { cwd, registryDir, log: quiet });
    const dir = join(cwd, 'src/components/sklop/Button');
    expect(written.map((f) => f.slice(dir.length + 1)).sort()).toEqual([
      'Button.module.css',
      'Button.tsx',
    ]);
    expect(readFileSync(join(dir, 'Button.tsx'), 'utf8')).toContain("from './Button.module.css'");
    expect(readFileSync(join(dir, 'Button.module.css'), 'utf8')).toContain('.label');
  });

  it('respects sklop.json and never overwrites without the flag', () => {
    const cwd = app();
    writeFileSync(join(cwd, 'sklop.json'), JSON.stringify({ componentsDir: 'ui' }));
    add(['Button'], { cwd, registryDir, log: quiet });
    const file = join(cwd, 'ui/Button/Button.tsx');
    writeFileSync(file, 'mine');
    expect(add(['Button'], { cwd, registryDir, log: quiet }).written).toHaveLength(0);
    expect(readFileSync(file, 'utf8')).toBe('mine');
    add(['Button'], { cwd, registryDir, overwrite: true, log: quiet });
    expect(readFileSync(file, 'utf8')).not.toBe('mine');
  });

  it('fails clearly on an unknown component', () => {
    expect(() => add(['Nope'], { cwd: app(), registryDir, log: quiet })).toThrow(
      /Available: Button/,
    );
  });
});
