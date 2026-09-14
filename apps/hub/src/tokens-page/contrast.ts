const HEX = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;
const long = (hex: string) =>
  hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;

const luminance = (hex: string) => {
  const channels = [0, 2, 4].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG 2 contrast of two opaque #rgb or #rrggbb colours, or null when either is not one. */
export function contrastRatio(foreground: string | undefined, background: string | undefined) {
  const a = HEX.exec(foreground?.trim() ?? '')?.[1];
  const b = HEX.exec(background?.trim() ?? '')?.[1];
  if (!a || !b) return null;
  const [light, dark] = [luminance(long(a)), luminance(long(b))].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}
