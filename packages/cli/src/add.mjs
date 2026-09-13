import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

export const DEFAULT_CONFIG = { componentsDir: 'src/components/sklop' };

export function loadConfig(cwd) {
  const file = join(cwd, 'sklop.json');
  return existsSync(file)
    ? { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(file, 'utf8')) }
    : DEFAULT_CONFIG;
}

/** Registry dir: explicit, or the one shipped inside the app's installed @sklop/react. */
export function resolveRegistry(cwd, registryDir) {
  if (registryDir) return registryDir;
  try {
    return dirname(createRequire(join(cwd, 'package.json')).resolve('@sklop/react/registry.json'));
  } catch {
    throw new Error('@sklop/react is not installed here. Run: npm install @sklop/react');
  }
}

export function add(
  names,
  { cwd = process.cwd(), registryDir, overwrite = false, log = console.log } = {},
) {
  const dir = resolveRegistry(cwd, registryDir);
  const registry = JSON.parse(readFileSync(join(dir, 'registry.json'), 'utf8'));
  const byName = new Map(registry.components.map((c) => [c.name.toLowerCase(), c]));
  const target = join(cwd, loadConfig(cwd).componentsDir);

  const queue = [...names];
  const done = new Set();
  const written = [];
  const dependencies = new Set();

  while (queue.length) {
    const requested = queue.shift();
    const component = byName.get(requested.toLowerCase());
    if (!component) {
      throw new Error(
        `Unknown component "${requested}". Available: ${registry.components.map((c) => c.name).join(', ')}`,
      );
    }
    if (done.has(component.name)) continue;
    done.add(component.name);
    queue.push(...component.registryDependencies);
    for (const d of component.dependencies) dependencies.add(d);

    mkdirSync(join(target, component.name), { recursive: true });
    for (const file of component.files) {
      const dest = join(target, component.name, file);
      if (existsSync(dest) && !overwrite) {
        log(`skip  ${dest} (exists, use --overwrite)`);
        continue;
      }
      copyFileSync(join(dir, component.name, file), dest);
      written.push(dest);
      log(`write ${dest}`);
    }
  }

  if (dependencies.size) log(`\nInstall: npm install ${[...dependencies].join(' ')}`);
  return { written, dependencies: [...dependencies], version: registry.version };
}
