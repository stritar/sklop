import { axisChoices } from './tokens.js';

export type Direction = 'ltr' | 'rtl';

const LABELS: Record<string, string> = {
  theme: 'Theme',
  preset: 'Preset',
  density: 'Density',
  'font-scale': 'Font scale',
  radius: 'Radius',
  'motion-personality': 'Motion personality',
  motion: 'Motion level',
};

/** One select per axis, plus direction. Chrome styles only: the preview is what the axes change. */
export function AxisToolbar({
  settings,
  dir,
  onAxis,
  onDir,
}: {
  settings: Record<string, string>;
  dir: Direction;
  onAxis: (axis: string, value: string) => void;
  onDir: (dir: Direction) => void;
}) {
  return (
    <form
      className="hub-toolbar"
      aria-label="Preview settings"
      onSubmit={(e) => e.preventDefault()}
    >
      {axisChoices.map(({ axis, values }) => (
        <label key={axis} className="hub-field">
          <span>{LABELS[axis] ?? axis}</span>
          <select
            name={axis}
            value={settings[axis]}
            onChange={(event) => onAxis(axis, event.target.value)}
          >
            {values.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="hub-field">
        <span>Direction</span>
        <select name="dir" value={dir} onChange={(event) => onDir(event.target.value as Direction)}>
          <option value="ltr">ltr</option>
          <option value="rtl">rtl</option>
        </select>
      </label>
    </form>
  );
}
