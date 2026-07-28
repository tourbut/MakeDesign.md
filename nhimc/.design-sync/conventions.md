# nhimc — 국민건강보험 일산병원 (NHIS Ilsan Hospital)

A public-hospital design system. Information legibility outranks visual impact;
accessibility outranks decoration.

## This is a token system — there are no components

`window.NhimcDS` is intentionally empty; there is no component library yet.
Build elements yourself with plain HTML/JSX and style them **only** from the CSS
custom properties below. There is no class vocabulary — do not invent one, and
do not reach for Tailwind/Bootstrap utility names; they will not resolve.

**Setup:** link `styles.css` (it pulls in the tokens plus the bundled Pretendard
and IBM Plex Mono woff2). No provider or wrapper needed. Dark theme is
`document.documentElement.setAttribute('data-theme','dark')` — both themes are
required, never ship only one.

## The two-colour rule (most important convention)

`--color-primary` (medical blue) is the **only** brand colour: primary CTAs,
active nav, section eyebrows, numeric metrics, focus rings.

`--color-accent` and `--color-error` are deliberately the **same value** (Ilsan
red). Red is a warning channel, never decoration — urgent calls, revoke actions,
errors. At most once or twice per screen. For emphasis, reach for
`--color-primary` or a surface change, never red.

## Token vocabulary (all that exists — 109 properties)

| Family | Names |
|---|---|
| Colour | `--color-` + `primary` `primary-hover` `primary-soft` `accent` `accent-soft` `secondary` `bg` `surface` `border` `text` `text-muted` `error` `success` `warning` `on-primary` `on-accent` |
| Type | `--type-<t>-size` `-weight` `-line` `-tracking`, `<t>` = `display-xl` `display-lg` `display-md` `display-sm` `title-md` `lead` `body-md` `body-sm` `caption` `caption-sm` `eyebrow` `badge` `button-md` `button-sm` `nav-link` `metric` `mono-tag` |
| Spacing | `--sp-` + `xs`4 `sm`8 `md`12 `base`16 `lg`24 `xl`32 `xxl`48 `section`64 |
| Radius | `--radius-` + `none` `xs` `sm`(buttons) `md`(cards) `full`(badges) |
| Elevation | `--shadow-sm` (cards) · `--shadow-md` (floating only) |
| Motion | `--motion-fast` `--motion-base` `--motion-max` `--motion-easing` |
| Other | `--font-sans` `--font-mono` `--container-max` (1120px) |

A type token is four properties, not one — apply all four:

```css
font-size: var(--type-body-md-size);
font-weight: var(--type-body-md-weight);
line-height: var(--type-body-md-line);
letter-spacing: var(--type-body-md-tracking);
```

`metric` and `mono-tag` also carry their own family — `--type-metric-family` /
`--type-mono-tag-family`, both IBM Plex Mono. `eyebrow` needs
`text-transform: var(--type-eyebrow-transform)`.

## Non-negotiable rules

- **Numbers use `metric`.** Any figure compared or sorted (counts, wait times,
  results) is IBM Plex Mono via `--type-metric-*`, so digits align.
- **Type stops at 44px** — `display-xl` is the ceiling, there is no larger step.
- **Touch targets ≥44px.** `button-sm` (34px) is the sole exception, desktop
  dense areas only.
- **Focus rings already ship** via a `:focus-visible` base rule (3px solid
  `--color-primary`, 2px offset). Never write `outline: none`.
- **Transitions ≤`--motion-max`** (300ms); a reduced-motion query already
  neutralises animation.
- **Depth = surface contrast + 1px `--color-border`**, not shadows. Most
  surfaces are flat; only cards get `--shadow-sm`.
- **Four states per screen**: loading (skeletons), empty (with a next action,
  never a dead end), error (cause + retry), success (toast, `role="status"`
  `aria-live="polite"`).
- **Grids collapse by column count only** (4→2→1 at 860px/560px), never reflow
  rows. Container caps at `--container-max`, centred.
- **Line length**: hero ≤18ch, lead ≤60ch, body ≤64ch — Korean text gets hard to
  track past these.

## Tokens that do NOT exist yet

No tokens for form inputs, tables/data grids, modals/scrims, chart palettes, or
icons. Compose these from the primitives above (surface + border + radius +
spacing) rather than inventing token names.

## Read before styling

- `styles.css` and its imports — the shipped values, always authoritative.
- `guidelines/design-tokens-reference.md` — every token with its rationale, plus
  responsive/accessibility specs and the full known-gaps list.
- `guidelines/DESIGN.md` — brand language and decision framework.
- `guidelines/ui-ux-guidelines.md` — state checklist and evaluation rubric.

## Idiomatic example

```jsx
<article style={{
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)', padding: 'var(--sp-lg)',
  boxShadow: 'var(--shadow-sm)',
}}>
  <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-muted)' }}>
    대기 인원
  </div>
  <div style={{
    fontFamily: 'var(--type-metric-family)', fontSize: 'var(--type-metric-size)',
    fontWeight: 'var(--type-metric-weight)', color: 'var(--color-primary)',
  }}>1,284</div>
</article>
```
