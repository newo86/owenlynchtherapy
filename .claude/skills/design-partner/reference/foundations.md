# Foundations: build the system before the pages

Every visual value a page uses comes from a token, and every repeated
pattern comes from a component. A fix then happens once, in one place, and
no session spends effort re-deriving a colour or a gap.

## Order

1. **Tokens.** These are the single source of truth. In a Tailwind v4
   project, that means `@theme` in the global CSS. For anything else, use
   CSS custom properties on `:root`. If there's a Figma file, mirror the
   tokens as Figma variables with the same names.
   - Colour: semantic roles (`surface`, `text`, `text-muted`, `accent`,
     `border`, `focus`) mapped onto a raw palette. Use OKLCH. Give light and
     dark values when a dark theme is in scope.
   - Type: a modular scale (ratio 1.2–1.333 for product UI, up to 1.5 for
     expressive brand heroes). Make it fluid with `clamp()`, so headings
     grow with the viewport and need no breakpoint overrides. Body 16–18px
     on the web (never below 16px on mobile, where iOS zooms smaller inputs),
     line-height about 1.5 for body and 1.1–1.25 for headings, measure
     60–75ch. Use `text-wrap: balance` on headings and `pretty` on
     paragraphs.
   - Space: one scale on a 4px base (4, 8, 12, 16, 24, 32, 48, 64, 96, 128).
     Section spacing is fluid with `clamp()`. Name the steps (`--space-s`,
     `--space-l`). Don't name them after pixel values.
   - Radius, shadow/elevation, motion durations and easings, z-index layers,
     breakpoints and container widths.
2. **Assets.** Logo variants, icon set (one family, one stroke weight),
   photography direction and treatment, favicons and OG images. Assets live
   in one folder with a naming convention.
3. **Components.** Build primitives (Button, Link, Input, Stack, Cluster,
   Container, Section, Card only if earned) before compositions (Header,
   Hero, Footer). Each has its states: hover, focus-visible, active,
   disabled, loading, error, empty. Layout primitives own spacing, so
   components carry no outer margins. *Why: margins on components are the
   main cause of spacing that has to be re-fixed page by page.*
4. **Style guide page.** A living page that renders every token and
   component. It is what Owen approves, and what drift is checked against.
   In this repo, docs/STYLE-GUIDE.md describes the system; keep it true.
5. **Pages,** composed only from the above.

## Spacing rules that carry most of the quality

- Proximity: space inside a group is smaller than space between groups.
  Heading-to-its-text should be tighter than text-to-next-section.
- Rhythm: vary section spacing on purpose (tight, generous, tight). Equal
  gaps everywhere read as a template.
- Optical alignment beats mathematical. Nudge icons, quotes and rounded
  shapes until they *look* aligned.
- Touch targets are at least 44×44 (iOS) or 48×48dp (Android/Material),
  with 8px or more between them.
- Use `gap` in flex and grid rather than margins between siblings. Use
  logical properties (`margin-inline`, `padding-block`). Use container
  queries for components that live in different widths.

## Native CSS that keeps the system small

Reach for the platform before JavaScript or a library. Check each feature's
Baseline status first (see [research.md](research.md)): several of these do
nothing silently when unsupported, so the page has to read correctly
without them.

- **Cascade layers.** Declare the order once (`@layer reset, base,
  components, utilities;`) so later layers win whatever the specificity, and
  `!important` is never needed. Tailwind v4 already declares its own layers.
  Put custom CSS inside them. *Why: unlayered styles beat every layer, so a
  stray unlayered rule quietly overrides the system.*
- **Derived colours.** Generate hover, tint and border shades from the base
  token with `color-mix(in oklch, var(--accent) 80%, white)` or relative
  colour (`oklch(from var(--accent) calc(l + 0.1) c h)`). Don't hand-pick
  each shade. Changing one brand value then updates every derivative.
- **Subgrid** (`grid-template-columns: subgrid`) lines up titles, bodies and
  footers across a row of cards without fixed heights.
- **`:has()`** styles a parent from its contents or state (a field group
  holding an invalid input, a card with or without an image). This replaces
  JS-toggled classes.
- **Native nesting** and **`@scope`** keep component styles local without a
  preprocessor.
- **Motion:** View Transitions for page or state changes, and scroll-driven
  animations (`animation-timeline: view()`) for reveals instead of scroll
  listeners. Gate both behind `@supports` and `prefers-reduced-motion`.
  For a therapy audience, keep motion slow, small and optional.

## Navigation

Pick the lightest pattern the content needs. A static or sticky bar suits
a handful of pages. Use dropdowns only when there is a real hierarchy. A
mega menu is only for large link sets. Breadcrumbs are for deep
structures. An announcement strip carries one message at a time, not a
permanent banner. Full-screen menus suit visually led brand sites, and on
phones they are often just the mobile menu. Keep the primary action visible
in the bar at every width.

## Project structure (Next.js example)

```
src/
  styles/ or app/globals.css   tokens (@theme), base, fonts
  components/ui/               primitives
  components/                  compositions
  app/(site)/style-guide/      living style guide (noindex)
public/ or src/assets/         logo, icons, images
docs/STYLE-GUIDE.md            the system in words
docs/design/TASTE.md           Owen's taste
```

For mobile apps (Expo/React Native), keep the same token names in a
`theme.ts`. Respect safe areas, platform conventions (Apple HIG, Material 3)
and dynamic type sizes.
