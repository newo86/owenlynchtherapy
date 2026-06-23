# Server-First Rendering Audit — owenlynchtherapy.com (public site)

**Scope:** public marketing site only (NOT the `/admin` dashboard).
**Status:** read-only audit — no code was changed.
**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4, Sanity CMS, deployed on Vercel.

> Handoff note for Claude: this is an audit report. Do not change anything
> unless explicitly asked. If asked to optimise, propose a prioritised plan
> first and confirm before editing. The site is in production.

---

## ⚠️ Item 1 — Build route table & First Load JS (INCOMPLETE — needs a real build)

`next build` **could not be completed in the audit environment.** The
`/articles` and `/articles/[slug]` routes fetch Sanity at build time
(`generateStaticParams` + page-level `sanityClient.fetch`), and the audit
sandbox's network policy blocks the Sanity host. The project ID is env-only
(`NEXT_PUBLIC_SANITY_PROJECT_ID`, not committed), so it couldn't be pointed at
the real reachable host. The build **compiles and type-checks cleanly** — it
fails only at the "Collecting page data" step on the Sanity fetch, before the
route table prints. **Therefore the real First Load JS figures are not
available in this report.**

To capture the true table, run where Sanity is reachable (e.g. locally with the
real env, or in CI):

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=<real-id> NEXT_PUBLIC_SANITY_DATASET=production npm run build
```

### Static/Dynamic classification (determined from code, not the build)

Legend: ○ Static (prerendered) · ● SSG (prerendered via generateStaticParams) · ƒ Dynamic (server-rendered per request)

| Route | Predicted | Reason |
|---|---|---|
| `/` (home) | ○ Static | Server component; no dynamic APIs |
| `/about` | ○ Static | Pure server component |
| `/services` | ○ Static | Server component (WebGL globe is a client island) |
| `/faq` | ○ Static | Pure server component |
| `/adhd-therapy-dublin` | ○ Static | Pure server component |
| `/anxiety-therapy-dublin` | ○ Static | Pure server component |
| `/autism-therapy-dublin` | ○ Static | Pure server component |
| `/depression-therapy-dublin` | ○ Static | Pure server component |
| `/lgbtqia-therapy-dublin` | ○ Static | Pure server component |
| `/ocd-therapy-dublin` | ○ Static | Pure server component |
| `/relationship-therapy-dublin` | ○ Static | Pure server component |
| `/trauma-therapy-dublin` | ○ Static | Pure server component |
| `/articles` | ○ Static | Async server fetch (Sanity), no dynamic APIs; data baked at build |
| `/articles/[slug]` | ● SSG | Has `generateStaticParams` |
| `/payment-confirmed` | ○ Static | Static, `robots: noindex` |
| **`/contact`** | **ƒ Dynamic** ⚠️ | Reads `await searchParams` (post-submit success state) |
| **`/intake`** | **ƒ Dynamic** ⚠️ | `export const dynamic = 'force-dynamic'` |
| **`/unsubscribe`** | **ƒ Dynamic** ⚠️ | Reads `await searchParams` (opt-out token) |
| `/studio/[[...tool]]` | ƒ Dynamic | Sanity Studio (client app — expected) |

**Flagged dynamic pages:** `/contact`, `/intake`, `/unsubscribe`, `/studio`.

---

## Item 2 — `"use client"` components (public site)

| File | Reason it's a client component | Could be server? |
|---|---|---|
| `src/components/layout/Header.tsx` | `usePathname` + scroll state (`pastHero`) | No — interactive, global |
| `src/components/layout/Navigation.tsx` | `usePathname` for active link | No (trivial) |
| `src/components/ui/mobile-bottom-nav.tsx` | active-route nav | No |
| `src/components/ui/ScrollToTop.tsx` | scroll listener + visibility state | No |
| `src/components/sections/FaqAccordion.tsx` | open/close `useState` | **Maybe** — could be a zero-JS `<details>/<summary>` |
| `src/components/ui/AnimatedCard.tsx` | **framer-motion** (`motion.div`) | **Likely** — simple fade/rise; CSS keyframes could replace |
| `src/components/ui/ServiceCard.tsx` | **framer-motion** + `IntersectionObserver` + hover state | **Partly** — motion replaceable with CSS; used on homepage |
| `src/components/ui/pill-nav.tsx` | **framer-motion** nav | **Partly** |
| `src/components/ui/cobe-globe.tsx` | **WebGL globe (`cobe`)** | No — inherently client (only on `/services`) |
| `src/components/sections/PsychologyTodayBadge.tsx` | loads external PT seal script via effect | No |
| `src/components/intake/IntakeForm.tsx` | large stateful multi-step form | No |
| `src/app/(marketing)/unsubscribe/UnsubscribeForm.tsx` | button + fetch (opt-out) | No |
| `src/app/studio/[[...tool]]/StudioClient.tsx` | Sanity Studio | No |

---

## Item 3 — Forced-dynamic triggers (non-admin)

| Trigger | Location | Legitimate? |
|---|---|---|
| `export const dynamic = 'force-dynamic'` | `src/app/(marketing)/intake/page.tsx` | Yes — validates a per-visit token |
| `await searchParams` | `src/app/(marketing)/contact/page.tsx` | **Could be static** — only used to show post-submit message; movable to client state |
| `await searchParams` | `src/app/(marketing)/unsubscribe/page.tsx` | Inherent (per-link token) |
| `export const dynamic = 'force-dynamic'` | `src/app/api/webhooks/stripe/route.ts`, `src/app/api/reminders/unsubscribe/route.ts` | Yes — API routes |
| `cookies()` / `Cache-Control: no-store` | `src/app/api/auth/google/*`, `src/app/api/intake/*` | Yes — API routes, correctly dynamic |
| `export const revalidate` | none found | — |
| `draftMode()` | none found | — |
| `unstable_noStore()` | none found | — |

No `revalidate`, `draftMode`, or `unstable_noStore` anywhere.

---

## Item 4 — Edge runtime & middleware

- **Edge runtime:** none. No `export const runtime = 'edge'` anywhere — everything runs on the Node.js runtime.
- **Middleware:** **no `middleware.ts` / `middleware.js` exists.** Security headers (HSTS, CSP, X-Frame-Options, etc.) are set declaratively via `headers()` in `next.config.ts`, not via middleware.

---

## Item 5 — Images & fonts

- **`next/image`:** ✅ Used across the public site (6 importers). **Zero raw `<img>` tags.** Note: Unsplash images pass `unoptimized` (so they bypass the Image Optimizer).
- **`next/font`:** ✅ `Poppins` + `Montserrat` loaded via `next/font/google` in `src/app/layout.tsx` — self-hosted at build time, no runtime requests to Google Fonts. Headings reference `'Avenir'` only as a CSS `font-family` with Montserrat fallback (not a web-loaded font, so no extra request).

---

## Item 6 — Homepage First Load JS & heavy client libraries

- **Exact First Load JS for `/`:** not available (build did not finish — see Item 1).
- **Homepage composition:** clean server shell — `Hero`, `Services`, `AboutTeaser`, `HomeCta` are all **server components**. Client JS comes only from small islands (global `Header`, and `ServiceCard` within `Services`).
- **Heavy client libraries bundled:**
  - **`framer-motion` (v12)** — the main weight. Reaches the **homepage** through `ServiceCard` (used in the `Services` section), and also `AnimatedCard` (articles) and `pill-nav`. The animations it powers (fade-in, hover-rise, accent-line grow) are simple enough to reproduce in pure CSS, which would remove framer-motion from the homepage's First Load JS.
  - **`cobe` (v2, WebGL globe)** — heavier, but **isolated to `/services`** only; does not affect the homepage.
  - No other heavy UI kits / animation / charting libraries detected (no MUI, antd, GSAP, lottie, three.js, recharts, moment, lodash, etc.).

---

## Summary of opportunities (for a later optimisation pass — not yet actioned)

1. **`/contact` is dynamic only because it reads `searchParams`** for the post-submit confirmation. Moving that success state to the client (or a hash/route) would make `/contact` static.
2. **framer-motion on the homepage** (via `ServiceCard`) is the largest client-JS lever. Replacing the simple card animations with CSS would drop the library from the homepage bundle.
3. **`FaqAccordion`** could become a zero-JS native `<details>/<summary>` accordion.
4. `/intake` and `/unsubscribe` being dynamic is correct (token-driven) — leave as is.
5. Architecture is already strong: server-first pages, next/image + next/font, no edge runtime, no middleware, no sprawling client libraries.

_Generated as a read-only audit. To get the real route table + First Load JS numbers, run `next build` with valid Sanity env in an environment that can reach `*.sanity.io`._
