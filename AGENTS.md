<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

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
Pages: Home, About, Services, Contact, FAQ, Privacy. Blog in progress.

## Platform / template (July 2026)
The repo doubles as a cloneable template for other therapists. Practice facts
live in src/practice.config.ts, editable at runtime via the dashboard
Settings page (practice_settings table merged over config defaults by
getPractice()). **To spin up a new practice, follow docs/ONBOARDING.md
step by step** — it is self-contained (accounts, migrations incl.
000_base_schema.sql, env vars, GDPR checklist, first-run tests). Owen's own
site is customer #1 and must keep working unchanged. Database design notes:
docs/DB-REVIEW.md. Plain-English history: docs/WHAT-WAS-DONE-PLATFORM.md.

## Admin dashboard — handle with care
- Lives at /admin/intake, password-protected via INTAKE_ADMIN_SECRET
- Client intake forms, PDF generation, email receipts, session tracking, week calendar
- Do NOT rename or remove existing API routes (generate-token, submit,
  download-pdf, mark-attended, send-receipt, send-reminder, reminders/run,
  receipts, receipts/statement, mark-paid, reminders/unsubscribe, webhooks/stripe,
  payment-prompts, payment-prompts/run, schedule-snapshot,
  auth/google, admin/calendar)
- Supabase tables clients, sessions, intake_submissions, intake_tokens already
  exist — don't recreate them
- **The app is the source of truth for the schedule; Google Calendar mirrors
  it (19 Nov 2026).** App changes (book, move, edit, cancel) push to the
  practice's primary calendar for that one session's event only
  (src/lib/googleSessionEvents.ts; a repeating series' stored id is resolved
  to the occurrence first, never the whole series). `reconcileCalendar`
  (src/lib/calendarSync.ts) only reads events and links sessions to the
  events they match. **Google may change a session in exactly two ways (27 Nov
  2026, src/lib/followGoogle.ts, run by the 5-minute sync):** it can CANCEL
  sessions linked to it by Google id (an occurrence, or a whole series,
  deleted or ended in Google), and it can change a linked series' FREQUENCY
  (weekly ↔ every 2–4 weeks: off-rhythm sessions cancelled, new in-between
  weeks added). Nothing else: never by title or name, never a past or
  non-scheduled session, never a move, never a new client or session from
  Google, never a write back to Google, never an email to a client. A
  truncated or failed read does nothing; only events Owen organised count;
  more than 10 cancellations in one run, or 15 in a rolling 24 hours, does
  nothing and alerts info@; every change is recorded in
  `calendar_followed_changes` and can be undone for 7 days. All other
  differences are found by src/lib/calendarDrift.ts and shown on the
  dashboard for the owner to resolve with a tap (src/lib/calendarFix.ts); a
  failed write from the last 7 days is retried automatically. Keep it that
  way: no job may import or move sessions from Google, or match Google events
  to sessions by name to change them (that is what made edits "sometimes"
  appear and left stale rows).

## Working practices (learned from past sessions — follow these)
- **Ship flow:** `/check` → (`/preview` if UI is visible) → `/ship`. The
  skills carry the details and the reasons.
- **Database:** merging a PR never touches Supabase — every schema change goes
  through `/db-migrate`. Production can lag the repo; a missing migration once
  caused a silent week-long reminder outage.
- **Practice facts** (availability, hours, fees, formats) live in
  `src/practice.config.ts`, overridden at runtime by the dashboard Settings
  page (`getPractice()`). Don't infer them from page copy or old docs — they
  changed three times in one day once. If unknown, ask Owen.
- **Security:** docs/SECURITY.md is the checklist. A hook
  (.claude/hooks/security-gate.sh) makes every session run the
  `security-guardian` agent on security-sensitive changes before pushing or
  finishing; act on what it reports, then run the script's `mark` step.
- **Skills:** creating or changing one follows the `writing-skills` skill.
- **Design work** (any site, app or page design) goes through the
  `design-partner` skill. Owen's house style (his design system for every project) is docs/design/HOUSE-STYLE.md; his taste log is docs/design/TASTE.md.
- **Dates:** trust the environment's date (the SessionStart primer prints it
  in Europe/Dublin). Owen sees clients Tue 4–8pm and Fri 3–7pm (Nov 2026;
  the rest is his day job, though he may book a lunchtime one-off) — don't
  assume from marketing copy; the live hours are in Settings.
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
- **Ongoing clients (Nov 2026):** weekly / fortnightly clients booked with no
  end have a `session_series` row; a daily job keeps ~16 weeks of sessions
  ahead (src/lib/sessionSeries.ts). Marking the client Completed ends it.
  "How often" in the client record changes the rhythm and updates Google
  (src/lib/seriesInterval.ts); a rhythm changed in Google is followed.
- **Calendar → client matching is strict (Sep 2026):** an event is only tied to
  a client if its title has their FULL name ("Session — Nora Invented") or a name
  part plus "session"/"client" ("Tom client"). A bare first name ("Walk
  Orla") never matches, and all-day events are never sessions — loose matching
  once turned personal events into sessions that emailed clients. One matcher
  (`matchOneActiveClient`) serves linking, difference detection and reminder
  confirmation.
- **Signing keys:** admin cookies and opt-out links are signed with keys derived
  from a server-only secret (`src/lib/signingKeys.ts`), never the admin
  password — so the password alone can't forge a session past 2FA.
- **Known latent bug (unfixed):** deleting a client can leave ghost GCal events
  (deleteCalendarEvent 400 on recurring series).

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
