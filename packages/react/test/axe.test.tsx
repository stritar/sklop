import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('toHaveNoViolations', () => {
  it('passes accessible markup', async () => {
    const { container } = render(<button type="button">Send</button>);
    await expect(container).toHaveNoViolations();
  });

  it('fails markup axe rejects', async () => {
    // biome-ignore lint/a11y/useAltText: the missing alt is the violation under test
    const { container } = render(<img src="attachment.png" />);
    await expect(expect(container).toHaveNoViolations()).rejects.toThrow(/image-alt/);
  });
});
