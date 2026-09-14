import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The browser is the cascade oracle: every attribute combination, under both colour-scheme preferences,
// must compute exactly the value tokens.json publishes for it.
interface Token {
  name: string | null;
  tier: string;
  value: string;
  varies: string[];
  variants: Record<string, string>;
}

const css = readFileSync(
  new URL('../packages/tokens/generated/tokens.css', import.meta.url),
  'utf8',
);
const tokens = (
  JSON.parse(
    readFileSync(new URL('../packages/tokens/generated/tokens.json', import.meta.url), 'utf8'),
  ) as Token[]
).filter((t) => t.tier === 'semantic');

const DEFAULTS: Record<string, string> = { theme: 'light', preset: 'default' };
const THEMES = [undefined, 'light', 'dark', 'system'];
const PRESETS = [undefined, 'default', 'neutral'];
type Attributes = { theme?: string | undefined; preset?: string | undefined };

/** What an element with these attributes should compute, when the OS prefers `scheme`. */
function expected(attributes: Attributes, scheme: 'light' | 'dark') {
  const theme = attributes.theme === 'system' ? scheme : (attributes.theme ?? DEFAULTS.theme);
  const combo: Record<string, string> = { theme, preset: attributes.preset ?? DEFAULTS.preset };
  const values = Object.fromEntries(
    tokens.map((t) => {
      const key = t.varies
        .filter((axis) => combo[axis] !== DEFAULTS[axis])
        .map((axis) => `${axis}.${combo[axis]}`)
        .join('+');
      return [t.name, t.variants[key] ?? t.value];
    }),
  );
  const colorScheme = attributes.theme === undefined ? 'normal' : theme;
  return { values, colorScheme };
}

for (const scheme of ['light', 'dark'] as const) {
  test(`every theme and preset attribute combination computes its token values (OS ${scheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setContent(`<!doctype html><style>${css}</style><div id="probe"></div>`);
    for (const theme of THEMES) {
      for (const preset of PRESETS) {
        const attributes: Attributes = { theme, preset };
        const actual = await page.evaluate(
          ({ attributes, names }) => {
            const probe = document.getElementById('probe') as HTMLElement;
            for (const [axis, value] of Object.entries(attributes)) {
              if (value === undefined) probe.removeAttribute(`data-sk-${axis}`);
              else probe.setAttribute(`data-sk-${axis}`, value);
            }
            const style = getComputedStyle(probe);
            return {
              values: Object.fromEntries(
                names.map((name) => [name, style.getPropertyValue(name).trim()]),
              ),
              colorScheme: style.colorScheme,
            };
          },
          { attributes, names: tokens.map((t) => t.name as string) },
        );
        expect(actual, JSON.stringify(attributes)).toEqual(expected(attributes, scheme));
      }
    }
  });
}

test('a nested scope restores every value its ancestor changed', async ({ page }) => {
  await page.setContent(
    `<!doctype html><style>${css}</style>
    <div data-sk-theme="dark" data-sk-preset="neutral">
      <div id="inner" data-sk-theme="light" data-sk-preset="default"></div>
    </div>`,
  );
  const inner = await page.evaluate(
    (names) => {
      const style = getComputedStyle(document.getElementById('inner') as HTMLElement);
      return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim()]));
    },
    tokens.map((t) => t.name as string),
  );
  expect(inner).toEqual(expected({ theme: 'light', preset: 'default' }, 'light').values);
});
