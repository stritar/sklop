#!/usr/bin/env node
// Writes primitive.color: pins the Figma sample to ramp steps and generates every other step a semantic
// token references, on one OKLCH lightness ladder shared by all ramps. Authoring only; output is committed.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clampChroma, converter, formatHex, wcagContrast } from 'culori';

const toOklch = converter('oklch');

/**
 * Sampled fills pinned to ramp steps, by Figma node. A list names every node sharing the fill, so the
 * step still cites the sample when no semantic token does (neutral.500 since text-secondary diverged).
 */
export const ANCHORS = {
  neutral: {
    50: '1:3',
    100: '1:19',
    500: ['1:12', '1:18', '1:21', '1:26', '1:32', '1:35'],
    700: '1:11',
  },
  coral: { 300: '1:36', 950: '1:38' },
};
/** Anchors whose mean hue the generated steps of a ramp keep. */
export const HUE_FROM = { neutral: [50, 100, 500, 700], coral: [300] };
export const WHITE = '1:5';
/** Node whose effect colours with alpha become black-alpha steps, named by rounded percent. */
export const SHADOW = '1:4';
/** A ladder step with alpha, written as {ramp}-alpha.{percent}. */
export const SCRIM = { ramp: 'neutral', step: 900, alpha: 0.4 };
/** Roles that must use the lightest step meeting a WCAG minimum on every listed background. */
export const GATES = [
  { role: 'border.strong', min: 3, on: ['bg.page', 'bg.raised'] },
  { role: 'border.focus', min: 3, on: ['bg.page', 'bg.raised'] },
  { role: 'accent.text', min: 4.5, on: ['bg.page', 'bg.raised'] },
];
/** Roles a foreground must keep a WCAG minimum on. */
export const FLOORS = [{ role: 'accent.solid-hover', min: 4.5, foreground: 'text.on-accent' }];

export const STEPS = Array.from({ length: 19 }, (_, i) => (i + 1) * 50);
const REF = /^\{primitive\.color\.([a-z-]+)(?:\.(\d+))?\}$/;

const round = (n, places = 4) => Number(n.toFixed(places));
const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;
const maxChroma = (l, h) => clampChroma({ mode: 'oklch', l, c: 0.4, h }, 'oklch').c ?? 0;

function colorToken(hex, { alpha, origin, description, figma, anchor }) {
  const components = [1, 3, 5].map((i) => round(Number.parseInt(hex.slice(i, i + 2), 16) / 255));
  return {
    $value: {
      colorSpace: 'srgb',
      components,
      ...(alpha === undefined ? {} : { alpha: round(alpha) }),
      hex,
    },
    $description: description,
    $extensions: {
      sklop: { origin, ...(figma ? { figma } : {}), ...(anchor ? { anchor: true } : {}) },
    },
  };
}

function oklchText(hex) {
  const { l, c, h = 0 } = toOklch(hex);
  return `oklch(${round(l, 4)} ${round(c, 4)} ${round(h, 1)})`;
}

/** Lightness at any step: piecewise linear between the anchors of every ramp. */
function ladder(anchors) {
  const points = Object.values(anchors)
    .flatMap((steps) => Object.entries(steps).map(([step, a]) => [Number(step), a.l]))
    .sort((a, b) => a[0] - b[0]);
  points.forEach(([step, l], i) => {
    if (i === 0) return;
    const [prevStep, prevL] = points[i - 1];
    if (step === prevStep) throw new Error(`Two ramps pin step ${step}; the ladder is shared`);
    if (l >= prevL) throw new Error(`Anchor at step ${step} is not darker than step ${prevStep}`);
  });
  return (step) => {
    const i = points.findIndex(([s]) => s >= step);
    if (i === -1 || (i === 0 && points[0][0] !== step)) {
      throw new Error(`Step ${step} lies outside the anchored steps`);
    }
    const [s1, l1] = points[i];
    if (s1 === step) return l1;
    const [s0, l0] = points[i - 1];
    return l0 + ((l1 - l0) * (step - s0)) / (s1 - s0);
  };
}

/**
 * Chroma as a share of the most sRGB allows at that lightness and hue, interpolated between anchors and
 * held beyond the outer ones. The gamut narrows towards white and black, so vividness still falls off.
 */
