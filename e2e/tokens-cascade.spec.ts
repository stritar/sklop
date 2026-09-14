import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';
import { AXES } from '../packages/tokens/scripts/build.mjs';

// The browser is the cascade oracle: each attribute combination, under each media preference, must compute
// exactly the value tokens.json publishes for it.
interface Token {
  name: string;
  tier: string;
  value: string;
  varies: string[];
  variants: Record<string, string>;
}
interface Axis {
  attribute: string;
  values: string[];
  default: string;
  system?: { query: string; value: string };
}
type Attributes = Record<string, string | undefined>;
interface Media {
  colorScheme: 'light' | 'dark';
}

const axes = AXES as Record<string, Axis>;
const read = (file: string) =>
  readFileSync(new URL(`../packages/tokens/generated/${file}`, import.meta.url), 'utf8');
const css = read('tokens.css');
const tokens = (JSON.parse(read('tokens.json')) as Token[]).filter((t) => t.tier === 'semantic');
const names = tokens.map((t) => t.name);

const matches = (query: string, media: Media) =>
  query === '(prefers-color-scheme: dark)' && media.colorScheme === 'dark';

/** What an element with these attributes should compute under this media. */
function expected(attributes: Attributes, media: Media) {
  const combo: Record<string, string> = {};
  for (const [axis, def] of Object.entries(axes)) {
    const value = attributes[axis] ?? def.default;
    combo[axis] =
      value !== 'system'
        ? value
        : def.system && matches(def.system.query, media)
          ? def.system.value
          : def.default;
  }
  const values = Object.fromEntries(
    tokens.map((t) => {
      const key = t.varies
        .filter((axis) => combo[axis] !== axes[axis]?.default)
        .map((axis) => `${axis}.${combo[axis]}`)
        .join('+');
      return [t.name, t.variants[key] ?? t.value];
    }),
  );
  return { values, colorScheme: attributes.theme === undefined ? 'normal' : combo.theme };
}

async function computed(page: Page, attributes: Attributes) {
  return page.evaluate(
    ({ attributes, attributeNames, names }) => {
      const probe = document.getElementById('probe') as HTMLElement;
      for (const [axis, attribute] of Object.entries(attributeNames)) {
        const value = attributes[axis];
        if (value === undefined) probe.removeAttribute(attribute);
        else probe.setAttribute(attribute, value);
      }
      const style = getComputedStyle(probe);
      return {
        values: Object.fromEntries(
          names.map((name) => [name, style.getPropertyValue(name).trim()]),
        ),
        colorScheme: style.colorScheme,
      };
    },
    {
      attributes,
      attributeNames: Object.fromEntries(Object.entries(axes).map(([a, d]) => [a, d.attribute])),
      names,
    },
  );
}

const withAbsent = (axis: string) => [
  undefined,
  ...(axes[axis]?.values ?? []),
  ...(axes[axis]?.system ? ['system'] : []),
];
const probePage = (page: Page) =>
  page.setContent(`<!doctype html><style>${css}</style><div id="probe"></div>`);

for (const colorScheme of ['light', 'dark'] as const) {
  test(`every theme and preset combination computes its values (OS ${colorScheme})`, async ({
    page,
  }) => {
    const media = { colorScheme };
    await page.emulateMedia(media);
    await probePage(page);
    for (const theme of withAbsent('theme')) {
      for (const preset of withAbsent('preset')) {
        const attributes = { theme, preset };
        expect(await computed(page, attributes), JSON.stringify(attributes)).toEqual(
          expected(attributes, media),
        );
      }
    }
  });
}

test('every value of the other axes computes its values, alone and together', async ({ page }) => {
  const media = { colorScheme: 'light' as const };
  await probePage(page);
  const others = Object.keys(axes).filter((axis) => !['theme', 'preset'].includes(axis));
  for (const axis of others) {
    for (const value of withAbsent(axis)) {
      const attributes = { [axis]: value };
      expect(await computed(page, attributes), JSON.stringify(attributes)).toEqual(
        expected(attributes, media),
      );
    }
  }
  const together = Object.fromEntries(
    Object.entries(axes).map(([axis, def]) => [axis, def.values.at(-1)]),
  );
  expect(await computed(page, together)).toEqual(expected(together, media));
});

test('a nested scope restores every value its ancestor changed', async ({ page }) => {
  const changed = Object.entries(axes)
    .map(([, def]) => `${def.attribute}="${def.values.find((v) => v !== def.default)}"`)
    .join(' ');
  const restored = Object.entries(axes)
    .map(([, def]) => `${def.attribute}="${def.default}"`)
    .join(' ');
  await page.setContent(
    `<!doctype html><style>${css}</style><div ${changed}><div id="probe" ${restored}></div></div>`,
  );
  const defaults = Object.fromEntries(
    Object.entries(axes).map(([axis, def]) => [axis, def.default]),
  );
  const inner = await page.evaluate((names) => {
    const style = getComputedStyle(document.getElementById('probe') as HTMLElement);
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim()]));
  }, names);
  expect(inner).toEqual(expected(defaults, { colorScheme: 'light' }).values);
});
