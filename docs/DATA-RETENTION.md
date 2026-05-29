# Data Retention & GDPR Notes — Admin Dashboard

This system processes **special-category data** (GDPR Article 9: mental-health
information, medication, psychiatric details) plus identifiers (name, email,
phone, DOB) and third-party data (emergency contacts). The notes below record
what is retained, what is purged automatically, and the items still open.

## Automated retention (implemented)

| Data | Rule | Where |
|------|------|-------|
| **Unused intake links** (`intake_tokens` with `is_used = false`) | Deleted 30 days after expiry. They hold a prospective client's name + email but serve no purpose once expired. | `GET /api/admin/maintenance/purge-tokens`, daily Vercel cron (`vercel.json`). |
| **Server logs** | No client names, emails, payment URLs, or secrets are written to logs — only opaque IDs. | `src/lib/adminAuth.ts` + sanitised `console.*` across API routes. |
| **Google Calendar events** | Client **email** is no longer written to event descriptions; only the name (needed so the practitioner can identify sessions) remains. | `generate-token`, `admin/sessions` route. |

## Security controls implemented

- **Admin auth:** httpOnly + Secure + SameSite=Strict session cookie (JS cannot
  read the secret); constant-time validation; 12-hour expiry. (`src/lib/adminAuth.ts`)
- **Rate limiting:** in-memory limiter plus a **durable Postgres-backed** limiter
  on login / intake submit / token validation. The durable layer **fails open
  until** `supabase/migrations/rate_limits.sql` is applied — run that migration
  in Supabase to activate cross-instance limiting. (`src/lib/rateLimitDurable.ts`)
- **Headers:** HSTS site-wide; a baseline CSP site-wide and a stricter CSP on
  `/admin/*`. (`next.config.ts`)

## Clinical-record retention (7 years)

- **Clients, sessions, intake submissions** are retained for **7 years after
  last contact** (the most recent session), then purged — unless the client
  requested earlier erasure (handled via `/api/admin/clients/delete`).
- Enforced by `GET /api/admin/maintenance/purge-clinical` (monthly Vercel cron).
- **SAFETY:** the purge only deletes when `CLINICAL_PURGE_ENABLED=true` is set in
  the environment. Until then it runs as a **dry-run** that logs/returns how many
  records *would* be purged, deleting nothing. Set the flag when you're ready to
  let it delete. (Nothing is old enough to delete until ~2033 regardless.)
- Two-factor admin login (TOTP) is available — enable it from the dashboard
  sidebar; see "Two-factor" below.

## Two-factor authentication (TOTP)

- Optional, fully in-app. In the dashboard sidebar, open **Two-factor** (shield
  icon): a QR code appears — scan it with an authenticator app (Google
  Authenticator, Authy, 1Password…), enter the 6-digit code to confirm, and it's
  enabled. No env vars, no redeploy. Turn it off from the same panel (requires a
  current code).
- The secret is stored in Supabase (`admin_mfa` table, service-role only — run
  `supabase/migrations/admin_mfa.sql` once). While MFA is off, login is
  password-only, so there's no lockout risk. (`src/lib/totp.ts`,
  `src/lib/adminMfa.ts`)

## Right to erasure (Art 17)

- A client and all their sessions can be deleted via the dashboard
  (`POST /api/admin/clients/delete`, cascades sessions + Google Calendar
  events). Intake submissions for an erased client should be removed in the
  same flow — verify this before relying on it for a formal erasure request.

## Open items (need a decision or a one-time switch)

1. **Enable the clinical purge when ready.** The 7-year purge is implemented but
   runs as a dry-run until you set `CLINICAL_PURGE_ENABLED=true` in Vercel. No
   records are old enough to delete until ~2033, so there's no rush — flip it on
   whenever you're comfortable.

2. **Enable TOTP MFA (optional).** Run `supabase/migrations/admin_mfa.sql`, then
   turn it on from the dashboard sidebar's Two-factor panel (scan the QR).

3. **Verify the site-wide CSP.** Confirmed working: Google Maps + Turnstile. If
   a GTM tag calls a domain not in `connect-src` (e.g. a Meta pixel), add it to
   `siteCsp` in `next.config.ts`.

4. **Optional: reduce the client name in Google Calendar to initials.** Email is
   already removed; the full name remains so you can identify sessions. Reducing
   to initials would require re-working the calendar auto-import, which matches
   externally-created events by name (`src/app/api/admin/calendar/route.ts`).

5. **Processor DPAs.** Personal data is shared with Resend, Stripe, Google,
   Supabase and Vercel. Ensure a Data Processing Agreement is in place with each
   and that the privacy policy lists them.
