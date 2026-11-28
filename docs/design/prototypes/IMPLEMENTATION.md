# Sage Diary: implementation notes (stage 1 foundation, Nov 2026)

Spec = the two HTML prototypes + README here. Stage 1 (this) is the shared
foundation; stages 2-4 build on it in parallel. Rules and contrast figures:
"Sage Diary (dashboard)" in docs/STYLE-GUIDE.md.

## Tokens
- CSS: `--sd-*` on `.admin-root` in `src/components/admin/admin.css`
  (page, card, header, on-header, rail, on-rail, ink, ink-soft, pill, line, paid,
  action, action-hover, action-active, on-action, action-soft, danger,
  danger-soft, art-blue/yellow/cream/dot, scrim, shadow, rail-hover,
  rail-selected, radius-card/btn/tile). Font: `--font-sans` (Inter).
- TS: `sageDiary` in `src/components/admin/theme.ts` (same names, camelCase) for
  inline styles. `btnPrimary` there is now yellow.
- Old names (`--sage`, `--cream`, `--terracotta` ...) still exist so current
  screens work; `--ink` / `--ink-muted` now point at the new ink tokens.
- No dark mode yet (prototype has one; not in scope).

## Shared components (`src/components/admin/sage/`, styles in `sage.css`)
- `SageHeaderBand` {title, subtitle?, action?}: sage band, wave, split circle.
  First child of `.admin-main`; runs edge to edge via `--sd-pt/-pl/-pr`.
- `SplitCircle`: the art alone (also the rail logo).
- `SageButton` {variant: primary|secondary|danger, large}: `.sd-btn*`.
  (The existing `.admin-btn-primary/-secondary` are restyled the same.)
- `SageNavItem` {label, icon, current, onClick}: rail/tab item, `.sd-nav-item`.
  Current Sidebar still uses `.admin-nav-btn` / `.admin-tab`, styled to match.
- `SageOptionTile` {title, hint, icon, danger, onClick, trailing}: `.sd-option`.
- `.sd-row-hover` (+ `.is-selected`): soft-yellow row hover for any list row.

Already applied: AdminShell (band on every non-Today section), Dashboard
(desktop band; phone band above the banners), Sidebar/tab bar/More sheet/
profile menu colours, MobileHome (its own header removed: the band is rendered
by Dashboard's phone branch). Layouts and navigation are unchanged.

## Demo harness (dev only)
- `npm run dev`, open `/admin-demo` (real AdminShell, no login, no DB). Resize
  to <=768px (or 390x844 in Playwright) for the phone layout. Single-card
  previews moved to `/admin-demo/parts`.
- Fixtures: `demoWorld.ts` (clients, Tue/Fri sessions, events, drift, prompts,
  settings, router `demoRoute`) + `demoData.ts`. Add an endpoint by adding a
  `case` in `demoRoute`. Unknown endpoints return 404 (never the network);
  writes are accepted and ignored.
- "Now" is shifted to Tuesday 15:20 of the current week (`demoClock.ts`), so
  Today has three clients and Friday is later this week.
- Gate: `demoGate.ts` `isDemoAllowed` = NODE_ENV development AND path under
  `/admin-demo`; `setDemoHandler` (api.ts) and `adminFetch` re-check it. The
  pages call `notFound()` outside development. Tests: `demo.test.ts`.
- Screenshots: hide `nextjs-portal`, deviceScaleFactor 2.

## Who owns what (to avoid clashes)
- **Stage 2, desktop Today:** `Dashboard.tsx` (desktop branch), `TodayCards.tsx`,
  desktop rail in `Sidebar.tsx` (`DesktopSidebar`, `.admin-sidebar*`), session
  side panel.
- **Stage 3, phone app:** `MobileHome.tsx`, phone parts of `Sidebar.tsx`
  (`MobileTabBar`, `.admin-tab*`), new phone tab bar/screens, swipe actions;
  the phone branch in `Dashboard.tsx` (band + banners) only to re-wire it.
- **Stage 4, client pages + More hub:** `ClientDetail.tsx`, `ClientsList.tsx`,
  the More hub and the Money / Forms / Waitlist / Settings entry points
  (`Revenue`, `FormsTable`/`FormLibrary`, `Waitlist`, `SettingsPanel`).
- **Shared, change with care (tell the lead):** `admin.css` tokens block,
  `theme.ts`, `sage/*`, `demoWorld.ts` (append fixtures, don't reshape).
