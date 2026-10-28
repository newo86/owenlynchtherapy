# Where to look

Research when a decision depends on what is current. Check support before
using a newer CSS or JS feature: MDN, web.dev Baseline, or caniuse. Prefer
Baseline "widely available". Use "newly available" with a fallback. Treat
blog posts as leads, not proof.

## Galleries for composition and pattern ideas
- navbar.gallery: navigation, sorted by pattern type (sticky, dropdown,
  mega menu, sidebar, search, announcement, full screen, breadcrumbs).
  Browse the type you've already chosen (see foundations.md, Navigation).
- land-book.com: landing pages, filterable by industry, style and colour.
  Filter to the project's industry *and* to one unrelated one, so you see
  both the conventions and a way out of them. It blocks automated fetches,
  so ask Owen for screenshots or links of ones he likes.
- supahero.io: hero sections only, as screenshots with no text or tags.
  Fetching a page returns little, so it is useful only when Owen or a
  browser can look at it.
- Also: godly.website, siteinspire.com, awwwards.com, minimal.gallery,
  mobbin.com (real mobile app flows), refero.design

Study *why* a reference works (hierarchy, spacing, reading order), then
apply the principle. Never copy a layout wholesale.

## Owen's recommended sources
Two articles, already distilled into foundations.md, ux-testing.md and
discovery.md. Go back to them only for detail:
- [Complete Guide to Modern CSS in 2026](https://cssawwwards.com/blog/complete-guide-modern-css-2026)
  (cssawwwards.com). The same blog has one deep guide per feature (subgrid,
  cascade layers, View Transitions, fluid type, dark mode, `dvh`). Check its
  [index](https://cssawwwards.com/blog) when you need syntax for one of them.
- [The Complete Guide to Web Design and Development in 2026](https://nertia.io/resources/the-complete-guide-to-web-design-and-development-in-2026/)
  (nertia.io). It covers process, launch checks and handover, aimed at
  business sites. It gives no performance numbers, so take those from
  web.dev.

YouTube (search titles and descriptions, or use transcripts where available):

| Channel | Go-to for |
|---|---|
| Kevin Powell | CSS layout, spacing, modern CSS |
| Fireship | What's new and trending |
| Web Dev Simplified | Clear JS and React explanations |
| Theo Browne | TypeScript-first full stack, Next.js |
| Jack Herrington | React architecture, Server Components |
| ByteGrad | Production Next.js and TypeScript |
| Matt Pocock | Advanced TypeScript |
| The Net Ninja, Traversy Media, freeCodeCamp | Complete framework walkthroughs |
| Coding in Public | Real client-project workflow |
| ThePrimeagen | Performance and fundamentals |

Primary docs outrank all of these: the framework's own docs (in this repo,
`node_modules/next/dist/docs/`, per AGENTS.md), MDN, React docs, Apple HIG,
Material 3, WCAG 2.2.

## GitHub
Search for well-maintained design systems and component libraries to learn
structure from: Radix, shadcn/ui, Open Props, Every Layout's primitives,
Utopia (fluid type and space calculators), GOV.UK Design System (for
usability rigour).

## Network note
Cloud sessions only reach domains the environment allows. If a site fails
to resolve, say so and name the domain, so Owen can allow it in the
environment's network settings. Don't silently skip it.
