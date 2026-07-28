#!/usr/bin/env node
// Verifies that every name conventions.md enumerates actually exists in the
// built output. A conventions header that names things which don't exist is
// worse than none — the design agent trusts it, writes vocabulary that never
// resolves, and ships silently unstyled UI.
//
// Re-run this on every re-sync: the header is committed and human-editable,
// so it can drift from the build without anyone noticing.
//
// Usage: node .design-sync/check-conventions.mjs [ds-bundle-dir]

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.argv[2] ?? join(HERE, '..', 'ds-bundle'));
const HEADER = join(HERE, 'conventions.md');

const md = readFileSync(HEADER, 'utf8');
const css = readFileSync(join(OUT, '_ds_bundle.css'), 'utf8');

// Every custom property the shipped stylesheet actually defines.
const defined = new Set([...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));

const problems = [];
const checked = new Set();
const expect = (name, where) => {
  checked.add(name);
  if (!defined.has(name)) problems.push(`${where}: ${name} is not defined in _ds_bundle.css`);
};

// ── 1. Literal full token names written anywhere in the header.
// Skips the two templated forms handled below (`--color-` bare, `--type-<t>-…`).
// Requires a letter right after `--`, so markdown rule/separator runs (`---`)
// never match. A trailing `-` means it's a template stem (`--color-` in the
// table, `--type-metric-*` in prose) — those are covered by the family checks.
for (const m of md.matchAll(/--[a-z][a-z0-9-]*/g)) {
  const n = m[0];
  if (n.endsWith('-')) continue;
  expect(n, 'literal');
}

// ── 2. The table's `PREFIX + a b c` shorthand rows.
const rows = [
  { prefix: '--color-', rx: /\| Colour \| `--color-` \+ (.+?) \|/ },
  { prefix: '--sp-', rx: /\| Spacing \| `--sp-` \+ (.+?) \|/ },
  { prefix: '--radius-', rx: /\| Radius \| `--radius-` \+ (.+?) \|/ },
];
for (const { prefix, rx } of rows) {
  const m = rx.exec(md);
  if (!m) { problems.push(`table row for ${prefix} not found — did the header format change?`); continue; }
  for (const c of m[1].matchAll(/`([a-z0-9-]+)`/g)) expect(prefix + c[1], `table ${prefix}`);
}

// ── 3. The type family: every `<t>` × every suffix.
const tRow = /\| Type \| `--type-<t>-size` `-weight` `-line` `-tracking`, `<t>` = (.+?) \|/.exec(md);
if (!tRow) problems.push('type table row not found — did the header format change?');
else {
  const tokens = [...tRow[1].matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]);
  if (tokens.length !== 17) problems.push(`type row lists ${tokens.length} tokens, expected 17`);
  for (const t of tokens) for (const s of ['size', 'weight', 'line', 'tracking']) {
    expect(`--type-${t}-${s}`, 'type table');
  }
}

// ── 4. Files the header tells the agent to read must be in the upload.
for (const m of md.matchAll(/`(guidelines\/[a-z0-9.-]+\.md|styles\.css)`/gi)) {
  if (!existsSync(join(OUT, m[1]))) problems.push(`referenced file missing from build: ${m[1]}`);
}

// ── 5. The header claims the bundle exports nothing — hold it to that.
const hdr = /^\/\* @ds-bundle: (.*) \*\//.exec(readFileSync(join(OUT, '_ds_bundle.js'), 'utf8').split('\n', 1)[0]);
const comps = hdr ? JSON.parse(hdr[1].replace(/\*\\\//g, '*/')).components : null;
if (!Array.isArray(comps)) problems.push('could not read the @ds-bundle header component list');
else if (comps.length && /window\.NhimcDS` is intentionally empty/.test(md)) {
  problems.push(`header says the bundle is empty but it exports ${comps.length} component(s)`);
}

// ── 6. Coverage the other way: a defined token family the header never names.
const families = new Set([...defined].map((n) => n.replace(/^(--[a-z]+)-.*$/, '$1')));
for (const f of families) {
  if (![...checked].some((c) => c.startsWith(`${f}-`))) {
    problems.push(`build defines ${f}-* tokens the header never mentions`);
  }
}

console.log(`checked ${checked.size} token names against ${defined.size} defined in _ds_bundle.css`);
if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('✓ every name in conventions.md verifies against the build');
