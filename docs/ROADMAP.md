# Project roadmap

Prioritised future plan for owenlynchtherapy.com, produced from a full
security, code-quality and SEO review (July 2026). Items are ordered by
impact within each horizon. Pairs with docs/OPERATIONS.md (current state)
and docs/DATA-RETENTION.md (GDPR posture).

The July 2026 review round already fixed: contact-form HTML-escaping +
length caps, client emails removed from logs and from quick-add Google
Calendar descriptions, one unified business JSON-LD entity, real OG image,
dynamic sitemap, footer NAP, condition-page cross-links, and assorted
metadata fixes. What follows is what's still open.

---

## Horizon 1 — do next (operational correctness & indexing)

1. **Fix the canonical-host mismatch (one-time infra change).** The apex
   `owenlynchtherapy.com` 307-redirects to `www`, but every canonical tag,
   sitemap URL and JSON-LD id points at the apex — Google Search Console
   shows "redirect error" because of it. Make the **apex the primary domain
   in Vercel** (Settings → Domains → set `owenlynchtherapy.com` as primary,
   redirect `www` → apex).
   ⚠️ Order of operations: the Stripe webhook currently points at
   `https://www.owenlynchtherapy.com/api/webhooks/stripe`. The moment www
   starts redirecting, Stripe deliveries fail (Stripe won't follow
   redirects). Immediately after flipping the domain, update the Stripe
   endpoint URL to the apex and confirm the next delivery is 200. Also
   re-check `GOOGLE_REDIRECT_URI` and `NEXT_PUBLIC_SITE_URL` (see
   DOMAIN_MIGRATION.md). Code-side, everything reads
   `https://owenlynchtherapy.com` (see `src/lib/siteConfig.ts`), so no
   deploy is needed beyond the domain flip.

2. **Surface Google Calendar write failures.** `updateCalendarEvent` /
   `deleteCalendarEvent` return `false` on failure but no caller checks it,
   and the 5-minute sync cron treats Google as source of truth — so a
   failed GCal write silently *reverts the practitioner's own reschedule*
   within 5 minutes, and the client can be reminded for the wrong time.
   Return `gcal_synced: false` from the API routes and show a warning
   toast in the dashboard. (`src/lib/googleOAuth.ts`,
   `src/app/api/admin/sessions/update/route.ts`,
   `src/app/api/admin/gcal-event/update/route.ts`)

3. **Add a DB uniqueness backstop for sessions.** Calendar auto-import is
   check-then-insert with three overlapping triggers (cron + every open
   dashboard tab every 30 s), which is what produces the duplicate session
   rows that `dedupeSessions()` cleans up downstream — and those duplicates
   currently **inflate the client statement PDF and weekly-report totals**,
   which don't dedupe. Add a partial unique index (e.g.
   `unique (client_id, session_date) where status <> 'cancelled'`), switch
   the import to upsert-ignore, and the whole class of bugs disappears.
   Until then, port `dedupeSessions` into `/api/admin/receipts/statement`
   and `/api/admin/reports/weekly`.

4. **Stripe webhook: return 500 when the paid-update fails.** Today a
   transient Supabase error during `checkout.session.completed` returns
   200, so Stripe never retries and a real payment stays "unpaid" silently.
   Idempotency is already guaranteed by the payments-ledger unique
   constraint, so a 500-and-retry is safe.
   (`src/app/api/webhooks/stripe/route.ts`)

5. **Decide the mark-attended receipt question.** Marking a paid session
   attended auto-emails a receipt, which contradicts the documented
   "receipts are always explicit" policy. Either remove the auto-send or
   document it as the one exception in OPERATIONS.md.

6. **Wire up (or descope) the weekly report cron.** The route and email
   say "sent automatically every Saturday", but `vercel.json` has no cron
   for it — it only ever sends from the manual button. Add
   `{ "path": "/api/admin/reports/weekly", "schedule": "0 8 * * 6" }` or
   correct the copy.

7. **Make intake-token consumption atomic.** Two rapid submits of the same
   token currently create two submissions and two notification emails
   (claim the token with `update … eq(is_used,false) … select()` before
   inserting). Same pattern for `mark-paid`'s ledger insert.

8. **Fix the 30-second poll wiping in-progress edits** in the client
   record modal: key ClientDetail's reset effect on `client.id` instead of
   the object identity. Quick one-line fix, real annoyance.
   (`src/components/admin/ClientDetail.tsx:142`)

