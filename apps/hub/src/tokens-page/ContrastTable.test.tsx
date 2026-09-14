import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ContrastTable } from './ContrastTable.js';
import { contrastRatio } from './contrast.js';

afterEach(cleanup);

describe('contrastRatio', () => {
  it('measures WCAG 2 contrast of hex colours', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#58576a', '#f7f7f9')?.toFixed(2)).toBe('6.57');
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5);
  });

  it('refuses values that are not opaque hex colours', () => {
    expect(contrastRatio('#05050899', '#ffffff')).toBeNull();
    expect(contrastRatio(undefined, '#ffffff')).toBeNull();
  });
});

describe('ContrastTable', () => {
  const values = {
    '--sk-a': '#58576a',
    '--sk-b': '#f7f7f9',
    '--sk-c': '#dddde4',
    '--sk-d': '#c0c0c0',
  };

  it('marks each pair as passing, failing, exempt or not measured, in words', () => {
    render(
      <ContrastTable
        pairs={[
          { foreground: '--sk-a', background: '--sk-b', min: 4.5 },
          { foreground: '--sk-d', background: '--sk-b', min: 4.5 },
          { foreground: '--sk-c', background: '--sk-b', exempt: 'Decoration.' },
          { foreground: '--sk-missing', background: '--sk-b', min: 3 },
        ]}
        values={values}
      />,
    );
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell').at(-1)?.textContent)).toEqual([
      'Passes',
      'Fails',
      'Exempt',
      'Not measured',
    ]);
    expect(within(rows[0] as HTMLElement).getByText('6.57:1')).toBeTruthy();
    expect(screen.getByText('4 documented pairs, 1 failing')).toBeTruthy();
  });
});
