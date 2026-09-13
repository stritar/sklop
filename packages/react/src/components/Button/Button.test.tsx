import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Button } from './Button';

afterEach(cleanup);

describe('Button', () => {
  it('always renders a label box, with or without an icon', () => {
    const { container } = render(<Button>Send</Button>);
    const label = screen.getByText('Send');
    expect(label.tagName).toBe('SPAN');
    expect(label.className).toBe('sk-Button-label');
    expect(container.querySelector('.sk-Button-icon')).toBeNull();
  });

  it('places the icon on the requested side, hidden from assistive tech', () => {
    render(
      <Button icon={<svg data-testid="glyph" />} iconSide="end">
        Send
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Send' });
    expect(button.lastElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(button.firstElementChild?.className).toBe('sk-Button-label');
  });

  it('defaults to type="button" and merges className', () => {
    render(<Button className="mine">Go</Button>);
    const button = screen.getByRole('button');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.className).toBe('sk-Button-root mine');
  });
});