## Horizon 2 — security & compliance hardening

1. **Enable TOTP MFA and treat it as the expected state.** Until 2FA is
   turned on, the whole clinical dashboard rides on one shared password;
   and `isMfaEnabled()` fails open (reads as "disabled") on any DB error.
   Enable it from the sidebar (run `admin_mfa.sql` first), then consider a
   persistent dashboard warning whenever MFA reads as off.

2. **Verify `rate_limits.sql` is applied in production.** The durable
   rate limiter fails open until the migration exists; the in-memory one
   is per-serverless-instance. Then consider fail-closed on the login
   bucket specifically.

3. **Fail closed on Turnstile misconfiguration** in the contact action
   (currently skipped entirely if `TURNSTILE_SECRET_KEY` is unset) and add
   the same durable rate limit the intake routes have.

4. **Fix the two known GCal latent bugs** (see OPERATIONS.md): recurring
   time changes missed by the instance-id-only conflict resolver, and
   ghost events when deleting a client with a recurring series.

5. **Lint debt:** `npm run lint` currently fails with 11
   `react-hooks/set-state-in-effect` errors. Fix or explicitly downgrade
   the rule so lint stays a trustworthy pre-push signal.

6. **Processor DPAs + privacy policy** listing Resend, Stripe, Google,
   Supabase, Vercel (open item from DATA-RETENTION.md). One-off admin
   task, worth closing for Art 28 compliance.

7. **Later, when convenient:** narrow TOTP replay window / record last
   counter; convert mutating GET cron routes to POST; nonce-based CSP for
   /admin; move remaining per-page hardcoded URLs onto
   `src/lib/siteConfig.ts`.

## Horizon 3 — SEO & content growth (the compounding wins)

1. **Publish articles consistently.** The pipeline (Sanity → /articles,
   generateMetadata, Article JSON-LD, dynamic sitemap) is now fully built —
   content is the bottleneck. Aim for one well-researched piece per month
   targeting a condition keyword ("how OCD therapy works" is the model:
   it already earns the OCD page its strongest internal support). Ideas
   already 301-parked: "what does ADHD feel like", "finding the right
   therapist" (both currently redirect to /contact — write them and lift
   the redirects).

2. **Add a short FAQ section (3–4 questions) to each condition page**
   with FAQPage JSON-LD — fees, session format, online availability,
   "how many sessions". Highest-leverage on-page addition for
   "<condition> therapy dublin" SERPs. Reuse real answers from /faq;
   keep the site's voice (no overclaiming).

3. **Google Business Profile.** Ensure the practice has a claimed GBP at
   Insight Matters, 106 Capel Street with the same NAP as the site footer
   and schema, category "Psychotherapist", and the site URL — this feeds
   the local pack, which for "therapist dublin" queries matters as much
   as organic ranking. Encourage a couple of colleague/peer reviews if
   appropriate for the profession's ethics.

4. **Service-detail sub-pages** (`/services/:slug` currently 307s to
   /contact). Either build them or point the redirect at the matching
   condition page (e.g. `/services/ocd` → `/ocd-therapy-dublin`) so any
   legacy equity flows to the ranking pages, not the contact form.

5. **Measure.** After the domain flip, re-verify the property in Search
   Console (apex), resubmit the sitemap, and watch the "redirect error"
   pages clear. Track condition-page impressions/clicks monthly.

6. **Media polish (minor):** compress the multi-MB images in
   /public/images (Owen1.jpg is 14 MB; next/image resizes on the fly but
   the originals bloat the repo), give the OCD page's OG image true
   1200×630 dimensions, and trim unused Poppins font weights.

## Horizon 4 — product ideas (only if the practice wants them)

- **Online booking** — expose available slots (from the existing Google
  Calendar two-way sync) and let a client request one; confirmation stays
  manual. Big UX win, non-trivial build; the calendar plumbing exists.
- **Client portal-lite** — reuse the intake-token pattern for secure,
  expiring links to a client's own receipts/statements instead of email
  attachments.
- **Waiting-list management** — a small table + admin view; useful once
  Tuesday/Friday slots fill.
- **Automated invoice/statement month-end run** — generation exists;
  wire a monthly cron that drafts (not sends) statements for review.
