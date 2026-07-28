#!/usr/bin/env node
// Generates the design-sync staging package from nhimc's own source set.
//
// Why this exists: design-sync's converter needs a PKG_DIR (a package.json +
// a stylesheet) to run. This repo is a document-authoring repo with no build
// and no package.json by design (CLAUDE.md). Rather than add one to the DS
// folder — which would break the documented `<slug>/` layout — everything the
// converter needs is DERIVED here, at build time, from the token SSOT.
//
// Nothing this emits is a new mirror to keep in sync by hand: re-running it
// after editing design-system-reference-llms.txt regenerates all of it.
//
// Usage: node .design-sync/gen-sources.mjs   (run from the nhimc/ directory)

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DS = resolve(HERE, '..');                    // nhimc/
const PKG = join(HERE, 'pkg');                     // nhimc/.design-sync/pkg/
const SSOT = join(DS, 'design-docs', 'design-system-reference-llms.txt');

// ── Minimal parser for the fixed frontmatter contract (CLAUDE.md pins the
// format: 2-space nested maps, values optionally quoted). Not a general YAML
// parser — it only needs to handle the shape this repo guarantees.
function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) throw new Error(`no --- frontmatter block in ${SSOT}`);
  const root = {};
  // stack[d] is the container that a line indented d*2 spaces writes into.
  const stack = [root];
  for (const raw of m[1].split('\n')) {
    if (!raw.trim() || /^\s*#/.test(raw)) continue;
    const indent = raw.length - raw.trimStart().length;
    if (indent % 2) throw new Error(`odd indent in frontmatter: ${raw}`);
    const depth = indent / 2;
    const line = raw.trim();
    const c = line.indexOf(':');
    if (c < 0) throw new Error(`no key on frontmatter line: ${raw}`);
    const key = line.slice(0, c).trim();
    let val = line.slice(c + 1).trim();
    const parent = stack[depth];
    if (parent === undefined) throw new Error(`dangling indent: ${raw}`);
    if (val === '') {
      const child = {};
      parent[key] = child;
      stack[depth + 1] = child;
      stack.length = depth + 2;
    } else {
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      parent[key] = val;
    }
  }
  return root;
}

const fm = parseFrontmatter(readFileSync(SSOT, 'utf8'));

const need = (k) => {
  const v = fm[k];
  if (!v || typeof v !== 'object') throw new Error(`frontmatter is missing the "${k}" map`);
  return v;
};
const colors = need('colors');
const colorsDark = need('colors-dark');
const typography = need('typography');
const rounded = need('rounded');
const spacing = need('spacing');
const shadow = need('shadow');
const motion = need('motion');

// Every dark key must exist in light, else a theme switch leaves a var stale.
for (const k of Object.keys(colorsDark)) {
  if (!(k in colors)) throw new Error(`colors-dark.${k} has no light counterpart`);
}
for (const k of Object.keys(colors)) {
  if (!(k in colorsDark)) throw new Error(`colors.${k} has no colors-dark counterpart`);
}

const SANS = typography['body-md']?.fontFamily;
const MONO = typography.metric?.fontFamily;
if (!SANS || !MONO) throw new Error('typography.body-md / typography.metric must define fontFamily');

// Pretendard's load URL is specified in the SSOT prose (## Typography → 로드).
const fontUrl = /https:\/\/\S+pretendard\S+\.css/.exec(readFileSync(SSOT, 'utf8'))?.[0];
if (!fontUrl) throw new Error('no Pretendard CDN URL found in the SSOT prose');

