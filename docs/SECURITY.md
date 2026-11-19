# Security checklist

The one home for "what secure means" in this repo. The `security-guardian`
agent (.claude/agents/security-guardian.md) works through it, and the
automated layers below run parts of it without anyone asking.

This site holds **special-category health data** (intake forms, session
notes, clinical PDFs) under GDPR Art. 9, so a leak here is a reportable
breach to the Data Protection Commission within 72 hours, not just an
embarrassment. Severity is judged with that in mind.

## How the protection is layered

| Layer | Runs when | What it catches | Lives in |
|---|---|---|---|
| Security gate hook | Every Claude session: before `git push`, and at the end of any turn that changed security-sensitive files | Makes Claude run the guardian on the diff before it can push or finish | .claude/hooks/security-gate.sh |
| `security-guardian` agent | Called by the gate, or on request ("security review", "is this secure?") | Judgment checks: auth, access control, injection, logic flaws, new advisories | .claude/agents/security-guardian.md |
| Security CI workflow | Every PR, every push to main, and weekly | Known-vulnerable dependencies, committed secrets, the mechanical checks in scripts/security-scan.mjs | .github/workflows/security.yml |
| Dependabot | Weekly | Opens PRs for vulnerable or outdated npm packages and GitHub Actions | .github/dependabot.yml |
| Weekly cloud audit | Weekly scheduled task | Full-repo guardian run plus a search for advisories published that week; sends Owen a summary | Claude scheduled tasks (claude.ai/code) |

## Checklist

Each item: what the attack is, and where to look in this codebase.
Numbers 1–20 match the "20 ways someone hacks your vibecoded app" list.

### Framework, hosting and supply chain
1. **Next.js header bypass** (CVE-2025-29927 and later proxy/middleware
   bypasses): a forged `x-middleware-subrequest` header skipped middleware
   auth. Never rely on `proxy.ts`/`middleware.ts` alone for auth; every admin
   route handler must call the admin auth check itself. Keep `next` on a
   patched version. Next.js/React Server Components advisories can take
   weeks to reach `npm audit`, so also check the nextjs.org/blog security
   posts and the vercel/next.js and facebook/react GitHub advisories.
- **Cache Components / `use cache`**: if adopted, never cache per-user or
  admin data. Cache-poisoning advisories have leaked one user's page to
  another.
2. **Exposed `.git` folder / repo files**: nothing under `public/` that
   shouldn't be served; no `.env*`, backups, dumps or `.git` in deployable
   output.
7. **Polyfill.io-style supply-chain scripts**: every third-party `<script>`
   is from a vendor we actually use, listed in the CSP in next.config.ts.
   No polyfill.io, bootcdn, staticfile or unpinned CDN scripts.
17. **Source maps in production**: `productionBrowserSourceMaps` stays off;
    no `.map` files shipped publicly that reveal server code or comments.
13. **Subdomain takeover**: DNS records (Vercel MCP `get_records`) must not
    point at deprovisioned Vercel projects, GitHub Pages, S3 buckets etc.
- **Dependencies**: no high/critical `npm audit` findings in production
  dependencies; lockfile committed; no new packages with install scripts or
  tiny download counts added without a reason (typosquatting). Dependabot
  waits a few days (cooldown) before proposing new releases, because npm
  worms publish poisoned versions that are usually pulled within days.
- **GitHub Actions**: no `pull_request_target` with checkout of PR code;
  actions pinned by commit SHA (Dependabot keeps them current); workflow
  `permissions:` kept minimal; secrets never echoed.
- **Agent tooling**: any change to `.claude/` (hooks, settings, agents) is
  security-sensitive. A 2026 npm worm planted a Claude Code SessionStart
  hook to run its payload in every session.

### Secrets and keys
- **No secrets in the repo or git history** (gitleaks in CI).
- **No secrets in the browser bundle**: only `NEXT_PUBLIC_*` values that are
  meant to be public (Supabase anon/publishable key, Stripe publishable key,
  Turnstile site key). The Supabase service-role key, Stripe secret, Resend
  key, Google OAuth secret, admin secret and signing secret are read only in
  server code (`src/lib/*`, route handlers), never in a `'use client'` file.
10. **Weak JWT / signing secrets**: cookies and links are signed with keys
    from `src/lib/signingKeys.ts`, derived from a long random server-only
    secret, never from the admin password. Comparisons are constant-time.

### Authentication and accounts
5. **Credential stuffing / brute force**: admin login and MFA are rate
   limited (`src/lib/rateLimit*.ts`): per IP for the password, and per account
   for wrong 2FA codes at login. 2FA is enforced by the code only once it is
   switched on in the dashboard — it stores a row in `admin_mfa`. Confirm
   that row exists and is enabled in production (it was missing on
   16 Nov 2026, leaving the dashboard password-only).
12. **Account pre-hijacking**: n/a while there is a single admin and no
    public sign-up. If client accounts are ever added: verify email before
    the account is usable, and don't merge OAuth and password accounts
    without verification.
16. **Password-reset / link poisoning**: links in emails (intake tokens,
    reminder opt-outs, receipts) are built from the configured site URL,
    never from the request's `Host` or `X-Forwarded-Host` header.
20. **User enumeration**: public forms (contact, intake, waitlist,
    opt-out) return the same response and similar timing whether or not the
    email or token exists.
- **Sessions**: admin cookies are `HttpOnly`, `Secure`, `SameSite=Lax` or
  stricter, expire, and are invalidated on logout.

