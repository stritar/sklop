'use client';

import type { AxisName, AxisValues, Theme } from '@sklop/tokens/theme';
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  AXIS_NAMES,
  type AxisProps,
  type AxisSettings,
  absentValue,
  attributesFor,
  fromProps,
  sanitize,
} from './axes.js';

export interface SklopProviderProps extends AxisProps {
  children?: ReactNode;
  /** Reading direction of the scope. Unset, the document's own `dir` applies. */
  dir?: 'ltr' | 'rtl' | undefined;
  /** Token values applied on top of the axes, such as a brand colour. */
  overrides?: Theme | undefined;
  /**
   * Where the attributes go: `document` writes them to `<html>`, `element` wraps the children in a `div`.
   * Defaults to `document` for the outermost provider and `element` inside another one.
   */
  scope?: 'document' | 'element' | undefined;
  /** Keeps choices made with `useSklop().set` in localStorage under this key. Document scope only. */
  persistKey?: string | undefined;
  /** Class name of the wrapper in element scope. */
  className?: string | undefined;
}

export interface SklopContextValue {
  /** Every axis: the user's choice, else the prop, else the enclosing provider, else the default. */
  settings: AxisSettings;
  dir: 'ltr' | 'rtl' | undefined;
  set<A extends AxisName>(axis: A, value: AxisValues[A]): void;
  /** Forgets one choice, or all of them, so the prop or default applies again. */
  reset(axis?: AxisName): void;
}

export const SklopContext = createContext<SklopContextValue | null>(null);

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Sets every theming axis as a data attribute, always all of them on one element, so tokens that two axes
 * vary resolve correctly. The outermost provider writes to `<html>`; nested providers wrap their children.
 */
export function SklopProvider({
  children,
  dir,
  overrides,
  scope,
  persistKey,
  className,
  theme,
  preset,
  density,
  fontScale,
  radius,
  motion,
  motionPersonality,
}: SklopProviderProps) {
  const parent = useContext(SklopContext);
  const mode = scope ?? (parent ? 'element' : 'document');
  const persist = mode === 'document' ? persistKey : undefined;
  const [choices, setChoices] = useState<Partial<AxisSettings>>({});
  // With persistence, the attributes SklopScript painted stay until stored choices are read.
  const [loaded, setLoaded] = useState(!persist);

  useEffect(() => {
    if (!persist) return;
    try {
      setChoices(sanitize(JSON.parse(localStorage.getItem(persist) ?? '{}')));
    } catch {
      // Storage can be blocked; the props and defaults still apply.
    }
    setLoaded(true);
  }, [persist]);

  useEffect(() => {
    if (!persist || !loaded) return;
    try {
      localStorage.setItem(persist, JSON.stringify(choices));
    } catch {
      // Choices then last for this page only.
    }
  }, [persist, loaded, choices]);

  const parentSettings = parent?.settings;
  const settings = useMemo(() => {
    const props = fromProps({
      theme,
      preset,
      density,
      fontScale,
      radius,
      motion,
      motionPersonality,
    });
    return Object.fromEntries(
      AXIS_NAMES.map((axis) => [
        axis,
        choices[axis] ?? props[axis] ?? parentSettings?.[axis] ?? absentValue(axis),
      ]),
    ) as AxisSettings;
  }, [
    choices,
    parentSettings,
    theme,
    preset,
    density,
    fontScale,
    radius,
    motion,
    motionPersonality,
  ]);
  const attributes = useMemo(() => attributesFor(settings), [settings]);

  useIsomorphicLayoutEffect(() => {
    if (mode !== 'document' || !loaded) return;
    const html = document.documentElement;
    for (const [name, value] of Object.entries(attributes)) html.setAttribute(name, value);
    return () => {
      for (const name of Object.keys(attributes)) html.removeAttribute(name);
    };
  }, [mode, loaded, attributes]);

  const overridesKey = JSON.stringify(overrides ?? {});
  useIsomorphicLayoutEffect(() => {
    if (mode !== 'document') return;
    const entries = Object.entries(JSON.parse(overridesKey) as Record<string, string>);
    const { style } = document.documentElement;
    for (const [name, value] of entries) style.setProperty(name, value);
    return () => {
      for (const [name] of entries) style.removeProperty(name);
    };
  }, [mode, overridesKey]);

  useIsomorphicLayoutEffect(() => {
    if (mode !== 'document' || !dir) return;
    const html = document.documentElement;
    const previous = html.getAttribute('dir');
    html.setAttribute('dir', dir);
    return () => {
      if (previous === null) html.removeAttribute('dir');
      else html.setAttribute('dir', previous);
    };
  }, [mode, dir]);

  const set = useCallback(<A extends AxisName>(axis: A, value: AxisValues[A]) => {
    setChoices((previous) => ({ ...previous, [axis]: value }));
  }, []);
  const reset = useCallback((axis?: AxisName) => {
    setChoices((previous) => {
      if (!axis) return {};
      const next = { ...previous };
      delete next[axis];
      return next;
    });
  }, []);
  const resolvedDir = dir ?? parent?.dir;
  const context = useMemo(
    () => ({ settings, dir: resolvedDir, set, reset }),
    [settings, resolvedDir, set, reset],
  );

  if (mode === 'document') return <SklopContext value={context}>{children}</SklopContext>;
  return (
    <SklopContext value={context}>
      <div {...attributes} dir={dir} className={className} style={overrides as CSSProperties}>
        {children}
      </div>
    </SklopContext>
  );
}