// Only the weights the token set actually references. Pretendard ships nine;
// the other five would triple the upload for glyphs nothing uses. IBM Plex
// Sans KR is deliberately absent — it is only Pretendard's fallback (SSOT
// ## Note on Font Substitutes), so it never renders once Pretendard ships.
const FONT_CACHE = join(HERE, '.cache', 'fonts');
// sha256 pins the exact bytes that were reviewed. The cache is refilled over
// the network (see NOTES.md — this network's TLS interception forces
// `curl --ssl-no-revoke`, which drops revocation checking), so transport alone
// is not something to trust for what ends up in every rendered design.
// A mismatch is fatal, never a warning.
const FONT_FACES = [
  { family: 'Pretendard', file: 'Pretendard-Regular.woff2', weight: 400, sha256: 'fad853f7f47c6c8b103171e7193fa095708cdcd70850a71d93aa5379e8a61d63' },
  { family: 'Pretendard', file: 'Pretendard-Medium.woff2', weight: 500, sha256: 'd03481330eeba0659ab5b87f25ceb504a35de377dd90a0d0aba2982eb2d05e2c' },
  { family: 'Pretendard', file: 'Pretendard-SemiBold.woff2', weight: 600, sha256: 'c863f76a7de5c1ddc1ed8b2fa794964530774592c4f31407a84e2a2ae93f17f0' },
  { family: 'Pretendard', file: 'Pretendard-Bold.woff2', weight: 700, sha256: '4609c3356e536fafe38f4add0daeceb3d8595d3057bce13c428c33ddbd43d362' },
  { family: 'IBM Plex Mono', file: 'IBMPlexMono-600.woff2', weight: 600, sha256: '0d1f0b8d0722224e32e9f28261bdc86c79115be73444ae5eceb73976a1bcdf83' },
  { family: 'IBM Plex Mono', file: 'IBMPlexMono-700.woff2', weight: 700, sha256: '4f84d86cfd060f4ded334358ff8a4c81d4db2ed5addd568359d693f44a87765a' },
];
// Shipping the woff2 beats the CDN @import: the rendered design no longer
// depends on the renderer being allowed to reach jsdelivr, and Korean
// letterforms fall back very visibly. Network is not a build dependency —
// a cold cache degrades to the CDN and a [FONT_MISSING] warn.
const faces = FONT_FACES.filter((f) => existsSync(join(FONT_CACHE, f.file)));
for (const f of faces) {
  const got = createHash('sha256').update(readFileSync(join(FONT_CACHE, f.file))).digest('hex');
  if (got !== f.sha256) {
    throw new Error(
      `font integrity check failed for ${f.file}\n  expected ${f.sha256}\n  got      ${got}\n` +
      'Delete the cached file and re-download per .design-sync/NOTES.md. ' +
      'If the upstream release legitimately changed, review the new bytes and update the pin.',
    );
  }
}
const hasPretendard = faces.filter((f) => f.family === 'Pretendard').length === 4;
if (faces.length !== FONT_FACES.length) {
  console.error(
    `[gen-sources] WARNING: ${faces.length}/${FONT_FACES.length} font files in ${FONT_CACHE}` +
    `${hasPretendard ? '' : ' — Pretendard incomplete, falling back to the CDN @import'}. ` +
    'validate will warn [FONT_MISSING]. Re-download per .design-sync/NOTES.md.',
  );
}

const L = [];
L.push('/* ============================================================');
L.push('   nhimc design tokens — GENERATED, do not edit by hand.');
L.push('   Source of truth: design-docs/design-system-reference-llms.txt');
L.push('   Regenerate: node .design-sync/gen-sources.mjs');
L.push('   ============================================================ */');
// With the woff2 shipped, cfg.extraFonts puts the @font-face into the
// styles.css closure — no external request. Without them, the CDN is the
// only way Pretendard reaches a rendered design.
if (!hasPretendard) L.push(`@import url("${fontUrl}");`);
L.push('');
L.push(':root {');
L.push('  /* Colors — light theme. Two-colour system: primary is the brand');
L.push('     voltage, accent === error is the warning channel (never decorative). */');
for (const [k, v] of Object.entries(colors)) L.push(`  --color-${k}: ${v};`);
L.push('');
L.push('  /* Font families */');
L.push(`  --font-sans: ${SANS};`);
L.push(`  --font-mono: ${MONO};`);
L.push('');
L.push('  /* Typography — 4-tier hierarchy, integer px only, no display step above 44px. */');
for (const [name, t] of Object.entries(typography)) {
  if (typeof t !== 'object') continue;
  if (t.fontSize) L.push(`  --type-${name}-size: ${t.fontSize};`);
  if (t.fontWeight) L.push(`  --type-${name}-weight: ${t.fontWeight};`);
  if (t.lineHeight) L.push(`  --type-${name}-line: ${t.lineHeight};`);
  if (t.letterSpacing) L.push(`  --type-${name}-tracking: ${t.letterSpacing};`);
  // Only emit family where it departs from --font-sans (the mono tokens).
  if (t.fontFamily && t.fontFamily !== SANS) L.push(`  --type-${name}-family: ${t.fontFamily};`);
  if (t.textTransform) L.push(`  --type-${name}-transform: ${t.textTransform};`);
}
L.push('');
L.push('  /* Spacing — 4px base */');
for (const [k, v] of Object.entries(spacing)) L.push(`  --sp-${k}: ${v};`);
L.push('');
L.push('  /* Radius */');
for (const [k, v] of Object.entries(rounded)) L.push(`  --radius-${k}: ${v};`);
L.push('');
L.push('  /* Elevation — two steps only; most surfaces are flat. */');
L.push(`  --shadow-sm: ${shadow.sm};`);
L.push(`  --shadow-md: ${shadow.md};`);
L.push('');
L.push('  /* Motion — never exceed --motion-max. */');
for (const [k, v] of Object.entries(motion)) {
  if (k === 'reduced-motion') continue; // prose rule, expressed as @media below
  L.push(`  --motion-${k}: ${v};`);
}
L.push('');
L.push('  /* Layout */');
L.push('  --container-max: 1120px;');
L.push('}');
L.push('');
L.push('[data-theme="dark"] {');
for (const [k, v] of Object.entries(colorsDark)) L.push(`  --color-${k}: ${v};`);
L.push(`  --shadow-sm: ${shadow['sm-dark']};`);
L.push(`  --shadow-md: ${shadow['md-dark']};`);
L.push('}');
L.push('');
L.push('/* ── Base layer ─────────────────────────────────────────────');
L.push('   Mirrors design-mockup.css: canvas, ink, and the 4-tier heading');
L.push('   scale. Kept deliberately small — this DS has no class vocabulary,');
L.push('   everything else is composed from the var(--*) tokens above. */');
L.push('body {');
L.push('  margin: 0;');
L.push('  font-family: var(--font-sans);');
L.push('  background: var(--color-bg);');
L.push('  color: var(--color-text);');
L.push(`  font-size: var(--type-body-md-size);`);
L.push(`  line-height: var(--type-body-md-line);`);
L.push('  transition: background var(--motion-base) var(--motion-easing), color var(--motion-base) var(--motion-easing);');
L.push('}');
for (const [el, tok] of [['h1', 'display-lg'], ['h2', 'display-md'], ['h3', 'display-sm']]) {
  L.push(`${el} {`);
  L.push(`  font-size: var(--type-${tok}-size);`);
  L.push(`  font-weight: var(--type-${tok}-weight);`);
  L.push(`  line-height: var(--type-${tok}-line);`);
  if (typography[tok]?.letterSpacing && typography[tok].letterSpacing !== '0') {
    L.push(`  letter-spacing: var(--type-${tok}-tracking);`);
  }
  L.push('  margin: 0;');
  L.push('}');
}
L.push('');
L.push('/* Accessibility floor — 3px focus ring on every interactive element.');
L.push('   `outline: none` is never used in this system. */');
L.push(':focus-visible {');
L.push('  outline: 3px solid var(--color-primary);');
L.push('  outline-offset: 2px;');
L.push('}');
L.push('');
L.push('@media (prefers-reduced-motion: reduce) {');
L.push('  *, *::before, *::after {');
L.push('    animation-duration: 0.01ms !important;');
L.push('    animation-iteration-count: 1 !important;');
L.push('    transition-duration: 0.01ms !important;');
L.push('  }');
L.push('}');
L.push('');

