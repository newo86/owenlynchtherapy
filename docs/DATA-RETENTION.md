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

## Open items (need a decision or infra — not yet implemented)

1. **Minimise PII in Google Calendar.** Session events currently use the
   client's full name in the title (`Session — <name>`) and name + email in the
   description. Reducing this to initials/a code would lower PII exposure in
   Google, **but** the calendar sync auto-imports events by matching the client
   name in the event title (`src/app/api/admin/calendar/route.ts`). Changing the
   title format requires re-working that matching to key off the stored
   `gcal_event_id` instead — a deliberate change, not a find-and-replace.

2. **Durable rate limiting.** Current limiter is in-memory and per-instance
   (`src/lib/rateLimit.ts`), so it resets on serverless cold starts. Backing it
   with Vercel KV / Upstash Redis requires provisioning that store and adding
   its env vars.

3. **Admin auth.** The dashboard uses a single shared secret stored in
   `sessionStorage`. Comparison is now constant-time (`requireAdmin`), but
   moving to an httpOnly-cookie session + TOTP MFA would materially improve
   security. Deferred because it changes the sign-in flow.

4. **Marketing-wide CSP.** A strict Content-Security-Policy is enforced on
   `/admin/*` (`next.config.ts`). Extending it to the marketing pages needs a
   verified rollout because those pages load Google Maps, the Psychology Today
   badge, Cloudflare Turnstile, and GTM-managed tags.

5. **Processor DPAs.** Personal data is shared with Resend, Stripe, Google,
   Supabase and Vercel. Ensure a Data Processing Agreement is in place with each
   and that the privacy policy lists them.
