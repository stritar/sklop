'use client';

import { type AxisValues, useSklop } from '@sklop/react';

const THEMES: AxisValues['theme'][] = ['light', 'dark', 'system'];

export function ThemeSwitch() {
  const { settings, set } = useSklop();
  return (
    <fieldset>
      <legend>Theme</legend>
      {THEMES.map((theme) => (
        <label key={theme}>
          <input
            type="radio"
            name="theme"
            value={theme}
            checked={settings.theme === theme}
            onChange={() => set('theme', theme)}
          />
          {theme}
        </label>
      ))}
    </fieldset>
  );
}
