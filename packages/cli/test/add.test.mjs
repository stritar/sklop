import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { add } from '../src/add.mjs';

const quiet = () => {};
const app = () => mkdtempSync(join(tmpdir(), 'sklop-cli-'));

// A registry in the shape build-registry.mjs writes, so these tests don't need a react build.
const registryDir = app();
mkdirSync(join(registryDir, 'Card'));
writeFileSync(join(registryDir, 'Card/Card.tsx'), "import styles from './Card.module.css';\n");
writeFileSync(join(registryDir, 'Card/Card.module.css'), '.root {}\n');
writeFileSync(
  join(registryDir, 'registry.json'),
  JSON.stringify({
    version: '0.0.0',
    components: [
      {
        name: 'Card',
        files: ['Card.module.css', 'Card.tsx'],
        dependencies: [],
        registryDependencies: [],
      },
    ],
  }),
);

describe('sklop add', () => {
  it('copies raw CSS Module source into the default folder', () => {
    const cwd = app();
    const { written } = add(['card'], { cwd, registryDir, log: quiet });
    const dir = join(cwd, 'src/components/sklop/Card');
    expect(written.map((f) => f.slice(dir.length + 1)).sort()).toEqual([
      'Card.module.css',
      'Card.tsx',
    ]);
    expect(readFileSync(join(dir, 'Card.tsx'), 'utf8')).toContain("from './Card.module.css'");
    expect(readFileSync(join(dir, 'Card.module.css'), 'utf8')).toContain('.root');
  });

  it('respects sklop.json and never overwrites without the flag', () => {
    const cwd = app();
    writeFileSync(join(cwd, 'sklop.json'), JSON.stringify({ componentsDir: 'ui' }));
    add(['Card'], { cwd, registryDir, log: quiet });
    const file = join(cwd, 'ui/Card/Card.tsx');
    writeFileSync(file, 'mine');
    expect(add(['Card'], { cwd, registryDir, log: quiet }).written).toHaveLength(0);
    expect(readFileSync(file, 'utf8')).toBe('mine');
    add(['Card'], { cwd, registryDir, overwrite: true, log: quiet });
    expect(readFileSync(file, 'utf8')).not.toBe('mine');
  });

  it('fails clearly on an unknown component', () => {
    expect(() => add(['Nope'], { cwd: app(), registryDir, log: quiet })).toThrow(/Available: Card/);
  });
});
