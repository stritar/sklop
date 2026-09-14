import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Collects console errors, hydration warnings and uncaught errors for the page's lifetime. */
export function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || /hydrat/i.test(message.text())) {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

/** Fails with each violated axe rule, measured on the real rendered page once transitions settle. */
export async function expectNoAxeViolations(page: Page) {
  // A colour mid-transition measures as neither theme; looping animations never settle, so skip them.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== 'running' ||
          animation.effect?.getTiming().iterations === Number.POSITIVE_INFINITY,
      ),
  );
  const { violations } = await new AxeBuilder({ page }).analyze();
  const report = violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((node) => node.target.join(' ')).join('; ')})`,
  );
  expect(report).toEqual([]);
}
