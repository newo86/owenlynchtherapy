<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-context -->
# Owen Lynch Psychotherapy — Project Context

Custom website for owenlynchtherapy.com. Private psychotherapy practice, Dublin & online.

## Stack
- Next.js 16.2 (App Router) + TypeScript + Tailwind CSS
- Sanity.io (headless CMS) for content
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

## Current systems & gotchas — read docs/OPERATIONS.md
Full detail in **docs/OPERATIONS.md**. The must-knows:
- **Email kill switch:** all email flows through `getResend()` (src/lib/resend.ts)
  and only sends when env `EMAILS_ENABLED === 'true'`. Set it false + redeploy to
  pause everything instantly. (Follows a duplicate-email incident — treat email
  changes with care.)
- **Reminders:** daily cron `/api/admin/reminders/run` (06:00 UTC). Hardened:
  reconcile-with-Google first, one-per-session DB UNIQUE, hard cap 25, abort
  alerts to info@. Clients can opt out (`clients.reminders_opted_out`).
- **Mark-paid never auto-sends a receipt** (decoupled). Receipts are manual:
  email button, or PDF download / statement in the client record modal
  (src/lib/generateReceiptPDF.ts, IAHIP Reg. No. 1890 on them).
- **Stripe webhook** must point at the host that serves 200 (the apex 307-redirects
  to www; Stripe won't follow redirects). `STRIPE_WEBHOOK_SECRET` must match that
  endpoint.
- **Known latent bugs (unfixed):** (1) recurring-session time changes in Google
  don't reliably sync to the dashboard (conflict-resolver in calendarSync.ts is
  instance-id only); (2) deleting a client can leave ghost GCal events
  (deleteCalendarEvent 400 on recurring series).
- Build in a sandbox fails only at `/articles` page-data (can't reach Sanity) —
  that's environment-only; it compiles + type-checks fine.

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
