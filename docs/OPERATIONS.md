# Operations & current state

Snapshot of how the live systems work and what to watch out for, so a fresh
session can pick up without re-discovering everything. Pairs with AGENTS.md
(loaded automatically) and docs/STYLE-GUIDE.md (public-site design).

Repo: `newo86/owenlynchtherapy` · deploy: push to `main` → Vercel production.

---

## Email — master kill switch

All outgoing email flows through `getResend()` in `src/lib/resend.ts`, which
has a **kill switch**: email only sends when the env var **`EMAILS_ENABLED === 'true'`**.
Anything else (unset/false) silently blocks every send.

- **Pause ALL email instantly:** set `EMAILS_ENABLED=false` in Vercel (or delete it) and redeploy.
- Sender: Resend, key in `RESEND_API_KEY`. (Rotated once after an incident — if email 401s, the key was revoked; create a new one and update the env + redeploy.)
- This switch gates reminders, receipts, intake emails, contact-form emails, and the Stripe-webhook receipt.

## Reminders (automatic)

- Daily Vercel cron **`/api/admin/reminders/run` at `0 6 * * *` (06:00 UTC ≈ 07:00 Dublin)**, see `vercel.json`.
- Sends **one reminder per client for that day's scheduled sessions** (Dublin time). Session time shown is Dublin-correct (stored UTC → rendered `Europe/Dublin`).
- Hardened after a duplicate-email incident (`src/lib/sendSessionReminder.ts`, `src/app/api/admin/reminders/run/route.ts`):
  1. **GCal check first** — `reconcileCalendar()` runs; if Google is unreachable the run **aborts and sends nothing**.
  2. **One-per-session-ever** — claims a `session_reminders` row before sending, backed by a DB `UNIQUE(session_id, reminder_type)`. Fail-closed: if the claim can't be recorded, nothing sends.
  3. **Hard cap** `MAX_PER_RUN = 25` — if a run has more candidates it aborts entirely.
  4. **Abort alerts** — any abort emails `info@owenlynchtherapy.com`. So silence each morning = reminders went out fine.
- **Client opt-out:** reminder emails carry a signed unsubscribe link → `/unsubscribe` → sets `clients.reminders_opted_out`. Togglable per client in the record modal. Honoured by both the cron and manual sends.

## Receipts & statements

- **No receipt is ever emailed implicitly.** Marking a session paid never
  auto-sends one, and (since Phase 2) neither does marking attended — the old
  hidden auto-send on mark-attended is gone. The one-tap **"Session done"**
  button states its outcome up front ("Done — paid €80 + email receipt") and
  only does what the chosen option says. Stripe payments remain the automatic
  path: the webhook marks paid AND emails the receipt, and rows show
  "Paid · Stripe" with the receipt tick.
- Receipts otherwise remain a separate, explicit action:
  - **Email** receipt: "Receipt" button in the sessions list and the Send-Reminder modal (`/api/admin/send-receipt`).
  - **PDF download** receipt (per paid session) and **PDF statement** (all sessions + total): buttons in the client record modal.
- PDF generator: `src/lib/generateReceiptPDF.ts` (`generateReceiptPDF` + `generateStatementPDF`), routes `/api/admin/receipts` and `/api/admin/receipts/statement`. Includes "Psychotherapist: Owen Lynch" and "IAHIP Reg. No. 1890"; has a `dateOnly` option for back-dated batches.

## Privacy mode

- Eye toggle in the admin sidebar (above the 2FA shield) blurs all client-identifying info site-wide via the `.pii` class (+ `.admin-session-name`, `.admin-clientrow-name`, `.admin-event-name`). Persisted in `localStorage`. For screen-sharing.

## Stripe payments

- Webhook `src/app/api/webhooks/stripe/route.ts` handles `checkout.session.completed` → marks the session paid, logs to the `payments` ledger, and emails the receipt (once). Needs `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.
- **GOTCHA:** the Stripe webhook endpoint URL must point at the domain that answers **200 without a redirect**. Stripe does not follow redirects. The **apex `owenlynchtherapy.com` 307-redirects to `www`**, so a webhook on the apex fails every time. Point the Stripe endpoint at whichever host serves 200 (currently `https://www.owenlynchtherapy.com/api/webhooks/stripe`), and make sure `STRIPE_WEBHOOK_SECRET` matches THAT endpoint's signing secret.

## Domains / SEO

- **RESOLVED 2 Jul 2026:** the apex `owenlynchtherapy.com` is now the primary
  domain in Vercel; `www` 308-redirects to it, and the Stripe webhook points at
  the apex (verified 200s). Canonicals, sitemap, JSON-LD and serving all agree
  on the apex. If Search Console still shows "redirect error" pages, they're
  pre-flip leftovers — validate the fix there and wait for recrawl.
- History (why it was ever a mess): the apex used to 307 to `www` while
  canonicals pointed at the apex; an earlier in-code redirect attempt caused a
  redirect loop and was reverted same-day — domain redirects belong in Vercel's
  dashboard, never in next.config.
- The canonical origin + NAP/opening-hours facts used in metadata and JSON-LD live in `src/lib/siteConfig.ts`. The single LocalBusiness/MedicalBusiness entity is emitted for all marketing pages from `src/app/(marketing)/layout.tsx`; pages reference it by `@id` instead of re-declaring it.
- The sitemap (`src/app/sitemap.ts`) pulls article slugs from Sanity at build time, with a hardcoded fallback if Sanity is unreachable. New posts enter the sitemap on the next deploy.
- The social share card is `public/og-image.jpg` (1200×630), set as the site-wide default in `src/app/layout.tsx` and per-page in each page's `openGraph.images`.

## Environment variables (Vercel)

`EMAILS_ENABLED`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`INTAKE_ADMIN_SECRET` (admin login + signs unsubscribe tokens), `CRON_SECRET`,
`TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_SANITY_PROJECT_ID` /
`NEXT_PUBLIC_SANITY_DATASET`, Google OAuth creds, Supabase service-role key.

## Supabase migrations (`supabase/migrations/`)

Applied in the Supabase SQL editor. Notably: `session_reminders.sql` +
`session_reminders_unique.sql` (the one-per-session UNIQUE constraint),
`clients_reminders_opt_out.sql` (`reminders_opted_out` column), `payments.sql`,
`rate_limits.sql`, `admin_mfa.sql`. If a feature "doesn't save", check its
migration was run in production.

## Known latent bugs (not yet fixed)

1. **Recurring-session time changes** made in Google Calendar don't reliably reflect in the dashboard. The conflict-resolver in `src/lib/calendarSync.ts` only matches sessions tracked by their exact instance id; in-app recurring sessions are stamped with the SERIES id, so a moved occurrence is missed (and can even be wrongly auto-cancelled). Fix: make conflict resolution slot- and series-aware (match a series-tracked session to the one instance of that series in the window; update its `session_date`).
2. **Deleting a client can leave "ghost" Google Calendar events.** `deleteCalendarEvent` returns 400 "Bad Request" for recurring series ids (`src/app/api/admin/clients/delete/route.ts` → `deleteCalendarEvent`). Fix: handle series vs instance deletion and tolerate 400/410.

## Build / deploy notes

- Run `npm run build` before pushing. In an isolated sandbox the build **compiles and type-checks fine but fails at "Collecting page data" for `/articles`** because it can't reach Sanity (network policy). That's environment-only, not a code error — on Vercel (real Sanity creds) it builds fully.
- Visible UI changes are usually previewed on a branch before merging to `main`. Long branch names get a hashed Vercel preview URL — grab it from Vercel → Deployments rather than guessing.
