# nhimc design-sync notes

## Shape: tokens-only (`componentCount: 0`)

This DS has **no component library** — see Known Gap #8 in the token SSOT. The
converter's `tokensOnly` path handles this natively (`lib/source-kit.mjs`
returns it when no PascalCase exports are found and `cfg.cssEntry` is set), so
`_ds_bundle.js` is an empty-bodied IIFE and `components/` is absent. That is the
correct output, not a failure. When a component library eventually lands, the
shape changes to a normal package sync and every preview gets authored + graded.

## This repo has no package.json — the staging package is generated

`CLAUDE.md` forbids app code / `package.json` at the repo root, and the `<slug>/`
directory contract is fixed. The converter nevertheless needs a `PKG_DIR`, so
**`.design-sync/gen-sources.mjs` derives one** at `.design-sync/pkg/` from the
token SSOT on every run:

- `tokens.css` — all 109 custom properties + base layer, generated from the
  `design-system-reference-llms.txt` frontmatter. **Never edit it by hand**;
  change the SSOT and re-run.
- `fonts/` + `fonts.css` — the `@font-face` sheet `cfg.extraFonts` points at.
- `DESIGN.md`, `ui-ux-guidelines.md`, `design-tokens-reference.md` at package
  root → picked up by `guidelinesGlob: ["*.md"]` → `guidelines/` in the output.
- Mirrored to `.ds-sync/node_modules/nhimc-design-system/` because the converter
  resolves the package as `<--node-modules>/<cfg.pkg>`.

Nothing generated here is a new mirror to maintain by hand, so the source-set
sync rule in `CLAUDE.md` is not affected.

**Run order is mandatory**: `gen-sources.mjs` → `package-build.mjs` → `package-validate.mjs`.

## Fonts are network-fetched and cached outside git

The four Pretendard weights (400/500/600/700) and IBM Plex Mono (600/700) live
in `.design-sync/.cache/fonts/` — gitignored, ~3.1 MB. They are shipped rather
than CDN-linked so a rendered design never depends on reaching jsdelivr, and
because Korean falls back very visibly. A cold clone has an empty cache:
`gen-sources.mjs` then degrades to the CDN `@import` and validate warns
`[FONT_MISSING]`. Re-download with:

```sh
BASE=https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff2
for w in Regular Medium SemiBold Bold; do
  curl -sS --ssl-no-revoke -o ".design-sync/.cache/fonts/Pretendard-$w.woff2" "$BASE/Pretendard-$w.woff2"
done
for w in 600 700; do
  curl -sS --ssl-no-revoke -o ".design-sync/.cache/fonts/IBMPlexMono-$w.woff2" \
    "https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono@5/files/ibm-plex-mono-latin-$w-normal.woff2"
done
```

`--ssl-no-revoke` is required on this network — plain `curl` fails with
`CRYPT_E_NO_REVOCATION_CHECK`. It disables certificate *revocation* checking
only (the chain is still validated), and it is needed because the TLS
interception here presents a CA whose CRL/OCSP endpoint isn't reachable — the
same reason npm runs with `NODE_TLS_REJECT_UNAUTHORIZED=0` in this environment.

**Because transport is weakened, integrity is pinned instead:**
`gen-sources.mjs` holds a sha256 for each of the six files and **throws** on a
mismatch rather than shipping unreviewed bytes into every rendered design. If an
upstream release legitimately changes a file, review the new bytes and update
the pin — don't relax the check. Prefer restoring proper TLS (add the intercept
CA to the trust store) over keeping `--ssl-no-revoke` long-term.

Only the weights the token set references are shipped; Pretendard's other five
and IBM Plex Sans KR (a Pretendard fallback that never renders once Pretendard
ships) are deliberately excluded.

## Expected validate warnings

- `[RENDER_SKIPPED]` — run with `--no-render-check`. There are zero previews, so
  the render check has nothing to open. Not a new warn; do not chase it.

The visual check that *does* matter is `.design-sync/verify-tokens.mjs`, which
renders `ds-bundle/.verify-tokens.html` through the real `styles.css` closure and
asserts every token resolves and every shipped `@font-face` loads, in both
themes. Run it after any token change. Its 600 ms settle delay must stay above
`--motion-max` (300 ms) or it samples mid-transition colours.

## Conventions header

`.design-sync/conventions.md` is committed and human-editable; it is prepended
to the README and inlined into the design agent's system prompt. After any edit
to it or to the token set, run `.design-sync/check-conventions.mjs`, which
verifies every token name, guideline path, and the "bundle is empty" claim
against the actual build. It currently checks 109/109 defined properties.

## Known inconsistency in the source set (not fixed by this sync)

`generated/design-mockup.css` names spacing `--sp-1 … --sp-16` and radius
`--radius` (for md), while the token SSOT keys them `xs/sm/md/base/lg/xl/xxl/
section` and `none/xs/sm/md/full`. The shipped tokens follow the **SSOT** keys.
Same values, two vocabularies. Reconciling the mockup to the SSOT keys would
restore single-naming, but that edit touches the mockup and belongs to the
source-set sync workflow, not to a design-sync run.

## Re-sync risks

- **Cold cache silently downgrades fonts.** No cache + no network → CDN
  `@import` and `[FONT_MISSING]`. The build still succeeds, so check the warn.
- **`.design-sync/pkg/` and `.ds-sync/` are gitignored and regenerated.** A
  fresh clone must re-stage the converter scripts, `npm i` its deps
  (esbuild, ts-morph, @types/react, react, react-dom, playwright), and re-run
  `gen-sources.mjs` before building.
- **`gen-sources.mjs` parses the frontmatter with a purpose-built reader**, not
  a YAML library. It assumes the fixed format `CLAUDE.md` pins (2-space nesting,
  optional quotes). Changing that format breaks the build loudly — it throws
  rather than emitting partial tokens, which is intended.
- **Playwright chromium is machine state**, not in git. `verify-tokens.mjs`
  needs it; `npx playwright install chromium` in `.ds-sync/`.
- **Anchor:** `_ds_sync.json` carries `renderHashes: {}` because there are no
  components. Re-syncs therefore diff only styling/bundle hashes — correct for
  this shape, but it means a token change re-uploads the whole styling set.
