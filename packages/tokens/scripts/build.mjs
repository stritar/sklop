#!/usr/bin/env node
// DTCG source → generated/tokens.css (semantic custom properties, resolved to literals, one block per axis
// value) + generated/tokens.json. `--check` fails when the committed files differ. Zero dependencies.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TIERS = ['primitive', 'semantic'];
export const CATEGORIES = [
  'color',
  'font',
  'space',
  'size',
  'radius',
  'border',
  'shadow',
  'motion',
];
/**
 * Runtime axes, each a data attribute. An element without the attribute takes the default. `system`, where
 * present, follows a media query. The provider writes every attribute on one element, because a token two
 * axes vary is only right when both attributes sit together.
 */
export const AXES = {
  theme: {
    attribute: 'data-sk-theme',
    values: ['light', 'dark'],
    default: 'light',
    categories: ['color', 'shadow'],
    colorScheme: true,
    system: { query: '(prefers-color-scheme: dark)', value: 'dark' },
  },
  preset: {
    attribute: 'data-sk-preset',
    values: ['default', 'neutral'],
    default: 'default',
    categories: ['color'],
  },
};
/** Axis pairs that may vary one token together, in registry order. */
export const CROSS = [['theme', 'preset']];
const PHYSICAL = /(^|-)(left|right|top|bottom|horizontal|vertical)(-|$)/;
const ORIGINS = ['sample', 'generated', 'proposed'];
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALIAS = /^\{([^{}]+)\}$/;
const HEX = /^#[0-9a-f]{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ROOT_PX = 16;
const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
]);

/** Composite parts and their types. `literal` parts may hold a value instead of an alias. */
const COMPOSITES = {
  shadow: {
    parts: {
      color: 'color',
      offsetX: 'dimension',
      offsetY: 'dimension',
      blur: 'dimension',
      spread: 'dimension',
    },
    optional: { inset: 'boolean' },
    literal: ['offsetX', 'offsetY', 'blur', 'spread', 'inset'],
  },
  typography: {
    parts: {
      fontFamily: 'fontFamily',
      fontSize: 'dimension',
      fontWeight: 'fontWeight',
      letterSpacing: 'dimension',
      lineHeight: 'number',
    },
    optional: {},
    literal: ['lineHeight'],
  },
};

const isAlias = (value) => typeof value === 'string' && ALIAS.test(value);
const containsAlias = (value) =>
  isAlias(value) ||
  (value !== null && typeof value === 'object' && Object.values(value).some(containsAlias));
const num = (n) => String(Number(n.toFixed(4)));
const byte = (unit) =>
  Math.round(unit * 255)
    .toString(16)
    .padStart(2, '0');

function collect(node, path, inheritedType, out) {
  const type = node.$type ?? inheritedType;
  if ('$value' in node) {
    out.push({
      path,
      id: path.join('.'),
      tier: path[0],
      type,
      raw: node.$value,
      description: node.$description,
      sklop: node.$extensions?.sklop ?? {},
    });
    return out;
  }
  const keys = Object.keys(node).filter((key) => !key.startsWith('$'));
  // Integer-like keys already iterate in ascending order; sort anyway so step order never depends on it.
  if (keys.every((key) => /^\d+$/.test(key))) keys.sort((a, b) => Number(a) - Number(b));
  for (const key of keys) {
    const id = [...path, key].join('.');
    if (!SEGMENT.test(key)) {
      throw new Error(`${id}: "${key}" must be lowercase letters and digits joined by hyphens`);
    }
    const child = node[key];
    if (child === null || typeof child !== 'object' || Array.isArray(child)) {
      throw new Error(`${id}: expected a token with $value or a group`);
    }
    collect(child, [...path, key], type, out);
  }
  return out;
}

