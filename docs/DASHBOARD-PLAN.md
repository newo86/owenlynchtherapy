# Dashboard — audit findings & improvement plan (July 2026)

Technical companion to the 2-page owner-facing doc. Findings verified
against code (file:line) and production Vercel logs. Plan is phased so each
phase ships independently. Pairs with docs/ROADMAP.md (site-wide horizons).

## Incident: automatic reminders silently down

**Evidence (production logs):** every reminders-cron send failing fail-closed:

- 2026-06-30 06:00 `candidates 3, sent 0, failed 3`
- 2026-07-03 06:00 `candidates 4, sent 0, failed 4`
- error per send: `permission denied for table session_reminders`

**Root cause:** `supabase-rls-policy.sql` grants service_role only the five
original tables; `session_reminders` (and `payments`, `rate_limits`,
`admin_mfa`) never got grants and default privileges don't cover them here.
The cron claims a ledger row BEFORE sending and refuses to send when the
claim fails (`src/lib/sendSessionReminder.ts:91-102`, fail-closed by design
after the duplicate-email incident) → every automatic send blocked. Manual
sends log AFTER sending, best-effort (`:132-141`) → unaffected. This is the
whole "sometimes sent, sometimes not" mystery.

**Fix:** run `supabase/migrations/service_role_grants.sql` in the Supabase
SQL editor (DO-block; skips missing tables and reports NOTICEs). NOTE: on
first attempt `admin_mfa` did not exist in prod (42P01) — its migration was
never applied; that also means TOTP 2FA has never been active. If
`rate_limits` reports SKIPPED, the durable rate limiter has been silently
inactive (it fails open) — run `rate_limits.sql` too.

## Reminder pipeline — remaining latent no-send/duplicate paths

(Full trace: reminders/run route + sendSessionReminder + calendarSync.)

1. **One-reminder-per-session-EVER collides with rescheduling.** The UNIQUE
   is `(session_id, reminder_type)` with no date. Reschedules update the row
   in place (`sessions/update/route.ts:78-81`), so a session reminded once
   and then moved is never reminded on its actual day. Manual sends days in
   advance likewise consume the claim. Fix: include the session *date* in
   the claim key (e.g. reminder_type = 'email:<yyyy-mm-dd>' or add a
   `for_date` column to the UNIQUE), or clear the claim on reschedule.
2. **Kill switch falsifies the ledger.** `EMAILS_ENABLED` off → the resend
   stub returns `{error:null}` (`resend.ts:35`), the cron counts "sent" and
   KEEPS the claim → those sessions are unremindable after re-enabling, and
   the abort-alert email is muted by the same switch. Fix: sentinel error
   from the stub (or check the switch before claiming) + dashboard banner
   when the switch is off.
3. **Selection window:** only sessions strictly LATER than the 06:00 UTC run
   qualify (`route.ts:103`) — sessions at/before 07:00 Dublin (summer) never
   get reminders; same-day bookings made after the run get no catch-up. Fix:
   send the reminder on booking for same-day sessions; consider a second
   afternoon sweep for evening sessions booked that morning.
4. **Claim burn on crash:** an exception/timeout between claim and send
   (e.g. `getResend()` throws when key missing, function timeout — no
   `maxDuration` exported) permanently consumes the claim. Fix: try/catch
   around each send in the run loop + release claim on throw + maxDuration.
5. **Twin-row swap:** duplicate session rows (recurring-sync artefact) are
   deduped in-memory per run, but a re-invocation can pick the other twin →
   double email despite the UNIQUE. Root fix is the sessions unique index
   (ROADMAP Horizon 1 item 3).
6. **Recurring move → wrong auto-cancel → reimport as in_person** with the
   Capel St address in the reminder even for online clients
   (`calendarSync.ts:172` hardcodes 'in_person'). Known OPERATIONS bug;
   production log 2026-07-03 shows an auto-cancel worth verifying.
7. **Observability:** only full aborts email info@ (and only if the kill
   switch is on); per-send failures (this incident) never alert; and info@
   mail was not found in the owner's Gmail — verify where info@ delivers.

## Revenue tab — defects (Revenue.tsx, Dashboard.tsx, api.ts)

