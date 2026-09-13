#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { add } from '../src/add.mjs';

const HELP = `Usage: sklop add <component...> [--overwrite] [--cwd <dir>]

Copies component source (.tsx + .module.css) from the installed @sklop/react
into your app. Target folder: "componentsDir" in sklop.json (default src/components/sklop).`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    overwrite: { type: 'boolean', default: false },
    cwd: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

const [command, ...names] = positionals;

if (values.help || command !== 'add' || names.length === 0) {
  console.log(HELP);
  process.exit(values.help ? 0 : 1);
}

try {
  add(names, { cwd: values.cwd ?? process.cwd(), overwrite: values.overwrite });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