function checkLiteral(type, value, where) {
  const fail = (why) => {
    throw new Error(`${where}: ${why}`);
  };
  switch (type) {
    case 'color': {
      if (value?.colorSpace !== 'srgb') fail('color needs colorSpace "srgb"');
      const { components, alpha, hex } = value;
      if (
        !Array.isArray(components) ||
        components.length !== 3 ||
        components.some((c) => typeof c !== 'number' || c < 0 || c > 1)
      ) {
        fail('color needs three components from 0 to 1');
      }
      if (alpha !== undefined && (typeof alpha !== 'number' || alpha < 0 || alpha > 1)) {
        fail('alpha must be a number from 0 to 1');
      }
      if (!HEX.test(hex ?? '')) fail('color needs a lowercase 6-digit hex');
      const fromComponents = `#${components.map(byte).join('')}`;
      if (fromComponents !== hex)
        fail(`hex ${hex} does not match its components (${fromComponents})`);
      return;
    }
    case 'dimension':
      if (typeof value?.value !== 'number' || !['px', 'rem'].includes(value.unit)) {
        fail('dimension needs { value, unit: "px" | "rem" }');
      }
      return;
    case 'duration':
      if (
        typeof value?.value !== 'number' ||
        value.value < 0 ||
        !['ms', 's'].includes(value.unit)
      ) {
        fail('duration needs { value, unit: "ms" | "s" }');
      }
      return;
    case 'cubicBezier':
      if (
        !Array.isArray(value) ||
        value.length !== 4 ||
        value.some((n) => typeof n !== 'number') ||
        value[0] < 0 ||
        value[0] > 1 ||
        value[2] < 0 ||
        value[2] > 1
      ) {
        fail('cubicBezier needs [x1, y1, x2, y2] with both x from 0 to 1');
      }
      return;
    case 'fontFamily':
      if (
        typeof value !== 'string' &&
        !(Array.isArray(value) && value.length && value.every((f) => typeof f === 'string'))
      ) {
        fail('fontFamily needs a name or a list of names');
      }
      return;
    case 'fontWeight':
      if (typeof value !== 'number' || value < 1 || value > 1000) {
        fail('fontWeight needs a number from 1 to 1000');
      }
      return;
    case 'number':
      if (typeof value !== 'number') fail('number needs a number');
      return;
    case 'boolean':
      if (typeof value !== 'boolean') fail('expected true or false');
      return;
    default:
      fail(`unsupported $type "${type}"`);
  }
}

const family = (name) =>
  GENERIC_FAMILIES.has(name) || /^[A-Za-z][A-Za-z0-9-]*$/.test(name) ? name : `'${name}'`;

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG 2 contrast ratio of two opaque hex colours. */
export function contrastRatio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Name grammar: {tier}.{category}.{role}[.{variant}][.{state}], never a physical direction. */
function checkName(token) {
  const [tier, category, ...rest] = token.path;
  if (!CATEGORIES.includes(category)) {
    throw new Error(`${token.id}: "${category}" is not a category (${CATEGORIES.join(', ')})`);
  }
  if (tier === 'semantic' && (rest.length < 1 || rest.length > 3)) {
    throw new Error(`${token.id}: semantic names are {category}.{role}[.{variant}][.{state}]`);
  }
  const physical = token.path.find((segment) => PHYSICAL.test(segment));
  if (physical) {
    throw new Error(
      `${token.id}: "${physical}" names a physical direction; use start, end, block or inline`,
    );
  }
}

/** Provenance and documented pairs, checked for shape. */
function checkMetadata(token) {
  const { anchor, diverges, approved, contrast } = token.sklop;
  const fail = (why) => {
    throw new Error(`${token.id}: ${why}`);
  };
  if (anchor !== undefined && (anchor !== true || token.tier !== 'primitive')) {
    fail('anchor: true marks sampled primitives only');
  }
  if (approved !== undefined && !DATE.test(approved)) fail('approved must be a YYYY-MM-DD date');
  if (diverges !== undefined) {
    const citesOk =
      Array.isArray(diverges.from) &&
      diverges.from.length > 0 &&
      diverges.from.every((cite) => typeof cite === 'string');
    if (!citesOk || typeof diverges.reason !== 'string' || !diverges.reason.trim()) {
      fail('diverges needs { from: [Figma cites], reason, date }');
    }
    if (!DATE.test(diverges.date ?? '')) fail('diverges.date must be a YYYY-MM-DD date');
  }
  if (contrast !== undefined) {
    if (token.tier !== 'semantic' || token.type !== 'color') {
      fail('contrast pairs belong on semantic colour tokens');
    }
    for (const pair of Array.isArray(contrast) ? contrast : [null]) {
      const hasMin = typeof pair?.min === 'number' && pair.min > 1;
      const hasExempt = typeof pair?.exempt === 'string' && pair.exempt.trim() !== '';
      if (typeof pair?.on !== 'string' || hasMin === hasExempt) {
        fail('each contrast pair is { on: "group.role", min } or { on, exempt: reason }');
      }
    }
  }
}

