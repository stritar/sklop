import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TokensPage } from './TokensPage.js';
import { semanticTokens } from './tokens.js';

beforeEach(() => {
  window.matchMedia = vi.fn((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

describe('TokensPage', () => {
  it('lists every semantic token once', () => {
    const { container } = render(<TokensPage />);
    const rows = [...container.querySelectorAll('[data-token]')].map((row) =>
      row.getAttribute('data-token'),
    );
    expect(rows).toEqual(semanticTokens.map((token) => token.name));
  });

  it('offers a labelled control for every axis and for direction', () => {
    render(<TokensPage />);
    for (const label of [
      'Theme',
      'Preset',
      'Density',
      'Font scale',
      'Radius',
      'Motion personality',
      'Motion level',
      'Direction',
    ]) {
      expect(screen.getByRole('combobox', { name: label })).toBeTruthy();
    }
  });
});
