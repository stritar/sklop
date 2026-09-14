import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, watchConsole } from './helpers.js';

test('renders @sklop/react in the App Router', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  await expect(page.getByText('Hello from Sklop.')).toBeVisible();
  await expectNoAxeViolations(page);
  expect(problems).toEqual([]);
});