function format(type, value) {
  switch (type) {
    case 'color':
      return value.alpha === undefined || value.alpha === 1
        ? value.hex
        : `${value.hex}${byte(value.alpha)}`;
    case 'dimension':
    case 'duration':
      return `${num(value.value)}${value.unit}`;
    case 'cubicBezier':
      return `cubic-bezier(${value.map(num).join(', ')})`;
    case 'fontFamily':
      return [value].flat().map(family).join(', ');
    case 'fontWeight':
    case 'number':
      return String(value);
    case 'shadow':
      return [value]
        .flat()
        .map((layer) =>
          [
            layer.inset ? 'inset' : '',
            format('dimension', layer.offsetX),
            format('dimension', layer.offsetY),
            format('dimension', layer.blur),
            format('dimension', layer.spread),
            format('color', layer.color),
          ]
            .filter(Boolean)
            .join(' '),
        )
        .join(', ');
    case 'typography': {
      const sizePx =
        value.fontSize.unit === 'rem' ? value.fontSize.value * ROOT_PX : value.fontSize.value;
      const size = `${num(sizePx / ROOT_PX)}rem`;
      const lineBox = `${num((value.lineHeight * sizePx) / ROOT_PX)}rem`;
      return `${value.fontWeight} ${size}/${lineBox} ${format('fontFamily', value.fontFamily)}`;
    }
    default:
      throw new Error(`cannot format $type "${type}"`);
  }
}

export const cssName = (path) => `--sk-${path.slice(1).join('-')}`;

const variantKey = (entries) => entries.map(([axis, value]) => `${axis}.${value}`).join('+');

/** The resolved value a semantic token takes for concrete axis values. */
function pick(token, combo, axes) {
  const active = token.varies.filter((axis) => combo[axis] !== axes[axis].default);
  const key = variantKey(active.map((axis) => [axis, combo[axis]]));
  return token.variants.get(key) ?? token.base;
}

