import { cleanup } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect } from 'vitest';

declare module 'vitest' {
  // Type parameters must match Vitest's own declaration for the merge to apply.
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    /** Runs axe on the element. Awaited: `await expect(container).toHaveNoViolations()`. */
    toHaveNoViolations(): Promise<void>;
  }
}

afterEach(cleanup);

expect.extend({
  async toHaveNoViolations(received: Element) {
    // jsdom renders no colour, so contrast is gated in @sklop/tokens and in the browser suites.
    const { violations } = await axe.run(received, {
      rules: { 'color-contrast': { enabled: false } },
    });
    const report = violations
      .map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.html).join('\n  ')}`)
      .join('\n');
    return {
      pass: violations.length === 0,
      message: () =>
        violations.length === 0
          ? 'Expected axe violations, found none'
          : `axe found ${violations.length} violation(s):\n${report}`,
    };
  },
});
