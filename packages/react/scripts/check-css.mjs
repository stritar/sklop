#!/usr/bin/env node
// Component CSS rules: logical properties only, and no raw colour, px or time outside a var() fallback.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

const SIDE = { left: 'inline-start', right: 'inline-end', top: 'block-start', bottom: 'block-end' };
const CORNER = {
  'top-left': 'start-start',
  'top-right': 'start-end',
  'bottom-left': 'end-start',
  'bottom-right': 'end-end',
};
const SIDES = Object.keys(SIDE);

const PHYSICAL_PROPERTIES = new Set([
  ...SIDES,
  ...['width', 'height'].flatMap((size) => [size, `min-${size}`, `max-${size}`]),
  ...['margin', 'padding', 'scroll-margin', 'scroll-padding'].flatMap((p) =>
    SIDES.map((side) => `${p}-${side}`),
  ),
  ...SIDES.flatMap((side) => ['', '-width', '-style', '-color'].map((p) => `border-${side}${p}`)),
  ...Object.keys(CORNER).map((corner) => `border-${corner}-radius`),
]);
/** Shorthands whose four-value form sets each physical side. */
const FOUR_SIDED = new Set([
  'margin',
  'padding',
  'inset',
  'scroll-margin',
  'scroll-padding',
  'border-width',
  'border-style',
  'border-color',
]);
const COLOR_FUNCTIONS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
  'color-mix',
  'light-dark',
]);
const NAMED_COLORS = new Set(
  'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'.split(
    ' ',
  ),
);
/** Properties whose words are names (fonts, grid areas, animations), never colours. */
const NAME_VALUED =
  /^(font|font-family|grid(-.+)?|animation(-name)?|view-transition-name|container(-name)?|counter-(reset|increment|set)|list-style(-type)?|will-change|transition(-property)?)$/;
const RAW_UNITS = new Set(['px', 'ms', 's']);
const HEX = /^#[0-9a-f]{3,8}$/i;
const TOKEN_NAME = /^--_?sk-[a-z0-9]+(-[a-z0-9]+)*$/;

function logicalName(prop) {
  if (SIDE[prop]) return `inset-${SIDE[prop]}`;
  const size = prop.match(/^(min-|max-)?(width|height)$/);
  if (size) return `${size[1] ?? ''}${size[2] === 'width' ? 'inline-size' : 'block-size'}`;
  const corner = prop.match(/^border-(top-left|top-right|bottom-left|bottom-right)-radius$/);
  if (corner) return `border-${CORNER[corner[1]]}-radius`;
  const [, base, side, part = ''] = prop.match(
    /^(.+)-(left|right|top|bottom)(-width|-style|-color)?$/,
  );
  return `${base}-${SIDE[side]}${part}`;
}

const values = (nodes) => nodes.filter((n) => ['word', 'function', 'string'].includes(n.type));
const isVar = (node) => node.type === 'function' && node.value.toLowerCase() === 'var';

function checkWord(word, prop, report, insideFallback) {
  const lower = word.toLowerCase();
  if (lower === 'left' || lower === 'right') {
    report('physical-keyword', `"${word}" is physical; use start or end`);
  } else if (prop === 'resize' && (lower === 'horizontal' || lower === 'vertical')) {
    report(
      'physical-keyword',
      `resize: ${word} is physical; use ${lower === 'horizontal' ? 'inline' : 'block'}`,
    );
  }
  if (insideFallback) return;
  if (HEX.test(word) || (!NAME_VALUED.test(prop) && NAMED_COLORS.has(lower))) {
    report('raw-color', `${word} is a raw colour; use a --sk-color-* token`);
    return;
  }
  const unit = valueParser.unit(word);
  if (unit && RAW_UNITS.has(unit.unit.toLowerCase())) {
    report('raw-unit', `${word} is a raw ${unit.unit}; use a --sk-* token`);
  }
}

