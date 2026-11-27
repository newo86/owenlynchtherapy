@AGENTS.md

# The team (Owen Lynch Psychotherapy dashboard + owenlynchtherapy.com)

The main session is the **lead** and runs on Opus (set in
.claude/settings.json). It plans, splits work into tasks, and gives each task
to the cheapest agent that can do it well. Agents can't talk to each other:
the lead relays between them.

| Agent | Model | Does |
|---|---|---|
| lead (main session) | opus | Planning, hard debugging, design calls, final review |
| `developer` | sonnet | Builds and fixes on the working branch, with tests |
| `designer` | opus | Reviews visible changes: layout, mobile, WCAG 2.1 AA, wording, calm feel |
| `reviewer-quick` | haiku | First pass on anything a client or Owen reads |
| `reviewer` | opus | Final check on anything a client could see |
| `practice-manager` | sonnet | Read-only schedule checks and reminder drafts |
| `security-guardian` | inherit | Runs automatically via the security hook |

Built-in `Explore` with `model: haiku` is the default for searching code,
running tests or checking lists.

**Models:** only `opus`, `sonnet`, `haiku` aliases. Never Fable or any model
billed as usage credits; ask Owen if unsure whether a model costs extra.

**Routing:** haiku for clearly defined chores; sonnet for normal coding; opus
for planning, tricky bugs, design and final review. If a cheaper agent's work
comes back poor, redo it one level up and log it under "Where the line is".

## How work flows

1. Lead plans; `developer` builds on the working branch.
2. `designer` reviews anything visible; fixes go back to `developer` until
   pass. Skip the designer when nothing on screen changed.
3. Anything a client could see: `reviewer-quick`, then `reviewer`.
4. `/check`, then the lead pushes the branch (Vercel builds a preview) and
   sends Owen: the preview link, a short plain-English summary, and
   desktop + mobile screenshots (from the dev-only `/admin-demo` page for
   dashboard screens).
5. **Nothing is merged, shipped or migrated until Owen replies "approve".**
   Then `/ship`, and `/db-migrate` for any new migration.

## Rules for everyone

- Never send anything to a client without Owen's explicit approval. (The
  existing 06:00 reminder job is Owen's standing approval; it is not a
  precedent for anything new.)
- No real client data in tests, logs, prompts or screenshots: use made-up
  clients. Client information is special category health data under GDPR.
- Secrets live in env vars only.
- If unsure, ask Owen rather than guess.
- Payments: clients mostly pay by Revolut transfer to Owen's personal
  account, which no software can see. Don't build bank-reading features;
  the app asks Owen instead.

## Project map (read this instead of the whole repo)

- `src/app/(marketing)/` public site · `src/app/(admin)/admin/intake/` the dashboard
- `src/components/admin/` dashboard UI (Dashboard, MobileHome, SessionsList,
  SessionDoneOptions, StatementImport, SettingsPanel…)
- `src/app/api/admin/*` dashboard API (auth: `requireAdmin`; crons: `CRON_SECRET` bearer)
- `src/lib/` logic: `resend.ts` (email + kill switch), `emailTemplates.ts`,
  `sendSessionReminder.ts`, `calendarSync.ts`/`calendarDrift.ts`/`calendarFix.ts`,
  `googleSessionEvents.ts`, `sessionSeries.ts`, `generateReceiptPDF.ts`,
  `sendReceiptEmail.ts`, `closeOutSession.ts` (shared "Session done" close-out),
  `paymentPrompts.ts` ("Did they pay?" rules), `signingKeys.ts`, `practiceSettings.ts`
- "Did they pay?": `api/admin/payment-prompts` (+ `/run` cron), card
  `PaymentPromptsCard.tsx` + `PaymentPromptsPanel.tsx`; read-only
  `api/admin/schedule-snapshot` (bearer `SCHEDULE_READ_TOKEN`); dev-only
  `(admin)/admin-demo` with `demoData.ts` (see docs/OPERATIONS.md)
- `src/practice.config.ts` practice facts (overridden by Settings)
- `vercel.json` crons · `supabase/migrations/` schema · tests are `*.test.ts` beside the code (vitest)
- Docs: `docs/OPERATIONS.md` (how things run), `docs/SECURITY.md`,
  `docs/DB-REVIEW.md`, `docs/STYLE-GUIDE.md`, `docs/design/`

Update this map when files move or new systems are added.

## Where the line is (cheap agent fell short → redone one level up)

Format: date · task · agent → caught by · why.

- 27 Nov 2026 · payment-prompt copy review · `reviewer-quick` (haiku) passed it →
  `reviewer` (opus) found Friday receipts print the wrong venue. Haiku checks
  the wording in front of it; following variables back to their source (which
  address, which date) needs opus. Keep the opus pass for client-facing work.
- 27 Nov 2026 · payment-prompt build · `developer` (sonnet) shipped a working
  feature, but `designer` (opus) found 7 must-fixes against TASTE.md and
  `security-guardian` found a race in "mark paid". Expected: that's what the
  review steps are for, not a reason to move the build to opus.

## End of every session

Give Owen one line per agent used: what it did and which model it ran on.
