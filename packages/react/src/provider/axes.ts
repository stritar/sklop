import type { AxisName, AxisValues } from '@sklop/tokens/theme';
import { axes } from '@sklop/tokens/theme';

/** A value for every axis, as the data attributes carry them. */
export type AxisSettings = { [A in AxisName]: AxisValues[A] };

/** Provider props for the axes, in camelCase. */
export interface AxisProps {
  theme?: AxisValues['theme'] | undefined;
  preset?: AxisValues['preset'] | undefined;
  density?: AxisValues['density'] | undefined;
  fontScale?: AxisValues['font-scale'] | undefined;
  radius?: AxisValues['radius'] | undefined;
  motion?: AxisValues['motion'] | undefined;
  motionPersonality?: AxisValues['motion-personality'] | undefined;
}

export const AXIS_PROPS = {
  theme: 'theme',
  preset: 'preset',
  density: 'density',
  fontScale: 'font-scale',
  radius: 'radius',
  motion: 'motion',
  motionPersonality: 'motion-personality',
} as const satisfies Record<keyof AxisProps, AxisName>;

export const AXIS_NAMES = Object.keys(axes) as AxisName[];

/** Every value an axis attribute accepts, `system` included where the axis follows the OS. */
export function acceptedValues(axis: AxisName): readonly string[] {
  const { values, system } = axes[axis];
  return system ? [...values, 'system'] : values;
}

export function isAxisValue<A extends AxisName>(axis: A, value: unknown): value is AxisValues[A] {
  return typeof value === 'string' && acceptedValues(axis).includes(value);
}

/** What an element without the attribute takes: `system` for axes that follow the OS when absent. */
export function absentValue<A extends AxisName>(axis: A): AxisValues[A] {
  const { absent, default: fallback } = axes[axis];
  return (absent ?? fallback) as AxisValues[A];
}

/** The axis values set through props, keyed by axis name. */
export function fromProps(props: AxisProps): Partial<AxisSettings> {
  const settings: Partial<AxisSettings> = {};
  const writable = settings as Record<AxisName, unknown>;
  for (const [prop, axis] of Object.entries(AXIS_PROPS) as [keyof AxisProps, AxisName][]) {
    const value = props[prop];
    if (value !== undefined) writable[axis] = value;
  }
  return settings;
}

/** Only the entries that name an axis and one of its values, from untrusted input such as storage. */
export function sanitize(input: unknown): Partial<AxisSettings> {
  const settings: Partial<AxisSettings> = {};
  if (input === null || typeof input !== 'object') return settings;
  const writable = settings as Record<AxisName, unknown>;
  for (const axis of AXIS_NAMES) {
    const value = (input as Record<string, unknown>)[axis];
    if (isAxisValue(axis, value)) writable[axis] = value;
  }
  return settings;
}

/** Data attributes for a complete set of axis values. */
export function attributesFor(settings: AxisSettings): Record<string, string> {
  return Object.fromEntries(AXIS_NAMES.map((axis) => [axes[axis].attribute, settings[axis]]));
}

export { axes };
