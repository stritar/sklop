import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, watchConsole } from './helpers.js';

const PERSIST_KEY = 'sklop-next-example';
const background = () => getComputedStyle(document.body).backgroundColor;

test('renders @sklop/react in the App Router without hydration errors', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sklop in the App Router' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-sk-theme', 'system');
  await expect(page.locator('html')).toHaveAttribute('data-sk-motion', 'system');
  await expectNoAxeViolations(page);
  expect(problems).toEqual([]);
});

test('switches the theme live and keeps the choice across a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const light = await page.evaluate(background);
  await page.getByRole('radio', { name: 'dark' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-sk-theme', 'dark');
  await expect.poll(() => page.evaluate(background)).not.toBe(light);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-sk-theme', 'dark');
  await expect(page.getByRole('radio', { name: 'dark' })).toBeChecked();
  await expectNoAxeViolations(page);
});

test('paints a stored dark theme before any React code runs', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(
    ([key]) => localStorage.setItem(key as string, JSON.stringify({ theme: 'dark' })),
    [PERSIST_KEY],
  );
  // With Next.js scripts blocked (stylesheets still load), only the inline SklopScript can set the attribute.
  await page.route('**/_next/**', (route) =>
    route.request().resourceType() === 'script' ? route.abort() : route.continue(),
  );
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-sk-theme', 'dark');
  expect(await page.evaluate(background)).toBe('rgb(25, 25, 32)');
});
