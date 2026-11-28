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
- Old names (`--sage`, `--cream` ...) still exist; `--terracotta` is gone (warnings use `--sd-danger` / `--sd-art-yellow`) so current
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
- `/admin-demo?calendar=off` shows the "Google Calendar isn't connected" warning.
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

## Stage 2 (desktop, built Nov 2026)
Built to sage-diary-desktop.html (rail, band, two-column Today, session panel).
- **Rail** (`Sidebar.tsx` `DesktopSidebar`, `.admin-nav-btn` in admin.css): the
  seven prototype items only (Today, Calendar, Clients, Money, Forms, Waitlist,
  Settings at the foot), prototype icons (`sage/icons.tsx`). Settings stays lit
  on Hours. No profile menu any more. Rail hover/selected use the darker stage 1
  wash (not the prototype's white wash) so yellow stays above 4.5:1.
- **Today** (`Dashboard.tsx` desktop branch -> `DesktopToday.tsx`, styles in
  `desktop.css`, helpers `desktopToday.ts` + tests, `useFreeTimes.ts`): band
  "Today" + date + one yellow "Book next session" (the existing Schedule
  session modal, via `onSchedule`). Left: Today's clients (hover quick actions
  open the panel on that option), Free this week (chips book that time). Right:
  Needs a decision (count) = pay prompts + Google differences + followed from
  Google, each existing card in a `bare` variant with its own buttons/confirms;
  Clinic days (next five working days from Settings hours, today outlined).
- **Session panel** (`SessionPanel.tsx`): right-hand dialog with scrim, focus in,
  Tab kept inside, Escape closes, focus returns to the row. Status (reminder,
  paid, receipt), the client's page, Session done (`SessionDoneOptions`
  `variant="panel"`), Send reminder (opens the existing `SendReminderModal`),
  Mark as paid (no email), Email receipt (names the address; 409 re-send asks),
  Move or edit (existing `SessionEditModal`). Existing routes only.
- **Settings** (`SettingsHub.tsx`): tabs Practice | Hours | Account and privacy
  (Google Calendar connect/disconnect, privacy mode, two-factor, sign out moved
  here from the rail's profile menu). Tabs are hidden on a phone; the phone's
  More menu still opens `settings` and `hours` directly.
- **Forms** also holds the questionnaire tools and results (`Analytics`
  `embedded`, heading "Questionnaire results"). There is no Analytics rail
  item; the section id `analytics` remains only for the phone's More menu.
- **Removed from the desktop Today** (not in the prototype): Next up card
  (actions are row quick actions + panel), Accreditation card (Hours tab in
  Settings), "Today" list card, "Needs attention" counts (unpaid past
  sessions, receipts not sent, forms not returned, waitlist, unlinked events;
  all still reachable via Money, Calendar filters, Forms, Waitlist), "This week"
  summary. `TodayCards.tsx` is now unused on desktop.
- Demo: Orla has an unpaid Friday and Nora a session missing from Google, so
  Needs a decision shows several of each kind.

## Stage 2b: every desktop page (Nov 2026)
Calendar, Clients, Money, Forms, Waitlist and Settings follow the prototype on
desktop (>= 769px). Each page is `DesktopPage` (band + 1144px content column)
plus its own component; the phone keeps its old screens (stage 3). One session
panel for all pages: `useSessionPanel` + `SessionPanelHost` (AdminShell owns
it); rows are `DesktopSessionRow`. `DtDisclosure` keeps the old full-featured
sections reachable under a prototype-style page. Page gutters are 48px
(`--sd-pl/--sd-pr` in admin.css) so content lines up with the band title.
- **Calendar** (`DesktopCalendar.tsx`): month grid + chosen day's rows, previous
  / next month and Today as quiet buttons. Week view, list with filters, Google
  events and linking an event to a client: unchanged `SessionsList` under
  "Week view, Google events and filters". Differences with Google show on Today.
- **Clients** (`DesktopClients.tsx`): search + list; right: name line, three
  numbers, "Questionnaire results" (C-NIP-2 summary and change over time, values
  top six: `ClientQuestionnaireResults` in `Analytics.tsx`, same pieces as Forms),
  Coming up, and "Details and records" which opens the existing `ClientDetail`
  (contact details, notes, intake PDF, receipts and statement, How often,
  reminders opt-out, Completed, delete: all still there).
- **Money** (`DesktopMoney.tsx`): this month's Paid / Not paid yet / Sessions
  paid, Not paid yet rows (Mark paid opens the session panel on payment), How
  people paid (derived from sessions: Stripe payment recorded = Card (Stripe),
  low-cost client = Cash, anything else = Bank transfer / other; the payments
  ledger has no read route). No year-statement PDF exists (statements are per
  client), so the button leads to the income report and accountant CSV, which stay
  in full with the monthly chart, weekly report email and Revolut statement
  import under "Income report, monthly chart and statement import".
- **Forms** (`DesktopForms.tsx`): rows for Intake form (Send opens "Add a
  client", which makes and emails the intake link), Therapeutic agreement and
  Privacy policy (PDF), Values and Therapy preferences questionnaires (Send
  jumps to the existing "Send a questionnaire" panel with that one chosen; no
  blank PDF exists). Below: that panel, questionnaire results, intake forms
  received. `FormLibrary` is not used on desktop (its Open/Download are the
  Download PDF buttons).
- **Waitlist**: `Waitlist rows`: prototype rows with Mark contacted, Spam,
  Remove, plus the existing email-the-list, declined and spam lists. There is no
  "Offer a time" action in the app.
- **Settings** (`SettingsOverview.tsx`, `SettingsHub.tsx`): opens on an overview
  like the prototype (grouped rows, accreditation bars); each row/bar opens the
  Practice, Hours or Account tab where it is edited. Phone unchanged.
