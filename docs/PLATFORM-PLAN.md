# Platform plan — from one practice to a therapist-friendly template

How to turn this site + dashboard into something other therapists can run
without a developer holding their hand. Written after the practice-config
foundation (`src/practice.config.ts`, PR #11) landed. This is a decision
document, not a spec — read it, poke it, then we build.

---

## The core realisation

A therapist should self-serve everything they *touch* (their details,
branding, and the integrations that power their practice). The only thing
that can't be self-served is the one-time technical plumbing the app is
built on — because the app can't bootstrap the very things it runs on.

### What a therapist CAN do themselves, in the dashboard

| Thing | How | Status |
|---|---|---|
| Practice details (name, address, fees, hours, service list) | A settings form | To build |
| Branding (logo upload, brand colours, photo) | A settings form | To build |
| Google Calendar | "Connect" button (OAuth) | **Already built** ✓ |
| Stripe (payments) | "Connect with Stripe" or paste keys | To build |
| Resend (email) | Paste API key; app shows the DNS records to add | To build |

### What is a ONE-TIME technical setup (can't live in the dashboard)

The app *runs on* these, so it can't connect them from the inside —
chicken-and-egg:

- **Database (Supabase)** — the dashboard reads/writes it to load at all.
- **Hosting (Vercel)** — the app can't deploy itself.
- **Domain + DNS** — lives at the registrar, not in the app.

These stay a ~30–45 min setup done once per therapist (by you, or a guided
script + checklist — see docs/ONBOARDING.md when written). After that, the
therapist never touches infrastructure again.

**Net effect:** the scary, technical part shrinks to a one-time job; every
day-to-day and re-skinning task becomes a form in the dashboard.

---

## The architectural shift this requires (and its cost)

Today, practice config lives in a **code file** (`practice.config.ts`) and
secrets live in **environment variables**. To let a therapist edit their
own settings, config has to move into the **database**, and their API keys
(Stripe, Resend) have to be **stored and encrypted** there.

Three honest consequences:

1. **The marketing site must read config from the DB**, not a static file.
   Today the public pages are statically generated at build time. They'd
   become dynamic (or revalidate on settings change). Manageable, but a real
   change to how the site renders — and a small performance/caching cost.
2. **We'd be storing other people's secret keys.** That raises the security
   bar a lot: encryption at rest, careful access control, and the
   responsibility that comes with holding credentials. Google Calendar
   already does this (OAuth tokens in `google_oauth_tokens`, service-role
   only) — so there's a proven pattern here, but each new secret widens the
   surface.
3. **The config foundation isn't wasted** — the settings form writes exactly
   the fields `practice.config.ts` now centralises. Same map, editable UI
   instead of a code file.

**Security stance (non-negotiable for clinical data):** every therapist keeps
their **own separate Supabase database** (their clients never share a table
with another practice). Secrets are encrypted at rest and never logged. This
is the model that keeps *you* a developer, not a data processor — see the
GDPR note below.

---

## Proposed phases

### Phase 1 — Settings → Practice (branding + details)
The biggest friendliness win, and the safest (no secrets).
- A `practice_settings` table (one row) + an admin Settings page.
- Form: business name, practitioner name, accreditation + reg number,
  contact/NAP, fees, opening hours, service area; logo upload; brand colours.
- Public site + PDFs + emails read from it (via a cached server helper) with
  `practice.config.ts` as the fallback default.
- Outcome: a therapist re-skins their entire site from the dashboard.
- Rough effort: a few focused sessions. Medium.

### Phase 2 — Settings → Connections (Stripe + Resend)
- Encrypted `practice_secrets` store; a Connections tab beside the existing
  Calendar connect.
- **Stripe:** connect flow + auto-create the two payment links via API.
- **Resend:** paste key, verify sender domain (show DNS records), health check.
- Rough effort: a couple of sessions per integration + careful security
  review. Medium–high (secrets raise the bar).

### Phase 3 — Guided one-time setup (optional, later)
- A script / checklist that provisions a new therapist's Supabase + Vercel +
  domain and runs migrations, so the one-time part is ~30 min and repeatable.
- Only worth building once you're onboarding therapists regularly.

### Explicitly NOT now
Self-serve signup, billing therapists, a product marketing site, multi-tenant
shared database. Those are the "become a company" pieces — revisit only if
this genuinely takes off. Building them speculatively is how side-projects die.

---

## GDPR / security throughline (unchanged, and central)

- **Separate database per practice** — the strongest possible isolation for
  Article 9 mental-health data; also the reason you stay a developer, not a
  data processor. Each therapist is their own data controller.
- Everything already hardened travels with the template: deny-all RLS,
  service-role-only access, email kill switch, PII-free logging, consent
  capture, right-to-erasure, retention purges, 2FA.
- New secrets (Stripe/Resend keys) → encrypted at rest, service-role only,
  same posture as the existing Google OAuth tokens.
- Each clone ships a per-practice privacy policy generated from its config.

---

## Recommended next step

Build **Phase 1 (Settings → Practice)** first: highest friendliness, no
secrets, low risk, and it proves the "config in the DB, site reads it"
pattern end-to-end before we touch anyone's API keys. When you're ready,
say the word and I'll start with the `practice_settings` table + the
settings page.
