#!/usr/bin/env node
// Renders ds-bundle/.verify-tokens.html in chromium and asserts the things
// only a browser can answer: do the shipped woff2 actually load, and does
// every token resolve to a value — in BOTH themes.
//
// Usage: node .design-sync/verify-tokens.mjs [ds-bundle-dir]

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.argv[2] ?? join(HERE, '..', 'ds-bundle'));
const SHOTS = join(OUT, '.verify-shots');
mkdirSync(SHOTS, { recursive: true });

// The fixture lives in .design-sync/ because package-build.mjs wipes the
// output dir; copy it in so it can reach styles.css by relative path.
copyFileSync(join(HERE, 'verify-tokens.html'), join(OUT, '.verify-tokens.html'));

const { chromium } = await import(
  new URL('../.ds-sync/node_modules/playwright/index.mjs', import.meta.url).href
);
const { serveDir } = await import(
  new URL('../.ds-sync/storybook/http-serve.mjs', import.meta.url).href
);

const { srv, port } = await serveDir(OUT);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });

const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()} — ${r.failure()?.errorText}`));

await page.goto(`http://127.0.0.1:${port}/.verify-tokens.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

for (const theme of ['light', 'dark']) {
  await page.evaluate((t) => {
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }, theme);
  // Must exceed motion.max (300ms) — the body transitions background/color,
  // so a shorter wait samples a mid-transition colour and reports a false miss.
  await page.waitForTimeout(600);
  await page.evaluate(() => window.refreshLabels?.());

  const report = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const val = (n) => cs.getPropertyValue(n).trim();
    const COLORS = ['primary', 'primary-hover', 'primary-soft', 'accent', 'accent-soft', 'secondary',
      'bg', 'surface', 'border', 'text', 'text-muted', 'error', 'success', 'warning', 'on-primary', 'on-accent'];
    const TYPE = ['display-xl', 'display-lg', 'display-md', 'display-sm', 'title-md', 'lead', 'body-md',
      'body-sm', 'caption', 'caption-sm', 'eyebrow', 'badge', 'button-md', 'button-sm', 'nav-link', 'metric', 'mono-tag'];
    const missing = [];
    for (const c of COLORS) if (!val(`--color-${c}`)) missing.push(`--color-${c}`);
    for (const t of TYPE) for (const s of ['size', 'weight', 'line']) {
      if (!val(`--type-${t}-${s}`)) missing.push(`--type-${t}-${s}`);
    }
    for (const s of ['xs', 'sm', 'md', 'base', 'lg', 'xl', 'xxl', 'section']) {
      if (!val(`--sp-${s}`)) missing.push(`--sp-${s}`);
    }
    // Is the body actually PAINTED in Pretendard, not just declaring it?
    const loaded = [...document.fonts].map((f) => `${f.family}@${f.weight}:${f.status}`);
    return {
      missing,
      bg: getComputedStyle(document.body).backgroundColor,
      color: getComputedStyle(document.body).color,
      pretendard400: document.fonts.check('400 16px Pretendard'),
      pretendard700: document.fonts.check('700 16px Pretendard'),
      plexMono700: document.fonts.check('700 14px "IBM Plex Mono"'),
      loaded,
    };
  });

  console.log(`\n── ${theme} ─────────────────────────────`);
  console.log(`body background : ${report.bg}`);
  console.log(`body color      : ${report.color}`);
  console.log(`Pretendard 400  : ${report.pretendard400 ? 'LOADED' : 'MISSING'}`);
  console.log(`Pretendard 700  : ${report.pretendard700 ? 'LOADED' : 'MISSING'}`);
  console.log(`IBM Plex Mono700: ${report.plexMono700 ? 'LOADED' : 'MISSING'}`);
  console.log(`faces registered: ${report.loaded.join(', ') || '(none)'}`);
  if (report.missing.length) {
    problems.push(`[${theme}] unresolved tokens: ${report.missing.join(', ')}`);
  }
  if (!report.pretendard400 || !report.pretendard700 || !report.plexMono700) {
    problems.push(`[${theme}] a shipped font face did not load`);
  }

  await page.screenshot({ path: join(SHOTS, `tokens-${theme}.png`), fullPage: true });
}

await browser.close();
srv.close();

console.log(`\nscreenshots → ${SHOTS}`);
if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\n✓ all tokens resolve and every shipped font face loaded, in both themes');
