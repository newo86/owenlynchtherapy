<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-context -->
# Owen Lynch Psychotherapy — Project Context

Custom website for owenlynchtherapy.com. Private psychotherapy practice, Dublin & online.

## Stack
- Next.js 16.2 (App Router) + TypeScript + Tailwind CSS
- Blog articles are typed repo content in src/content/articles (no CMS —
  Sanity was removed Jul 2026; publish by adding a content file + /ship)
- Supabase (Postgres) for the admin/intake data
- Resend (email), Stripe (payments), Google Calendar (two-way sync)
- Deployed on Vercel · repo: newo86/owenlynchtherapy

## Public site
Pages: Home, About, Services, Contact, FAQ. Blog in progress.

## Admin dashboard — handle with care
- Lives at /admin/intake, password-protected via INTAKE_ADMIN_SECRET
- Client intake forms, PDF generation, email receipts, session tracking, week calendar
- Do NOT rename or remove existing API routes (generate-token, submit,
  download-pdf, mark-attended, send-receipt, send-reminder, reminders/run,
  receipts, receipts/statement, mark-paid, reminders/unsubscribe, webhooks/stripe,
  auth/google, admin/calendar)
- Supabase tables clients, sessions, intake_submissions, intake_tokens already
  exist — don't recreate them
- Google Calendar is two-way: the app reads events for the week view AND writes
  back — sessions/clients created, rescheduled or deleted in-app push to the
  practice's primary calendar via createCalendarEvent / updateCalendarEvent /
  deleteCalendarEvent in src/lib/googleOAuth.ts (OAuth scope calendar.events).
  Exception: the reconcileCalendar sync job (src/lib/calendarSync.ts) is
  deliberately read-only toward Google — it only updates Supabase — to avoid
  sync loops; keep it that way.
- Run npm run build locally before pushing to catch TypeScript errors

## Working practices (learned from past sessions — follow these)
- **Ship flow:** `/check` → (`/preview` if UI is visible) → `/ship`. Never
  `sleep` blindly for CI — poll. After every squash merge, restart the working
  branch from origin/main before committing again.
- **UI changes:** show the user a `/preview` screenshot BEFORE shipping.
  History: 6 commits of hero-typography thrash in one day, 3 rounds on one
  dashboard banner — all avoidable with one screenshot first.
- **Database:** merging a PR never touches Supabase. Every schema change goes
  through `/db-migrate`; SQL must be idempotent and existence-guarded (a
  single 42P01 aborts the whole SQL-editor batch). Production can lag the
  repo — a missing migration caused a silent week-long reminder outage.
- **Practice facts** (availability, hours, fees, formats) live in
  `src/lib/siteConfig.ts`. Never infer them from page copy or old docs — they
  changed three times in one day once. If unknown, ask Owen.
- **Dates:** trust the environment's date (the SessionStart primer prints it
  in Europe/Dublin). Owen sees clients Mon/Tue/Fri — don't assume from
  marketing copy.
- **Docs drift is real:** OPERATIONS.md has been wrong before (sync direction,
  domain state). When code and docs disagree, verify against code/production,
  then fix the doc in the same PR.

## Current systems & gotchas — read docs/OPERATIONS.md
Full detail in **docs/OPERATIONS.md**. The must-knows:
- **Email kill switch:** all email flows through `getResend()` (src/lib/resend.ts)
  and only sends when env `EMAILS_ENABLED === 'true'`. Set it false + redeploy to
  pause everything instantly. (Follows a duplicate-email incident — treat email
  changes with care.)
- **Reminders:** daily cron `/api/admin/reminders/run` (06:00 UTC). Hardened:
  reconcile-with-Google first, one-per-session DB UNIQUE, hard cap 25, abort
  alerts to info@. Clients can opt out (`clients.reminders_opted_out`).
- **No receipt is ever emailed implicitly.** The one-tap "Session done" flow
  states its outcome up front; Stripe payments are the automatic path (webhook
  marks paid + emails receipt, rows show "Paid · Stripe"). PDFs/statements in
  the client record modal (src/lib/generateReceiptPDF.ts, IAHIP Reg. No. 1890).
- **Stripe webhook** points at the apex `https://owenlynchtherapy.com/api/webhooks/stripe`
  (apex is the primary domain since 2 Jul 2026; www 308-redirects to it; Stripe
  won't follow redirects, so never point it at a redirecting host).
- **Known latent bugs (unfixed):** (1) recurring-session time changes in Google
  don't reliably sync to the dashboard (conflict-resolver in calendarSync.ts is
  instance-id only); (2) deleting a client can leave ghost GCal events
  (deleteCalendarEvent 400 on recurring series).
- The build has no network dependencies and must pass fully everywhere
  (the old "fails at /articles page-data" sandbox quirk died with Sanity).

## Branding
- Colours: forest green #2A4D3C (primary bg), sage #4F8A68, terracotta #C85A1A
  (accent/buttons only), gold #D4A843 (dividers/tile accents only), linen #F5F0E8
- Fonts: Avenir Light / Montserrat 300 fallback for headings (weight 300);
  Poppins for body and nav
- Type scale (public site — see docs/STYLE-GUIDE.md for the full table):
  H1 40–48px (text-4xl–5xl), H2 24–32px (text-2xl–3xl), body 16–18px
  (text-base–lg, and the global `body` base is 16px), utility/captions 12–14px
  (text-xs–sm). The scale lives in the Tailwind v4 `@theme` tokens in
  src/app/globals.css; change it there, not per-component.
- Voice: warm, honest, human. No wellness buzzwords, no overclaiming, no
  promising outcomes. Stigma-free, non-deficit language throughout.
<!-- END:project-context -->