### Access control and data
3. **Supabase storage**: buckets holding PDFs or uploads are private; files
   are served through signed URLs or authenticated routes only.
6. **Open database**: Row Level Security is enabled on every table, with no
   permissive policies for `anon`; the anon key alone can read nothing
   sensitive. Check with the Supabase MCP `get_advisors` (security) and
   `list_tables`.
- **RLS safety net**: every Supabase project has the `ensure_rls` event
  trigger (`supabase/migrations/000_rls_auto_enable.sql`), which enables RLS
  on any new `public` table. Check
  `select evtenabled from pg_event_trigger where evtname = 'ensure_rls'`
  returns `O`.
- **Database functions**: every `SECURITY DEFINER` function sets
  `search_path` and REVOKEs EXECUTE from `public`, `anon` and
  `authenticated` (Supabase grants anon EXECUTE by default, making the
  function callable through the public REST API).
- **IDOR**: every route taking an id (client, session, token, receipt)
  checks the caller is allowed that record. Intake tokens are random,
  single-use and expire.
- **Mass assignment**: update routes copy an allowlist of fields, never the
  raw request body into the database.
- **Data minimisation and logs**: no health data, notes or full emails in
  `console.log`, error messages, analytics events or URLs. Retention follows
  docs/DATA-RETENTION.md.
- **Tokenised public pages** (intake, unsubscribe, the `/values` and
  `/preferences` questionnaires, and any future one): the path is on the GTM
  exclusion regex in `src/app/layout.tsx` and on `PRIVATE_PATH` in
  `src/components/ui/PrivateAnalytics.tsx` (Vercel Analytics), so neither the
  token nor the fact of being a client reaches an analytics provider.
- **Client-side drafts** of clinical answers use `sessionStorage` (gone when
  the tab closes) and are cleared on submit and on a dead link; never persist
  free text indefinitely in `localStorage`.
- **New client-data tables** are added to `TABLES` in
  `src/app/api/admin/backup/route.ts` and are removed by client delete and the
  7-year purge (`on delete cascade` or an explicit delete).
- **Acting on a calendar event or session:** an endpoint takes only an opaque
  key from the browser, recomputes the target server-side
  (`/api/admin/calendar/fix`), and makes every write that follows an external
  API call conditional (`.eq('status', …)`, `.is('gcal_event_id', null)`), so a
  slow or repeated call can't overwrite or duplicate. Google never changes the
  schedule on its own; the app is the source of truth.
- **Any automated change to client records** (cancel, merge, move) leaves a
  trace naming the rows and the reason, and alerts the practitioner.

### Input handling and injection
15. **Path traversal**: no file path built from user input
    (`fs`, PDF assets, downloads) without a fixed allowlist.
14. **SSRF**: the server never fetches a URL the user supplied; image
    `remotePatterns` in next.config.ts stay narrow.
- **XSS**: no `dangerouslySetInnerHTML` with user or database content
  unless sanitised (`src/lib/sanitise.ts`); JSON-LD is serialised safely.
- **SQL / filter injection**: Supabase queries use the query builder with
  values, never string-built `.or()`/`.filter()` expressions or raw SQL from
  input.
- **Email header injection**: user input never goes into `to`, `from`,
  `subject` or headers unescaped; user text in HTML email is escaped.
19. **Open redirect**: any `redirect`/`next`/`returnTo` parameter is checked
    against a list of internal paths.
9. **Prompt injection**: if an AI model is ever given client or web content,
   treat that content as data, and never let model output trigger emails,
   payments or database writes without a human check.

### Payments, messaging and abuse
4. **Price from the browser**: Stripe amounts come from the server
   (practice settings / session record), never from the request body.
   The Stripe webhook verifies the signature with the raw body.
8. **SMS / email pumping**: every endpoint that sends a message is
   rate-limited, captcha-protected (Turnstile) if public, and capped. The
   email kill switch (`EMAILS_ENABLED`) stays.
11. **Race conditions**: anything that must happen once (mark paid, send
    receipt, send reminder, use an intake token) is enforced by a database
    constraint or atomic update, not a read-then-write check.
- **Repeatable email sends** (bulk sends, crons, anything a retry or a second
  tab could repeat) pass a deterministic Resend `idempotencyKey`
  (`send(payload, { idempotencyKey })`), keep inside the function time limit
  (stop early and report "not sent yet"), and have a database-counted daily
  cap. A database "already sent" check alone can be raced by overlapping
  requests or cut off between send and record. Resend answers a reused key
  with a different payload with 409 `invalid_idempotent_request` /
  `concurrent_idempotent_requests` (it does not silently drop it): treat those
  as "already sent", never as "failed", and never tell the user to resend by
  hand on them.
- **Cron and webhooks**: cron routes require the `CRON_SECRET` bearer;
  webhook routes verify signatures; both reject everything else.

### Browser hardening
18. **Clickjacking**: `frame-ancestors 'none'` (or `X-Frame-Options: DENY`)
    on admin and intake pages.
- **Headers**: CSP, `Strict-Transport-Security`, `X-Content-Type-Options:
  nosniff`, `Referrer-Policy`, `Permissions-Policy` set in next.config.ts.
- **CSRF**: state-changing admin routes accept only POST/PUT/DELETE with
  the SameSite admin cookie, and check `Origin` where practical.

## Keeping this list current

New attack techniques appear every month. The guardian's weekly run
searches for advisories and techniques published since its last run
(Next.js, React, Supabase, Stripe, Vercel, npm supply-chain, OWASP) and
proposes additions here. When a new item is added, it goes in the section it
belongs to, with where to look in this codebase.
