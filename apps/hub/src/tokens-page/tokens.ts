import { type AxisName, axes } from '@sklop/tokens/theme';
import tokensJson from '@sklop/tokens/tokens.json';

export interface ContrastRule {
  on: string;
  min?: number;
  exempt?: string;
}

export interface SemanticToken {
  name: string;
  path: string;
  type: string;
  value: string;
  origin: 'sample' | 'generated' | 'proposed';
  approved: string | null;
  description: string;
  varies: string[];
  contrast: ContrastRule[];
}

export interface ContrastPair {
  foreground: string;
  background: string;
  min?: number;
  exempt?: string;
}

export const semanticTokens = (tokensJson as (SemanticToken & { tier: string })[]).filter(
  (token) => token.tier === 'semantic',
);

export const CATEGORIES = [
  ['color', 'Colour'],
  ['font', 'Type'],
  ['space', 'Space'],
  ['size', 'Size'],
  ['radius', 'Radius'],
  ['border', 'Border'],
  ['shadow', 'Shadow'],
  ['motion', 'Motion'],
] as const;

export const tokensIn = (category: string) =>
  semanticTokens.filter((token) => token.path.split('.')[1] === category);

/** Every documented pair, as token names. */
export const contrastPairs: ContrastPair[] = semanticTokens.flatMap((token) =>
  token.contrast.map((rule) => {
    const background = semanticTokens.find((t) => t.path === `semantic.color.${rule.on}`);
    return {
      foreground: token.name,
      background: background?.name ?? rule.on,
      ...(rule.min === undefined ? {} : { min: rule.min }),
      ...(rule.exempt === undefined ? {} : { exempt: rule.exempt }),
    };
  }),
);

/** Axis names in registry order, with the values a select offers. */
export const axisChoices = (Object.keys(axes) as AxisName[]).map((axis) => ({
  axis,
  values: [...axes[axis].values, ...(axes[axis].system ? ['system'] : [])] as string[],
  initial: (axes[axis].absent ?? axes[axis].default) as string,
}));
