# Where to look

Research when a decision depends on what is current. Check support before
using a newer CSS or JS feature: MDN, web.dev Baseline, or caniuse. Prefer
Baseline "widely available". Use "newly available" with a fallback. Treat
blog posts as leads, not proof.

## Galleries for composition and pattern ideas
- navbar.gallery: navigation patterns
- land-book.com: landing pages by industry and style
- supahero.io: hero sections
- Also: godly.website, siteinspire.com, awwwards.com, minimal.gallery,
  mobbin.com (real mobile app flows), refero.design

Study *why* a reference works (hierarchy, spacing, reading order), then
apply the principle. Never copy a layout wholesale.

## Owen's recommended sources
Two articles: cssawwwards.com "complete guide to modern CSS 2026" and
nertia.io "complete guide to web design and development in 2026".

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
