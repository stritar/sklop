import { act, render, screen } from '@testing-library/react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { noFlashScript, SklopProvider, SklopScript, useMotion, useSklop } from '../src/index.js';

const html = document.documentElement;
const skAttributes = (element: Element) =>
  Object.fromEntries(
    [...element.attributes]
      .filter((attribute) => attribute.name.startsWith('data-sk-'))
      .map((attribute) => [attribute.name, attribute.value]),
  );
const DEFAULTS = {
  'data-sk-theme': 'light',
  'data-sk-preset': 'default',
  'data-sk-density': 'default',
  'data-sk-font-scale': 'medium',
  'data-sk-radius': 'default',
  'data-sk-motion-personality': 'crisp',
  'data-sk-motion': 'system',
};

function prefersReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: matches && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  for (const { name } of [...html.attributes]) {
    if (name.startsWith('data-sk-') || name === 'dir' || name === 'style')
      html.removeAttribute(name);
  }
  localStorage.clear();
  vi.restoreAllMocks();
});

function Controls() {
  const { settings, set, reset } = useSklop();
  return (
    <div>
      <output>{settings.theme}</output>
      <button type="button" onClick={() => set('theme', 'dark')}>
        Dark
      </button>
      <button type="button" onClick={() => reset()}>
        Reset
      </button>
    </div>
  );
}

function Level() {
  return <output>{useMotion()}</output>;
}

describe('SklopProvider', () => {
  it('writes every axis to <html>, with defaults, and removes them on unmount', () => {
    const { unmount } = render(<SklopProvider>content</SklopProvider>);
    expect(skAttributes(html)).toEqual(DEFAULTS);
    unmount();
    expect(skAttributes(html)).toEqual({});
  });

  it('applies axis props, overrides and direction to the document', () => {
    render(
      <SklopProvider
        theme="dark"
        density="compact"
        dir="rtl"
        overrides={{ '--sk-color-accent-solid': '#123456' }}
      />,
    );
    expect(skAttributes(html)).toEqual({
      ...DEFAULTS,
      'data-sk-theme': 'dark',
      'data-sk-density': 'compact',
    });
    expect(html.getAttribute('dir')).toBe('rtl');
    expect(html.style.getPropertyValue('--sk-color-accent-solid')).toBe('#123456');
  });

  it('nests as an element carrying every axis, inherited unless its own props change it', () => {
    render(
      <SklopProvider theme="dark" preset="neutral">
        <SklopProvider density="spacious" motion="off">
          <p>Inner</p>
        </SklopProvider>
      </SklopProvider>,
    );
    expect(skAttributes(screen.getByText('Inner').parentElement as Element)).toEqual({
      ...DEFAULTS,
      'data-sk-theme': 'dark',
      'data-sk-preset': 'neutral',
      'data-sk-density': 'spacious',
      'data-sk-motion': 'off',
    });
  });

  it('renders element scope attributes on the server, and leaves <html> alone', () => {
    const markup = renderToString(
      <SklopProvider scope="element" theme="dark">
        <p>Scoped</p>
      </SklopProvider>,
    );
    expect(markup).toContain('data-sk-theme="dark"');
    expect(markup).toContain('data-sk-motion="system"');
    render(
      <SklopProvider scope="element" theme="dark">
        <p>Scoped</p>
      </SklopProvider>,
    );
    expect(skAttributes(html)).toEqual({});
  });

  it('changes and resets axes through useSklop, persisting under a key', async () => {
    render(
      <SklopProvider persistKey="sklop-test">
        <Controls />
      </SklopProvider>,
    );
    await act(async () => screen.getByText('Dark').click());
    expect(html.getAttribute('data-sk-theme')).toBe('dark');
    expect(JSON.parse(localStorage.getItem('sklop-test') ?? '')).toEqual({ theme: 'dark' });
    await act(async () => screen.getByText('Reset').click());
    expect(html.getAttribute('data-sk-theme')).toBe('light');
    expect(JSON.parse(localStorage.getItem('sklop-test') ?? '')).toEqual({});
  });

  it('restores valid stored choices and ignores the rest', async () => {
    localStorage.setItem(
      'sklop-test',
      JSON.stringify({ theme: 'dark', density: 'huge', radius: 'round' }),
    );
    render(<SklopProvider persistKey="sklop-test">content</SklopProvider>);
    await act(async () => {});
    expect(skAttributes(html)).toEqual({
      ...DEFAULTS,
      'data-sk-theme': 'dark',
      'data-sk-radius': 'round',
    });
  });

  it('is axe clean in element scope', async () => {
    const { container } = render(
      <SklopProvider scope="element">
        <main>
          <h1>Scoped</h1>
        </main>
      </SklopProvider>,
    );
    await expect(container).toHaveNoViolations();
  });
});

describe('useSklop and useMotion', () => {
  it('useSklop needs a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Controls />)).toThrow(/needs a SklopProvider/);
  });

  it('useMotion follows the OS preference for system, and an explicit level otherwise', () => {
    prefersReducedMotion(true);
    const { unmount } = render(
      <SklopProvider>
        <Level />
      </SklopProvider>,
    );
    expect(screen.getByText('reduced')).toBeTruthy();
    unmount();
    prefersReducedMotion(false);
    render(
      <SklopProvider motion="off">
        <Level />
        <SklopProvider motion="system">
          <Level />
        </SklopProvider>
      </SklopProvider>,
    );
    expect(screen.getByText('off')).toBeTruthy();
    expect(screen.getByText('full')).toBeTruthy();
  });
});

describe('SklopScript', () => {
  it('sets stored choices on <html> before React runs, else the defaults', () => {
    localStorage.setItem('sklop-test', JSON.stringify({ theme: 'dark', motion: 'sideways' }));
    new Function(noFlashScript({ persistKey: 'sklop-test', density: 'compact' }))();
    expect(skAttributes(html)).toEqual({
      ...DEFAULTS,
      'data-sk-theme': 'dark',
      'data-sk-density': 'compact',
    });
  });

  it('renders one inline script that no value can close early', () => {
    const markup = renderToStaticMarkup(<SklopScript persistKey="</script><img>" nonce="n0nce" />);
    expect(markup.startsWith('<script nonce="n0nce">')).toBe(true);
    expect(markup.match(/<\/script>/g)).toHaveLength(1);
  });
});
