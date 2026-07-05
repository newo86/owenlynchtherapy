# The platform work, explained (July 2026)

*Written for Owen — plain English, no jargon where avoidable.*

## The goal

Turn your site + dashboard into something that can be set up for another
therapist in an afternoon, without you ever touching (or being responsible
for) their client data — while your own site keeps working exactly as it does
today.

## What was actually done

**1. One "fill in the blanks" file.**
Everything that makes the site *yours* — your name, IAHIP number, phone,
address, fees, hours, doxy.me link, Stripe links — used to be scattered
through dozens of files. It now lives in one place
(`src/practice.config.ts`). Receipts, emails, the footer and Google's
business listing all read from it. For a new therapist, most of the
personalisation is editing this one file.

**2. A Settings page on your dashboard.**
New cog icon in the sidebar. It shows those same details in a normal form —
names, accreditation, contact, fees, hours, links, profiles — and **Save**
puts them live on the website, receipts and emails within a page refresh. So
when your fees or hours change, you edit them yourself instead of asking
Claude. (This is also what makes the product self-service for future
customers.)

Nothing saves until you press Save, the form refuses obviously-broken values
(a fee of €5,000, a link that isn't https), and if anything ever goes wrong
reading the saved settings the site quietly falls back to the built-in
values — it can never render a blank page because of this feature.

**3. A spin-up manual.**
`docs/ONBOARDING.md` is the step-by-step recipe for setting up a new
therapist: which accounts they create (their own Supabase, Resend, Stripe,
Vercel, Google), every environment variable, and a first-run test checklist.
You (or a Claude session following it) do this once per customer; after that
they self-serve through their own Settings page.

## The privacy design (the part you cared most about)

Each therapist runs on **their own accounts**. Their client data sits in
*their* database, their emails go through *their* Resend, their payments
through *their* Stripe. You hand over a configured copy of the software —
you never host, see, or process their client data, so you are not a data
processor under GDPR. Their obligations run directly between them and their
own providers. `docs/ONBOARDING.md` §8 spells out the GDPR checklist for each
new practice.

## What did NOT change

- **Your data.** No existing table was touched. The only database change is
  one **new, empty** table for the Settings page. Clients, sessions, intake
  forms, receipts: all exactly as they were.
- **Your site.** The defaults in the config file are your current details, so
  the public site renders identically. (The footer and Google listing now
  *read* from settings, but the values are the same.)
- **Your workflow.** Reminders, receipts, Stripe, calendar sync — untouched.

## The one thing you need to do

Run `supabase/migrations/practice_settings.sql` in the Supabase SQL editor
(same routine as before). Until then the Settings page politely tells you the
table is missing and keeps Save disabled — nothing breaks.

## What's deliberately left for later

- Brand colours/fonts/logo via the Settings page (today they're changed in
  code during spin-up).
- Moving the remaining hard-coded odds and ends (some email addresses inside
  reminder/intake routes, the "Good morning, Owen" greeting) onto the config.
- A saved "base schema" file for the original tables — noted in the runbook,
  to be captured the first time you clone for someone.
- A per-practice privacy policy generator.
