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

## Retained (clinical norms)

- **Clients, sessions, intake submissions** are retained per professional
  guidance (IAHIP/PSI: typically ~7 years after last contact for adults).
  These are **not** auto-purged. When the practice has records old enough to
  fall outside the retention window, add a purge for them (mirroring the
  token-purge route) once the exact period is confirmed.

## Right to erasure (Art 17)

- A client and all their sessions can be deleted via the dashboard
  (`POST /api/admin/clients/delete`, cascades sessions + Google Calendar
  events). Intake submissions for an erased client should be removed in the
  same flow — verify this before relying on it for a formal erasure request.

## Open items (need a decision — deliberately not automated)

1. **Clinical-record retention purge.** Clients, sessions and intake submissions
   are kept indefinitely. A scheduled purge of records older than the retention
   window is **not** implemented because the period is a professional/legal
   decision (IAHIP/PSI is typically ~7–8 years after last contact; for under-18s
   it differs). Once you confirm the exact period, a purge can be added mirroring
   the token-purge route. Auto-deleting clinical data on a guessed period is
   intentionally avoided.

2. **Apply the rate-limit migration.** Run `supabase/migrations/rate_limits.sql`
   in Supabase to activate the durable, cross-instance rate limiter (it fails
   open until then, with the in-memory limiter still active).

3. **Verify the site-wide CSP after deploy.** Check the contact page (Google
   Maps embed, Turnstile widget, Psychology Today badge all render) and that GTM
   tags still fire. If you run a GTM tag that calls a domain not in
   `connect-src` (e.g. a Meta pixel), add that domain to `siteCsp` in
   `next.config.ts`.

4. **Optional: reduce the client name in Google Calendar to initials.** Email is
   already removed; the full name remains so you can identify sessions. Reducing
   to initials would require re-working the calendar auto-import, which matches
   externally-created events by name (`src/app/api/admin/calendar/route.ts`).

5. **Processor DPAs.** Personal data is shared with Resend, Stripe, Google,
   Supabase and Vercel. Ensure a Data Processing Agreement is in place with each
   and that the privacy policy lists them.

6. **Optional: TOTP MFA** on top of the cookie session, if you want a second
   factor for admin sign-in.