function chromaCurve(anchors, hue) {
  const points = Object.entries(anchors)
    .map(([step, a]) => [Number(step), Math.min(1, a.c / maxChroma(a.l, hue))])
    .sort((a, b) => a[0] - b[0]);
  const [first, last] = [points[0], points.at(-1)];
  return (step) => {
    if (step <= first[0]) return first[1];
    if (step >= last[0]) return last[1];
    const i = points.findIndex(([s]) => s >= step);
    const [s0, r0] = points[i - 1];
    const [s1, r1] = points[i];
    return r0 + ((r1 - r0) * (step - s0)) / (s1 - s0);
  };
}

/** Every colour primitive a semantic token references, as { ramp: Set(steps) }. */
function referencedSteps(semantic) {
  const found = {};
  const walk = (value) => {
    if (typeof value === 'string') {
      const match = value.match(REF);
      if (match?.[2]) {
        found[match[1]] ??= new Set();
        found[match[1]].add(Number(match[2]));
      }
    } else if (value && typeof value === 'object') {
      for (const child of Object.values(value)) walk(child);
    }
  };
  walk(semantic);
  return found;
}

export function generateColors({ fixture, semantic }) {
  const node = (id) => {
    const found = fixture.nodes[id];
    if (!found) throw new Error(`Figma node ${id} is not in the fixture`);
    return found;
  };
  const fill = (id) => {
    const hex = node(id).fill;
    if (!hex) throw new Error(`Figma node ${id} has no fill in the fixture`);
    return hex;
  };

  const anchors = Object.fromEntries(
    Object.entries(ANCHORS).map(([ramp, steps]) => [
      ramp,
      Object.fromEntries(
        Object.entries(steps).map(([step, nodes]) => {
          const ids = [nodes].flat();
          const hex = fill(ids[0]);
          for (const id of ids) {
            if (fill(id) !== hex) {
              throw new Error(
                `${ramp}.${step}: node ${id} is ${fill(id)}, not ${hex} like ${ids[0]}`,
              );
            }
          }
          return [step, { ids, hex, ...toOklch(hex) }];
        }),
      ),
    ]),
  );
  const lightness = ladder(anchors);
  const referenced = referencedSteps(semantic);
  const tree = { $type: 'color' };
  const slots = {};

  tree.white = colorToken(fill(WHITE), {
    origin: 'sample',
    description: `White, sampled from Figma node ${WHITE}.`,
    figma: [`${WHITE}.fill`],
  });

  for (const [ramp, pinned] of Object.entries(anchors)) {
    const hue = mean(HUE_FROM[ramp].map((step) => pinned[step].h));
    const chroma = chromaCurve(pinned, hue);
    slots[ramp] = Object.fromEntries(
      STEPS.map((step) => {
        if (pinned[step]) return [step, pinned[step].hex];
        const l = lightness(step);
        const c = chroma(step) * maxChroma(l, hue);
        return [step, formatHex(clampChroma({ mode: 'oklch', l, c, h: hue }, 'oklch'))];
      }),
    );
    tree[ramp] = {};
    const steps = new Set([...Object.keys(pinned).map(Number), ...(referenced[ramp] ?? [])]);
    for (const step of [...steps].sort((a, b) => a - b)) {
      if (!STEPS.includes(step)) {
        throw new Error(`primitive.color.${ramp}.${step} is not a ladder step (50 to 950 by 50)`);
      }
      tree[ramp][step] = pinned[step]
        ? colorToken(pinned[step].hex, {
            origin: 'sample',
            description: `Sampled from Figma node${pinned[step].ids.length > 1 ? 's' : ''} ${pinned[step].ids.join(', ')}.`,
            figma: pinned[step].ids.map((id) => `${id}.fill`),
            anchor: true,
          })
        : colorToken(slots[ramp][step], {
            origin: 'generated',
            description: `Generated on the shared lightness ladder: ${oklchText(slots[ramp][step])}.`,
          });
    }
  }

  const scrimKey = `${SCRIM.ramp}-alpha`;
  const scrimStep = Math.round(SCRIM.alpha * 100);
  if (referenced[scrimKey]?.has(scrimStep)) {
    tree[scrimKey] = {
      [scrimStep]: colorToken(slots[SCRIM.ramp][SCRIM.step], {
        alpha: SCRIM.alpha,
        origin: 'generated',
        description: `Generated: ${SCRIM.ramp} step ${SCRIM.step} at ${scrimStep}% alpha.`,
      }),
    };
  }

  tree['black-alpha'] = {};
  node(SHADOW).effects.forEach((effect, index) => {
    if (effect.color.length !== 9) return;
    const byte = Number.parseInt(effect.color.slice(7), 16);
    const key = Math.round((byte / 255) * 100);
    const cite = `${SHADOW}.effects.${index}.color`;
    const existing = tree['black-alpha'][key];
    if (existing) {
      existing.$extensions.sklop.figma.push(cite);
      return;
    }
    tree['black-alpha'][key] = colorToken(effect.color.slice(0, 7), {
      alpha: byte / 255,
      origin: 'sample',
      description: `Shadow colour ${effect.color}, sampled from Figma node ${SHADOW}.`,
      figma: [cite],
    });
  });

  for (const [group, steps] of Object.entries(referenced)) {
    for (const step of steps) {
      if (!tree[group]?.[step])
        throw new Error(`primitive.color.${group}.${step} cannot be generated`);
    }
  }

  const roleHex = (role) => {
    const [group, name] = role.split('.');
    const ref = semantic.semantic?.color?.[group]?.[name]?.$value;
    const match = typeof ref === 'string' ? ref.match(REF) : null;
    if (!match) throw new Error(`semantic.color.${role} must alias a colour primitive`);
    const [, ramp, step] = match;
    const token = step ? tree[ramp]?.[step] : tree[ramp];
    return { ramp, step: step && Number(step), hex: token.$value.hex };
  };

  const errors = [];
  const checks = [];
  for (const gate of GATES) {
    const role = roleHex(gate.role);
    const backgrounds = gate.on.map(roleHex);
    const ratio = (hex) => Math.min(...backgrounds.map((bg) => wcagContrast(hex, bg.hex)));
    const lightest = STEPS.find((step) => ratio(slots[role.ramp][step]) >= gate.min);
    checks.push(
      `${gate.role} = ${role.ramp}.${role.step}: ${ratio(role.hex).toFixed(2)}:1 on ${gate.on.join(' and ')} (min ${gate.min}, lightest passing ${role.ramp}.${lightest})`,
    );
    if (role.step !== lightest) {
      errors.push(
        `semantic.color.${gate.role} uses ${role.ramp}.${role.step}; the lightest step meeting ${gate.min}:1 is ${role.ramp}.${lightest}`,
      );
    }
  }
  for (const floor of FLOORS) {
    const background = roleHex(floor.role);
    const ratio = wcagContrast(roleHex(floor.foreground).hex, background.hex);
    checks.push(`${floor.foreground} on ${floor.role}: ${ratio.toFixed(2)}:1 (min ${floor.min})`);
    if (ratio < floor.min) {
      errors.push(
        `${floor.foreground} on ${floor.role} is ${ratio.toFixed(2)}:1, below ${floor.min}:1`,
      );
    }
  }

  const page = roleHex('bg.page').hex;
  const raised = roleHex('bg.raised').hex;
  const rows = Object.entries(tree)
    .filter(([key]) => !key.startsWith('$'))
    .flatMap(([group, value]) =>
      '$value' in value
        ? [[group, value]]
        : Object.entries(value).map(([s, t]) => [`${group}.${s}`, t]),
    )
    .map(([name, token]) => {
      const { hex, alpha } = token.$value;
      const contrast =
        alpha === undefined
          ? `${wcagContrast(hex, page).toFixed(2)}  ${wcagContrast(hex, raised).toFixed(2)}`
          : '';
      return `${name.padEnd(18)}${token.$extensions.sklop.origin.padEnd(11)}${hex}${alpha === undefined ? '       ' : ` a${alpha.toFixed(2)}  `}${oklchText(hex).padEnd(29)}${contrast}`;
    });
  const report = [
    'step              origin     hex             oklch                        vs page  vs raised',
    ...rows,
    '',
    ...checks,
  ].join('\n');

  return { tree, report, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const read = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
  const primitive = read('src/primitive.tokens.json');
  const { tree, report, errors } = generateColors({
    fixture: read('fixtures/figma-sample.json'),
    semantic: read('src/semantic.tokens.json'),
  });
  console.log(report);
  if (errors.length) {
    console.error(`\n${errors.join('\n')}`);
    process.exit(1);
  }
  primitive.primitive.color = tree;
  writeFileSync(join(root, 'src/primitive.tokens.json'), `${JSON.stringify(primitive, null, 2)}\n`);
}
