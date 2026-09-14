import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './helpers.js';

test('the axe helper fails a page with a violation', async ({ page }) => {
  await page.setContent(
    '<!doctype html><html lang="en"><title>Harness</title><main><h1>Harness</h1><img src="data:,"></main></html>',
  );
  await expect(expectNoAxeViolations(page)).rejects.toThrow(/image-alt/);
});