// ── Emit the staging package.
rmSync(PKG, { recursive: true, force: true });
mkdirSync(join(PKG, 'src'), { recursive: true });

writeFileSync(
  join(PKG, 'package.json'),
  `${JSON.stringify({ name: 'nhimc-design-system', version: '0.0.0', private: true }, null, 2)}\n`,
);
writeFileSync(join(PKG, 'tokens.css'), `${L.join('\n')}`);

// Copy the cached woff2 in and author the @font-face sheet cfg.extraFonts
// points at, so the faces land in the styles.css closure.
if (faces.length) {
  mkdirSync(join(PKG, 'fonts'), { recursive: true });
  const ff = [
    '/* @font-face — GENERATED by .design-sync/gen-sources.mjs.',
    '   Only the weights the token set references. */',
  ];
  for (const f of faces) {
    cpSync(join(FONT_CACHE, f.file), join(PKG, 'fonts', f.file));
    ff.push(
      '@font-face {',
      `  font-family: "${f.family}";`,
      '  font-style: normal;',
      `  font-weight: ${f.weight};`,
      '  font-display: swap;',
      `  src: url("./${f.file}") format("woff2");`,
      '}',
    );
  }
  writeFileSync(join(PKG, 'fonts', 'fonts.css'), `${ff.join('\n')}\n`);
}

// Guidelines the design agent should read. Copied to the package root (not
// referenced) so `guidelinesGlob: ["*.md"]` stays a plain package-relative
// glob and the emitted paths are `guidelines/<name>.md`, not nested.
for (const [from, to] of [
  [join(DS, 'DESIGN.md'), 'DESIGN.md'],
  [join(DS, 'design-docs', 'ui-ux-guidelines.md'), 'ui-ux-guidelines.md'],
]) {
  cpSync(from, join(PKG, to));
}
// The token SSOT itself is the most useful thing the design agent can read:
// it carries the "why" behind every value. Ship it as markdown.
writeFileSync(
  join(PKG, 'design-tokens-reference.md'),
  readFileSync(SSOT, 'utf8'),
);

// The converter resolves the package as `<--node-modules>/<cfg.pkg>`, so mirror
// the staging package there when the staged converter's node_modules exists.
// Copied rather than symlinked: junctions need extra privileges on Windows and
// this is regenerated on every run anyway.
const NM_MIRROR = resolve(DS, '.ds-sync', 'node_modules', 'nhimc-design-system');
if (existsSync(resolve(DS, '.ds-sync', 'node_modules'))) {
  rmSync(NM_MIRROR, { recursive: true, force: true });
  cpSync(PKG, NM_MIRROR, { recursive: true });
  console.error(`[gen-sources] mirrored to ${NM_MIRROR}`);
}

const nColors = Object.keys(colors).length;
const nType = Object.keys(typography).length;
console.error(
  `[gen-sources] ${PKG}: ${nColors} colors ×2 themes, ${nType} type tokens, ` +
  `${Object.keys(spacing).length} spacing, ${Object.keys(rounded).length} radius, 3 guideline docs`,
);