export function buildTokens(source, { axes = AXES, cross = CROSS } = {}) {
  for (const key of Object.keys(source)) {
    if (!TIERS.includes(key)) throw new Error(`${key}: unknown tier; use primitive or semantic`);
  }
  const tokens = TIERS.flatMap((tier) =>
    source[tier] ? collect(source[tier], [tier], undefined, []) : [],
  );
  const byId = new Map(tokens.map((token) => [token.id, token]));
  const used = new Set();

  for (const token of tokens) {
    if (!token.type) throw new Error(`${token.id}: missing $type`);
    if (typeof token.description !== 'string' || !token.description.trim()) {
      throw new Error(`${token.id}: missing $description`);
    }
    if (!ORIGINS.includes(token.sklop.origin)) {
      throw new Error(
        `${token.id}: $extensions.sklop.origin must be sample, generated or proposed`,
      );
    }
    checkMetadata(token);
    checkName(token);
    if ('modes' in token.sklop)
      throw new Error(`${token.id}: sklop.modes is replaced by sklop.axes`);
  }

  const aliasTarget = (ref, type, where) => {
    const target = byId.get(ref.match(ALIAS)[1]);
    if (!target) throw new Error(`${where}: unresolved alias ${ref}`);
    if (target.tier !== 'primitive') {
      throw new Error(`${where}: ${ref} is not a primitive; semantic tokens alias primitives only`);
    }
    if (target.type !== type)
      throw new Error(`${where}: expects ${type} but ${ref} is ${target.type}`);
    used.add(target.id);
    return target;
  };

  const resolve = (token, raw, where) => {
    const composite = COMPOSITES[token.type];
    if (!composite) {
      if (!isAlias(raw))
        throw new Error(`${where}: semantic tokens alias a primitive, not a literal`);
      const target = aliasTarget(raw, token.type, where);
      return { value: target.raw, alias: target.id };
    }
    const layers = token.type === 'shadow' ? [raw].flat() : [raw];
    const resolved = layers.map((layer, index) => {
      const at = token.type === 'shadow' && Array.isArray(raw) ? `${where}[${index}]` : where;
      if (layer === null || typeof layer !== 'object' || Array.isArray(layer)) {
        throw new Error(`${at}: ${token.type} needs an object of parts`);
      }
      const types = { ...composite.parts, ...composite.optional };
      for (const part of Object.keys(layer)) {
        if (!types[part]) throw new Error(`${at}: ${token.type} has no part "${part}"`);
      }
      const out = {};
      for (const [part, type] of Object.entries(types)) {
        if (!(part in layer)) {
          if (part in composite.parts) throw new Error(`${at}: ${token.type} is missing ${part}`);
          continue;
        }
        const value = layer[part];
        if (isAlias(value)) {
          out[part] = aliasTarget(value, type, `${at}.${part}`).raw;
        } else if (composite.literal.includes(part)) {
          checkLiteral(type, value, `${at}.${part}`);
          out[part] = value;
        } else {
          throw new Error(
            `${at}.${part}: must alias a primitive; only ${composite.literal.join(', ')} may be literal`,
          );
        }
      }
      if (token.type === 'typography' && out.letterSpacing.value !== 0) {
        throw new Error(`${at}.letterSpacing: the font shorthand cannot carry letter spacing`);
      }
      return out;
    });
    return {
      value: token.type === 'shadow' && Array.isArray(raw) ? resolved : resolved[0],
      alias: null,
    };
  };

  for (const token of tokens.filter((t) => t.tier === 'primitive')) {
    if (COMPOSITES[token.type])
      throw new Error(`${token.id}: composites belong in the semantic tier`);
    if (containsAlias(token.raw))
      throw new Error(`${token.id}: primitives hold literals, not aliases`);
    if (token.sklop.axes || token.sklop.cross) {
      throw new Error(`${token.id}: only semantic tokens vary by axis`);
    }
    checkLiteral(token.type, token.raw, token.id);
    token.css = format(token.type, token.raw);
    token.alias = null;
  }

  const nonDefault = (axis) => axes[axis].values.filter((value) => value !== axes[axis].default);
  const isPair = (a, b) => cross.some(([x, y]) => x === a && y === b);

  const names = new Map();
  for (const token of tokens.filter((t) => t.tier === 'semantic')) {
    if (token.sklop.origin === 'sample' && !token.sklop.figma?.length) {
      throw new Error(
        `${token.id}: sampled tokens cite their Figma nodes in $extensions.sklop.figma`,
      );
    }
    token.name = cssName(token.path);
    const clash = names.get(token.name);
    if (clash) throw new Error(`${token.id}: ${token.name} is already the name of ${clash}`);
    names.set(token.name, token.id);

    const resolved = (raw, where) => {
      const { value, alias } = resolve(token, raw, where);
      return { value, alias, css: format(token.type, value) };
    };
    token.base = resolved(token.raw, token.id);
    token.css = token.base.css;
    token.variants = new Map();
    const varied = new Set();
    const vary = (axis) => {
      if (!axes[axis]) throw new Error(`${token.id}: unknown axis "${axis}"`);
      if (!axes[axis].categories.includes(token.path[1])) {
        throw new Error(`${token.id}: the ${axis} axis does not vary ${token.path[1]} tokens`);
      }
      varied.add(axis);
    };
    for (const [axis, values] of Object.entries(token.sklop.axes ?? {})) {
      vary(axis);
      for (const [value, raw] of Object.entries(values)) {
        if (!nonDefault(axis).includes(value)) {
          throw new Error(`${token.id}: ${axis} has no non-default value "${value}"`);
        }
        token.variants.set(`${axis}.${value}`, resolved(raw, `${token.id} (${axis} ${value})`));
      }
    }
    for (const [key, raw] of Object.entries(token.sklop.cross ?? {})) {
      const parts = key.split('+').map((part) => part.split('.'));
      const valid =
        parts.length === 2 &&
        isPair(parts[0][0], parts[1][0]) &&
        parts.every(
          ([axis, value, extra]) => extra === undefined && nonDefault(axis).includes(value),
        );
      if (!valid) {
        throw new Error(
          `${token.id}: cross key "${key}" must be axis.value+axis.value for a declared pair, with non-default values`,
        );
      }
      for (const [axis] of parts) vary(axis);
      token.variants.set(key, resolved(raw, `${token.id} (${key})`));
    }
    token.varies = Object.keys(axes).filter((axis) => varied.has(axis));
    if (token.varies.length > 1) {
      const [a, b, extra] = token.varies;
      if (extra || !isPair(a, b)) {
        throw new Error(
          `${token.id}: axes ${token.varies.join(', ')} vary this token together, but only a declared pair may`,
        );
      }
      for (const va of nonDefault(a)) {
        for (const vb of nonDefault(b)) {
          const key = variantKey([
            [a, va],
            [b, vb],
          ]);
          if (!token.variants.has(key)) {
            throw new Error(
              `${token.id}: ${a} and ${b} both vary this token, so it needs cross "${key}"`,
            );
          }
        }
      }
    }
  }

  for (const token of tokens.filter((t) => t.tier === 'primitive')) {
    // Sampled anchors stay as evidence of the sample even when no role uses them.
    if (!used.has(token.id) && !token.sklop.anchor) {
      throw new Error(
        `${token.id}: unused primitive; every primitive needs a semantic token using it`,
      );
    }
  }

  const semantic = tokens.filter((t) => t.tier === 'semantic');
  const defaults = Object.fromEntries(
    Object.entries(axes).map(([axis, def]) => [axis, def.default]),
  );

  // Every documented pair holds in every combination of the axes that vary colour.
  const colorAxes = Object.keys(axes).filter((axis) => axes[axis].categories.includes('color'));
  const combos = colorAxes.reduce(
    (list, axis) =>
      list.flatMap((combo) => axes[axis].values.map((value) => ({ ...combo, [axis]: value }))),
    [defaults],
  );
  for (const combo of combos) {
    const label = colorAxes
      .filter((axis) => combo[axis] !== axes[axis].default)
      .map((axis) => `${axis} ${combo[axis]}`)
      .join(', ');
    for (const token of semantic.filter((t) => t.sklop.contrast)) {
      for (const pair of token.sklop.contrast) {
        const background = byId.get(`semantic.color.${pair.on}`);
        if (background?.type !== 'color') {
          throw new Error(`${token.id}: contrast pair names unknown colour role "${pair.on}"`);
        }
        const where = `${token.id} on ${pair.on}${label ? ` (${label})` : ''}`;
        const colors = [pick(token, combo, axes).value, pick(background, combo, axes).value];
        if (colors.some((color) => color.alpha !== undefined && color.alpha !== 1)) {
          throw new Error(`${where}: contrast needs opaque colours`);
        }
        const ratio = contrastRatio(colors[0].hex, colors[1].hex);
        if (pair.min && ratio < pair.min) {
          throw new Error(`${where}: ${ratio.toFixed(2)}:1 is below the documented ${pair.min}:1`);
        }
      }
    }
  }

  return { css: emitCss(semantic, { axes, cross, defaults }), json: tokens.map(toJson) };
}

