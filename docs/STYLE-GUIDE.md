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

Colour tokens live in the `@theme` block in `src/app/globals.css`
(`--color-forest`, `--color-sage`/`green`, `--color-orange`, `--color-gold`,
`--color-cream`, `--color-linen`).

---

## Voice

Warm, honest, human. No wellness buzzwords, no overclaiming, no promising
outcomes. Stigma-free, non-deficit language throughout.
