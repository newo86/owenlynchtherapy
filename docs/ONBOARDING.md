# Onboarding a new practice (clone runbook)

How to spin up this site + dashboard for another therapist. One practice = one
clone of this repo + its **own** Supabase, Resend, Stripe, Vercel and Google
accounts. Nothing is shared between practices — each therapist is the data
controller of their own client data, and no client data ever passes through
Owen or a shared system.

The spin-up is a one-time job (an afternoon with a Claude Code session working
through this file). After that the therapist self-serves day to day: practice
facts are edited on the dashboard's **Settings** page, no developer needed.

---

## 0 · What to collect from the therapist first

**Facts** (everything on the dashboard Settings page — see
`src/practice.config.ts` for the full annotated list):

- Business name, practitioner name, job title
- Accrediting body + registration number (prints on legal receipts — verify it)
- Contact email, phone, venue/address (or online-only), service area
- Fees (online / in person / low cost / room cost), session length, hours
- Telehealth room link (e.g. doxy.me), Instagram / directory profiles

**Assets & content** (bespoke per practice, not config):

- Logo files + brand colours (see "Branding" below)
- About-page bio, services copy, FAQ answers, any condition pages
- A domain they own (or buy one in step 6)

**Accounts the therapist creates themselves** (free tiers fine to start; they
must be the account owner so they own their data):

| Account | Used for | Note |
|---|---|---|
| GitHub | holds their copy of the code | can be Owen's org early on |
| Supabase | client/session database | **EU region** (GDPR) |
| Resend | sending email | needs DNS access to verify the domain |
| Stripe | card payments | payment links + webhook |
| Google Cloud | calendar sync | they already have the Google account |
| Vercel | hosting | free Hobby tier works |

---

## 1 · Code: clone and personalise

1. Create the new repo from this one (GitHub → Use this template, or fork).
2. Edit **`src/practice.config.ts`** — every practice fact lives there. This
   file is also the *default* for the dashboard Settings page, so get it right
   even though it's editable later.
3. Replace assets in `/public`: logos (`images/logo-horizontal-pdf.png` is on
   receipts), accreditation badge images, `og-image.jpg`, favicon,
   `site.webmanifest` names.
4. Rewrite the bespoke content: About bio, home/services/FAQ copy, condition
   pages, articles (delete Owen's articles in `src/content/articles/`).
5. Sweep for leftovers: `grep -ri "owen" src/ public/ --include="*.ts*"` and
   fix anything that isn't generic. (Known spots not yet on config: the TOTP
   issuer in `src/lib/totp.ts`, `{greeting}, Owen` in
   `src/components/admin/Dashboard.tsx`, some `noreply@`/`info@` addresses in
   API routes, `site.webmanifest`.)

**Branding:** colours live in the Tailwind `@theme` tokens in
`src/app/globals.css` **and** the `brand` mirror in `practice.config.ts` —
change both. Fonts are set in `src/app/layout.tsx`.

## 2 · Supabase (database)

1. Create a project in an **EU region**. Save the database password.
2. Run everything in `supabase/migrations/` in the new project's SQL editor
   (all files are idempotent). Order only matters twice:
   `000_base_schema.sql` FIRST (the four original tables — reconstructed from
   code; docs/DB-REVIEW.md has a query to double-check it against the source
   project), `service_role_grants.sql` and `supabase/supabase-rls-policy.sql`
   last.
4. Confirm RLS is enabled (deny-all) on every table — the app only ever
   connects with the service-role key from the server.

## 3 · Resend (email)

1. Add and verify the practice domain (Resend → Domains → add the DNS records).
2. Create an API key.
3. Set the from-address in `practice.config.ts` (`emailFrom`) to that domain —
   e.g. `Jane Doe Therapy <noreply@janedoetherapy.com>`.
4. Keep `EMAILS_ENABLED=false` until step 7's tests pass.

## 4 · Google Cloud (calendar sync)

1. console.cloud.google.com → new project → enable **Google Calendar API**.
2. OAuth consent screen: External, app name = practice name, scope
   `calendar.events`, add the therapist's Gmail as a test user (or publish).
3. Credentials → OAuth client ID → Web application → redirect URI:
   `https://<domain>/api/auth/google/callback`.
4. Note the client ID + secret for step 6.

## 5 · Stripe (payments)

1. Payment links: one per session type (online / in person) with the right
   price. Paste them into `practice.config.ts` → `stripeLinks` (and later the
   Settings page).
2. Developers → Webhooks → add endpoint
   `https://<apex-domain>/api/webhooks/stripe` for `checkout.session.completed`.
   **Point it at the primary (non-redirecting) domain** — Stripe won't follow
   redirects. Note the signing secret.

## 6 · Vercel (hosting)

1. Import the GitHub repo. Framework: Next.js, defaults are fine.
2. Domains: add the practice domain, make the **apex the primary** (www
   redirects to it), and set the same value in `practice.config.ts` → `siteUrl`.
3. Environment variables:

| Variable | From |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role) |
| `RESEND_API_KEY` | Resend |
| `EMAILS_ENABLED` | `false` until tested, then `true` |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint (step 5) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud (step 4) |
| `GOOGLE_REDIRECT_URI` | `https://<domain>/api/auth/google/callback` |
| `INTAKE_ADMIN_SECRET` | generate: `openssl rand -base64 32` — the dashboard password |
| `CRON_SECRET` | generate another — protects the cron routes |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile (free) for the public forms |
| `NEXT_PUBLIC_SITE_URL` | `https://<apex-domain>` |

4. The crons in `vercel.json` (calendar sync, daily reminders, token/clinical
   purges) are picked up automatically on deploy.

## 7 · First-run checklist (in order)

1. Deploy succeeds; public site renders with the new practice's details.
2. Log into `/admin/intake` with the admin secret; set up **two-factor auth**
   (shield icon) straight away.
3. Run `supabase/migrations/practice_settings.sql` if not already done; open
   **Settings**, confirm the values, Save. Check the site footer updates.
4. Connect **Google Calendar** from the dashboard.
5. Create a test client (therapist's own email), send an intake form, fill it
   in, download the PDF — check the accreditation number on it.
6. Set `EMAILS_ENABLED=true`, redeploy. Send a test reminder + receipt to the
   test client; check both look right on a phone.
7. Pay the Stripe link once (then refund) and confirm the session flips to
   "Paid · Stripe" on the dashboard within a minute.
8. Delete the test client.

## 8 · GDPR per practice (not optional)

- The therapist is the **data controller**; Supabase/Resend/Stripe/Google/
  Vercel are their processors — each has a standard DPA that applies
  automatically to their own account. Owen is not in the chain.
- Publish a privacy policy on the site (adapt this repo's) naming those
  processors, the retention rules in `docs/DATA-RETENTION.md`, and the
  contact for data requests.
- Keep the Supabase project (and any storage) in the EU.
- The dashboard already does the technical side: RLS deny-all, server-only
  keys, httpOnly session cookie + optional TOTP, privacy mode, consent
  recording on intake/waitlist, monthly clinical purge, reminder opt-out.

---

*Template updates don't propagate automatically: a clone is a fork in time.
Fixes worth sharing get cherry-picked into each practice repo deliberately.*