/**
 * `:root` holds every default. Each axis value gets a block declaring every token that axis varies, so a
 * nested scope restores what an ancestor changed. Declared pairs get compound blocks, which outrank the
 * single ones, and `system` values repeat inside their media query.
 */
function emitCss(semantic, { axes, cross, defaults }) {
  const attr = (axis, value) => `[${axes[axis].attribute}="${value}"]`;
  const choices = (axis) => [...axes[axis].values, ...(axes[axis].system ? ['system'] : [])];
  const concrete = (axis, value, inMedia) =>
    value !== 'system' ? value : inMedia ? axes[axis].system.value : axes[axis].default;
  const lines = (list, combo, indent) =>
    list.map((token, i) => {
      const gap = i > 0 && list[i - 1].path[1] !== token.path[1] ? '\n' : '';
      return `${gap}${indent}${token.name}: ${pick(token, combo, axes).css};`;
    });
  const block = (selector, body, indent) =>
    `${indent}${selector} {\n${body.join('\n')}\n${indent}}\n`;

  const rules = [block(':root', lines(semantic, defaults, '    '), '  ')];
  const media = new Map();
  const place = (query, text) => {
    if (query) media.set(query, [...(media.get(query) ?? []), text]);
    else rules.push(text);
  };

  for (const axis of Object.keys(axes)) {
    const varied = semantic.filter((t) => t.varies.includes(axis));
    if (!varied.length) continue;
    for (const value of choices(axis)) {
      for (const inMedia of value === 'system' ? [false, true] : [false]) {
        const combo = { ...defaults, [axis]: concrete(axis, value, inMedia) };
        const indent = inMedia ? '    ' : '  ';
        const scheme = axes[axis].colorScheme ? [`${indent}  color-scheme: ${combo[axis]};`] : [];
        const body = [...scheme, ...lines(varied, combo, `${indent}  `)];
        place(inMedia && axes[axis].system.query, block(attr(axis, value), body, indent));
      }
    }
  }
  for (const [a, b] of cross) {
    if (axes[a].system && axes[b].system)
      throw new Error(`${a} and ${b} cannot both follow the system`);
    const varied = semantic.filter((t) => t.varies.includes(a) && t.varies.includes(b));
    for (const va of varied.length ? choices(a) : []) {
      for (const vb of choices(b)) {
        if (va === axes[a].default && vb === axes[b].default) continue;
        const system = va === 'system' ? a : vb === 'system' ? b : null;
        for (const inMedia of system ? [false, true] : [false]) {
          const combo = {
            ...defaults,
            [a]: concrete(a, va, inMedia),
            [b]: concrete(b, vb, inMedia),
          };
          const indent = inMedia ? '    ' : '  ';
          const text = block(
            attr(a, va) + attr(b, vb),
            lines(varied, combo, `${indent}  `),
            indent,
          );
          place(inMedia && axes[system].system.query, text);
        }
      }
    }
  }

  let css = `/* Generated by @sklop/tokens. Do not edit. */
@layer sklop.tokens, sklop.components;

@layer sklop.tokens {
${rules.join('\n')}`;
  for (const [query, blocks] of media) css += `\n  @media ${query} {\n${blocks.join('\n')}  }\n`;
  return `${css}}\n`;
}

