# Discovery questions

Ask only what the request and TASTE.md leave open. Put them in one grouped
round with a recommended answer for each, so Owen can reply "yes to all
but 3". Use AskUserQuestion when there are four or fewer clear choices.

## Purpose and people
- Who is it for, and what is the one thing they must be able to do?
- What should a visitor feel in the first five seconds?
- Where will it mostly be used: phone, desktop, or both equally? On the
  move or sitting down?

## Originality
- Should it look original, or familiar and conventional? Familiar is
  right for checkout, booking and admin. Original is right for brand and
  portfolio work.
- Any references Owen loves or hates? Sites, apps, print, places, objects.
- Does he have his own ideas, sketches or a mood he can describe? Ask every
  time, even when you already have a strong direction.

## Content and structure
- What content exists already (copy, photos, logo), and what has to be made?
- Which pages or screens, and which is most important?

## Technical
- Is a database needed? It is needed for accounts, bookings, forms whose
  data is kept, or anything that changes without a redeploy. Recommend one
  that fits: Postgres (Supabase or Neon) by default; SQLite or Turso for
  small or edge apps; a document store only when the data really is
  document-shaped.
- Is a CMS needed? Ask whether non-developers will edit content. If not,
  typed content files in the repo are simpler, and that's what this repo
  does. If so, suggest a headless CMS (Sanity, Payload, Storyblok) and
  name the trade-off.
- Web, mobile app, or both? For mobile: native feel (Expo / React Native)
  or a responsive web app / PWA?
- Payments, email, calendars, logins, analytics?
- Hosting and budget constraints? Choose the platform after the
  requirements above, not before.
- For a site built for someone else: who owns the domain, hosting account,
  code and content afterwards? Who keeps the content accurate after
  launch, and is maintenance budgeted? Which legal pages and cookie
  controls are needed?

## Accessibility and reach
- Any specific users to design for (older users, low vision, people in
  distress)? For a therapy practice, assume visitors may be anxious and
  reading on a phone. Calm, clear and no surprises beats clever.
