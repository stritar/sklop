import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, watchConsole } from './helpers.js';

test('renders the hub', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Sklop hub' })).toBeVisible();
  await expectNoAxeViolations(page);
  expect(problems).toEqual([]);
});
