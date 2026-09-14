import { expect, type Page, test } from '@playwright/test';
import { expectNoAxeViolations, watchConsole } from './helpers.js';

const values = (page: Page) =>
  page
    .locator('[data-token]')
    .evaluateAll((rows) =>
      Object.fromEntries(
        rows.map((row) => [
          row.getAttribute('data-token'),
          row.querySelector('[data-value]')?.textContent ?? '',
        ]),
      ),
    );
const choose = (page: Page, name: string, value: string) =>
  page.getByRole('combobox', { name }).selectOption(value);

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
});

test('renders every token with a computed value, axe clean in light and dark', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Tokens' })).toBeVisible();
  const computed = await values(page);
  expect(Object.values(computed).every((value) => value.length > 0)).toBe(true);
  await expectNoAxeViolations(page);
  await choose(page, 'Theme', 'dark');
  await expectNoAxeViolations(page);
  expect(problems).toEqual([]);
});

test('every axis changes what the preview computes, live', async ({ page }) => {
  await page.goto('/');
  const changes: [string, string][] = [
    ['Theme', 'dark'],
    ['Preset', 'neutral'],
    ['Density', 'compact'],
    ['Font scale', 'large'],
    ['Radius', 'sharp'],
    ['Motion personality', 'playful'],
    ['Motion level', 'off'],
  ];
  for (const [axis, value] of changes) {
    const before = await values(page);
    await choose(page, axis, value);
    await expect.poll(() => values(page), { message: `${axis} ${value}` }).not.toEqual(before);
  }
  await choose(page, 'Direction', 'rtl');
  await expect(page.getByTestId('preview').locator('..')).toHaveAttribute('dir', 'rtl');
});

test('no documented contrast pair fails in any theme and preset', async ({ page }) => {
  await page.goto('/');
  for (const theme of ['light', 'dark']) {
    for (const preset of ['default', 'neutral']) {
      await choose(page, 'Theme', theme);
      await choose(page, 'Preset', preset);
      const caption = page.locator('caption');
      await expect(caption, `${theme}/${preset}`).toContainText('none failing');
      await expect(page.locator('tr[data-result="Fails"]')).toHaveCount(0);
      await expect(page.locator('tr[data-result="Not measured"]')).toHaveCount(0);
    }
  }
});

test.describe('visual baselines', () => {
  test.skip(!process.env.SKLOP_VISUAL, 'Screenshots are compared only on CI Linux');

  const shots: [string, [string, string][]][] = [
    ['light-default', []],
    ['dark-default', [['Theme', 'dark']]],
    ['light-neutral', [['Preset', 'neutral']]],
    [
      'dark-neutral',
      [
        ['Theme', 'dark'],
        ['Preset', 'neutral'],
      ],
    ],
    [
      'rtl-compact',
      [
        ['Direction', 'rtl'],
        ['Density', 'compact'],
      ],
    ],
  ];

  for (const [name, settings] of shots) {
    test(`token page: ${name}`, async ({ page }) => {
      await page.goto('/');
      for (const [axis, value] of settings) await choose(page, axis, value);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByTestId('preview')).toHaveScreenshot(`tokens-${name}.png`);
    });
  }
});