- Default basis counts **attended** sessions (unpaid ones count as revenue;
  forgot-to-tick sessions vanish) while the week chart under the same cards
  is **paid-only**; Dashboard's mini card is paid-only → three definitions
  on two screens.
- `payment_status === 'refunded'` still counts full fee everywhere.
- Browser-timezone bucketing (`startOfMonth`, `getMonth`, `isSameDay`)
  shifts sessions across months/days when viewed abroad; display layer is
  Dublin-pinned → row dates and bar buckets disagree.
- Duplicate rows deduped in dashboard views but NOT in the weekly email
  report, the client statement PDF (client-facing!), or ClientDetail lists.
- Projection = YTD gross × (ms-in-year / ms-elapsed) — absurd early-year.
- `const now = new Date()` in render defeats all three useMemos.
- Hardcoded `OUTSTANDING_FLOOR = 2026-06-01` (Dashboard.tsx:50) and the
  unpaid list it links to has no floor → card and list disagree.
- Month headline excludes future-dated paid sessions; its own bars include
  them; "% vs last month" compares month-to-date to full month.

## Receipt/payment workflow — defects

- `receipt_sent_at` surfaced ONLY in ClientDetail month list; absent from
  SessionsList (where the Receipt button lives), Dashboard rows, calendar.
- `send-receipt` route has no guards: sends for unpaid/future sessions,
  resends on every click (send-receipt/route.ts:51-61).
- mark-attended auto-sends a receipt when already paid (click-order
  dependent outcome); contradicts documented "receipts always explicit".
- Four mark-paid paths; the edit-modal path bypasses the payments ledger.
- SessionsList/CalendarWeekGrid mutations ignore res.ok — failures look
  like success; AdminShell reload error → renders zeros with no banner.
- 30s poll replaces `openClient` object → ClientDetail reset effect (keyed
  on identity, :142-147) wipes in-progress edits; `saveContact` omits
  `email` from payload → email edits silently dropped.

## Plan

**Phase 1 — Trust (observability + feedback).**
`reminder_runs` table + write a row per run; dashboard health strip
("Reminders: 4 sent this morning ✓" / red banner if last run missing >25h,
aborted, or had failures); per-session "Reminder sent 07:01" and "Receipt
sent <date>" chips in SessionsList/Dashboard/calendar; res.ok checks +
inline feedback on all mutations; error banner instead of zeros on reload
failure; fix ClientDetail reset (key on client.id, skip while editing) and
include email in saveContact; kill-switch stub returns sentinel + banner.

**Phase 2 — One-tap session close + Stripe visibility.**
Single "Session done" action = mark attended + record payment method +
(if paid) send receipt, with the outcome stated on the button; guard
send-receipt (refuse unpaid; "Sent 12 Jun — send again?" confirm for
resends); show "Paid via Stripe · Receipt emailed ✓" from webhook data;
remove the mark-attended hidden auto-send in favour of the explicit action;
route all mark-paid paths through the ledger.

**Phase 3 — Client record + honest numbers.**
ClientDetail: at-a-glance header (contact, NEXT session card only — no
future list, outstanding €, sessions-to-date), past-session timeline with
paid/receipt status, receipts/statements history (log issued documents),
per-session "Email receipt" action, "Schedule session" button. Revenue:
one definition ("Earned (paid)" headline + "Awaiting payment" secondary),
exclude refunds, Dublin-calendar bucketing everywhere, dedupe server-side
(fixes weekly email + statement PDFs too), replace projection with
trailing-4-completed-weeks average, labelled outstanding floor.

**Phase 4 — Revolut statement import.**
Upload monthly statement (CSV preferred — Revolut personal exports
Excel/CSV; PDF fallback via text extraction). Server parses transactions
(date, counterparty, amount, reference), fuzzy-matches to clients by name +
amount + proximity to session dates, then a REVIEW screen: proposed matches
with confidence, unmatched rows listed; nothing marked paid without
explicit confirmation; confirmed matches → mark-paid with method 'revolut'
+ payments ledger rows; statement file discarded after parse (GDPR: it
contains unrelated transactions). Prereq: sessions unique index (dedupe at
source) so amounts reconcile cleanly.

**Sequencing prereqs from ROADMAP Horizon 1:** GCal write-failure surfacing
and the sessions unique index benefit Phases 1–4 and should ride along.