function checkVar(node, prop, report, insideFallback) {
  const name = node.nodes.find((n) => n.type === 'word')?.value ?? '';
  if (!TOKEN_NAME.test(name)) {
    report('var-name', `var(${name}) must read a --sk-* token or a generated --_sk-* property`);
  }
  const comma = node.nodes.findIndex((n) => n.type === 'div' && n.value === ',');
  const fallback = comma === -1 ? [] : values(node.nodes.slice(comma + 1));
  if (!fallback.length) {
    report('var-fallback', `var(${name}) needs a fallback chain that ends in a literal`);
    return;
  }
  // A fallback that is only another var() must itself end in a literal; anything else is the literal.
  const literal = !(fallback.length === 1 && isVar(fallback[0]));
  walk(node.nodes.slice(comma + 1), prop, report, insideFallback || literal);
}

function walk(nodes, prop, report, insideFallback) {
  for (const node of nodes) {
    if (node.type === 'word') {
      checkWord(node.value, prop, report, insideFallback);
    } else if (node.type === 'function') {
      const name = node.value.toLowerCase();
      if (name === 'url') continue;
      if (name === 'var') {
        checkVar(node, prop, report, insideFallback);
        continue;
      }
      if (!insideFallback && COLOR_FUNCTIONS.has(name)) {
        report('raw-color', `${name}() is a raw colour; use a --sk-color-* token`);
      }
      walk(node.nodes, prop, report, insideFallback);
    }
  }
}

function checkDeclaration(decl, report) {
  const prop = decl.prop.toLowerCase();
  if (prop.startsWith('--sk-')) {
    report(
      'public-token',
      `${decl.prop} is a public token; component CSS reads it and never declares it`,
    );
  } else if (prop.startsWith('--') && !prop.startsWith('--_sk-')) {
    report('var-name', `${decl.prop}: components declare only generated --_sk-* properties`);
  } else if (PHYSICAL_PROPERTIES.has(prop)) {
    report('physical-property', `${decl.prop} is physical; use ${logicalName(prop)}`);
  }

  const { nodes } = valueParser(decl.value);
  if (FOUR_SIDED.has(prop) && values(nodes).length === 4) {
    report(
      'physical-shorthand',
      `four-value ${decl.prop} sets physical sides; use ${prop}-block and ${prop}-inline`,
    );
  }
  if (prop === 'border-radius') {
    const slash = nodes.findIndex((n) => n.type === 'div' && n.value === '/');
    const radii = slash === -1 ? [nodes] : [nodes.slice(0, slash), nodes.slice(slash + 1)];
    if (radii.some((part) => values(part).length > 1)) {
      report(
        'physical-shorthand',
        'border-radius with several values sets physical corners; use border-*-*-radius',
      );
    }
  }
  walk(nodes, prop, report, false);
}

/** Every rule break in one stylesheet, with its position. */
export function checkCss(css, file) {
  const problems = [];
  const root = postcss.parse(css, { from: file });
  const reporter = (node) => (rule, message) =>
    problems.push({
      file,
      line: node.source.start.line,
      column: node.source.start.column,
      rule,
      message,
    });

  root.walkDecls((decl) => checkDeclaration(decl, reporter(decl)));
  root.walkAtRules(/^(media|container)$/i, (atRule) => {
    walk(valueParser(atRule.params).nodes, '', reporter(atRule), false);
  });
  return problems;
}

/** The stylesheets the check covers: component CSS Modules only, never fixtures. */
export function listComponentCss(componentsDir) {
  if (!existsSync(componentsDir)) return [];
  return readdirSync(componentsDir, { recursive: true })
    .filter((file) => file.endsWith('.module.css'))
    .sort()
    .map((file) => join(componentsDir, file));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const componentsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components');
  const files = listComponentCss(componentsDir);
  const problems = files.flatMap((file) =>
    checkCss(readFileSync(file, 'utf8'), relative(process.cwd(), file)),
  );
  for (const p of problems)
    console.error(`${p.file}:${p.line}:${p.column}  ${p.rule}  ${p.message}`);
  if (problems.length) process.exit(1);
  console.log(`@sklop/react CSS: ${files.length} component stylesheet(s) pass`);
}
