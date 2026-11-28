# Style Guide — Owen Lynch Psychotherapy

The visual system for the **public marketing site** (owenlynchtherapy.com).
The password-protected admin dashboard (`/admin`) uses its own separate,
denser styling in `src/components/admin/admin.css` and is intentionally **not**
governed by this guide.

---

## Typography

### Type scale

| Role | Size | Tailwind classes | Used for |
|------|------|------------------|----------|
| **Primary heading (H1)** | 40–48px | `text-4xl` → `text-5xl` | Hero titles, main page headers (once per page) |
| **Secondary heading (H2)** | 24–32px | `text-2xl` → `text-3xl` | Section titles, feature cards |
| **Body** | 16–18px | `text-base` → `text-lg` | Paragraphs, long-form reading, main UI labels, text inputs |
| **Utility** | 12–14px | `text-xs` → `text-sm` | Captions, timestamps, form hints, footer links, small-caps eyebrow labels |

### How the scale is implemented

- The scale is defined once in the **Tailwind v4 `@theme` tokens** in
  [`src/app/globals.css`](../src/app/globals.css). Tailwind's defaults already
  match the scale for most steps; only two are overridden:
  - `--text-4xl: 2.5rem;` (40px — was 36px)
  - `--text-3xl: 2rem;` (32px — was 30px)
  - `text-5xl` (48), `text-2xl` (24), `text-base` (16), `text-lg` (18),
    `text-sm` (14) and `text-xs` (12) are Tailwind defaults and need no override.
- The global **`body` base font-size is 16px** (`font-size: 1rem`) so any text
  without an explicit size class — including form inputs — reads as body copy.
- **Change the scale in `globals.css`, not per-component.** Editing the tokens
  ripples across every page that uses the utility classes.

### Conventions & exceptions

- Body paragraphs use `font-normal text-base ... leading-[1.8]`. Do **not** use
  `text-sm` for paragraph copy — that is reserved for utility text.
- Small-caps "eyebrow" labels (e.g. `GET IN TOUCH`, `ARTICLES & INSIGHTS`) use
  `text-sm font-semibold uppercase` and stay at 14px (utility band).
- Captions, the article meta row (date · read-time) and citation/reference
  lists stay at 12–14px as utility text.
- A few hero/section headings are intentionally hand-set above the H1/H2 caps
  with arbitrary values (e.g. `text-[52px]` hero, `text-[3rem]` section titles).
  These are deliberate bespoke sizes — leave them unless asked.

### Fonts

- **Headings:** Avenir Light / Montserrat (weight 300) fallback.
- **Body & nav:** Poppins.
- Font CSS variables are injected by `next/font` in `src/app/layout.tsx` and
  exposed as `--font-heading`, `--font-body`, `--font-montserrat`.

---

## Colour

| Token | Hex | Use |
|-------|-----|-----|
| Forest green | `#2A4D3C` | Primary background |
| Sage | `#4F8A68` | Secondary accent |
| Terracotta | `#C85A1A` | Accent / buttons only |
| Gold | `#D4A843` | Dividers / tile accents only |
| Linen | `#F5F0E8` | Light background |
| Cream | `#F9F7F2` | Light background (alt) |

**Dashboard primary button (`.admin-btn-primary`)** uses `#B04E16` (hover
`#9C4413`, pressed `#8A3B10`) instead of brand terracotta. White on `#C85A1A`
is 4.3:1, which fails WCAG AA for small text; `#B04E16` is 5.3:1. The public
site keeps `#C85A1A`.

Colour tokens live in the `@theme` block in `src/app/globals.css`
(`--color-forest`, `--color-sage`/`green`, `--color-orange`, `--color-gold`,
`--color-cream`, `--color-linen`).

---

## Voice

Warm, honest, human. No wellness buzzwords, no overclaiming, no promising
outcomes. Stigma-free, non-deficit language throughout.

## Sage Diary (dashboard)

The admin dashboard (not the public site) uses the "Sage Diary" look Owen
approved in Nov 2026. Spec: `docs/design/prototypes/`. Build notes and file
ownership: `docs/design/prototypes/IMPLEMENTATION.md`.

- **Tokens** are `--sd-*` CSS variables on `.admin-root` (src/components/admin/admin.css),
  mirrored in `sageDiary` (src/components/admin/theme.ts). Change both together.
- **Type:** Inter (next/font in `src/app/(admin)/layout.tsx` only). Inside the
  dashboard the old `--font-poppins` / `--font-montserrat` names resolve to Inter.
  Titles 700, body 400.
- **One primary button per screen**: soft yellow `--sd-action` with dark text
  (`--sd-on-action`). Never yellow text on a light card. Secondary = pale sage
  pill (`--sd-pill`). Destructive = `--sd-danger`.
- **Header band:** website sage `--sd-header` with the wave and split circle.
  White on it is 4.1:1, so only large bold text (19px+ bold or 24px+) goes on
  the band; small text goes in a pill or below it.
- **Nav (deep sage `--sd-rail`):** text `--sd-on-rail`; yellow on hover and when
  selected, selected is also bold. Hover/selected backgrounds are *darker*
  overlays (`--sd-rail-hover/-selected`), not lighter, to keep yellow at 4.5:1+.
- **Light rows and option tiles:** hover = soft yellow row (`--sd-action-soft`)
  and a full-yellow icon square; text stays dark.
- **No terracotta/orange anywhere in the dashboard** (Owen's TASTE.md). Needs
  attention = a soft-yellow dot (`--sd-art-yellow`) or `--sd-danger` text/tint;
  today = an ink ring, not a fill; unpaid tags and errors use `--sd-danger`.
  Checkboxes and radios are deep sage. Calendar quick-action bars are soft yellow
  for every event type. The one exception is the waiting-list email preview,
  which mirrors the real email's own button colour.
- **One yellow button per screen.** Everything else is `admin-btn-secondary`.
  Add-client style actions on pages that have their own main action (Hours,
  Waitlist) are not shown in the band.
- **Pop-ups** (`.admin-sheet`): deep-sage header, no eyebrow line, bold title.
- **Contrast checked (WCAG 2.1 AA):** ink on yellow 9.5 / hover 8.5 / active 7.6;
  rail text 6.3; yellow on rail 5.1, on rail hover 6.2, selected 7.1; ink-soft on
  page 6.5, on card 7.1, on soft-yellow row 6.5; ink on page 13.1; white on band
  4.1 (large text only); danger on card 6.3, white on danger 6.5. Adjusted: old
  muted `#6e7d72` (3.9) is now `#4B5A51`; prototype's light-overlay nav states
  (yellow 4.1 / 3.7) became dark overlays.