const toJson = (token) => ({
  name: token.name ?? null,
  path: token.id,
  tier: token.tier,
  type: token.type,
  value: token.css,
  alias: token.tier === 'semantic' ? token.base.alias : null,
  varies: token.varies ?? [],
  variants: Object.fromEntries([...(token.variants ?? [])].map(([key, v]) => [key, v.css])),
  origin: token.sklop.origin,
  figma: token.sklop.figma ?? [],
  diverges: token.sklop.diverges ?? null,
  approved: token.sklop.approved ?? null,
  contrast: token.sklop.contrast ?? [],
  description: token.description,
});

export function readSource(root) {
  const read = (file) => JSON.parse(readFileSync(join(root, 'src', file), 'utf8'));
  return { ...read('primitive.tokens.json'), ...read('semantic.tokens.json') };
}

/** The committed files under generated/, as text. */
export function generateFiles(source) {
  const { css, json } = buildTokens(source);
  return { 'tokens.css': css, 'tokens.json': `${JSON.stringify(json, null, 2)}\n` };
}

/** Generated files that are missing or differ from a fresh build of `root`'s source. */
export function staleFiles(root) {
  const fresh = generateFiles(readSource(root));
  return Object.keys(fresh).filter((file) => {
    const path = join(root, 'generated', file);
    return !existsSync(path) || readFileSync(path, 'utf8') !== fresh[file];
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  if (process.argv.includes('--check')) {
    const stale = staleFiles(root);
    if (stale.length) {
      console.error(
        `@sklop/tokens: ${stale.map((file) => `generated/${file}`).join(', ')} does not match src/. Run pnpm --filter @sklop/tokens generate:tokens and commit the result.`,
      );
      process.exit(1);
    }
    console.log('@sklop/tokens: generated/ matches src/');
  } else {
    const files = generateFiles(readSource(root));
    mkdirSync(join(root, 'generated'), { recursive: true });
    for (const [file, text] of Object.entries(files))
      writeFileSync(join(root, 'generated', file), text);
    console.log(
      `@sklop/tokens: wrote ${Object.keys(files)
        .map((file) => `generated/${file}`)
        .join(', ')}`,
    );
  }
}
