'use client';

import type { AxisValues } from '@sklop/tokens/theme';
import { useContext, useSyncExternalStore } from 'react';
import { axes } from './axes.js';
import { SklopContext, type SklopContextValue } from './SklopProvider.js';

/** The resolved axes of the nearest SklopProvider, with `set` and `reset`. */
export function useSklop(): SklopContextValue {
  const context = useContext(SklopContext);
  if (!context) throw new Error('useSklop needs a SklopProvider above it.');
  return context;
}

const REDUCED = axes.motion.system?.query ?? '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** The motion level in effect, for animation driven from JavaScript. `system` resolves to the OS preference. */
export function useMotion(): Exclude<AxisValues['motion'], 'system'> {
  const level = useContext(SklopContext)?.settings.motion ?? 'system';
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
  if (level !== 'system') return level;
  return reduced ? 'reduced' : 'full';
}
