<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-context -->
# Owen Lynch Psychotherapy — Project Context

Custom website for owenlynchtherapy.com. Private psychotherapy practice, Dublin & online.

## Stack
- Next.js 16.2 (App Router) + TypeScript + Tailwind CSS
- Sanity.io (headless CMS) for content
- Supabase (Postgres) for the admin/intake data
- Resend (email), Stripe (payments), Google Calendar (two-way sync)
- Deployed on Vercel · repo: newo86/owenlynchtherapy

## Public site
Pages: Home, About, Services, Contact, FAQ. Blog in progress.

## Admin dashboard — handle with care
- Lives at /admin/intake, password-protected via INTAKE_ADMIN_SECRET
- Client intake forms, PDF generation, email receipts, session tracking, week calendar
- Do NOT rename or remove existing API routes (generate-token, submit,
  download-pdf, mark-attended, send-receipt, auth/google, admin/calendar)
- Supabase tables clients, sessions, intake_submissions, intake_tokens already
  exist — don't recreate them
- Google Calendar is two-way: the app reads events for the week view AND writes
  back — sessions/clients created, rescheduled or deleted in-app push to the
  practice's primary calendar via createCalendarEvent / updateCalendarEvent /
  deleteCalendarEvent in src/lib/googleOAuth.ts (OAuth scope calendar.events).
  Exception: the reconcileCalendar sync job (src/lib/calendarSync.ts) is
  deliberately read-only toward Google — it only updates Supabase — to avoid
  sync loops; keep it that way.
- Run npm run build locally before pushing to catch TypeScript errors

## Branding
- Colours: forest green #2A4D3C (primary bg), sage #4F8A68, terracotta #C85A1A
  (accent/buttons only), gold #D4A843 (dividers/tile accents only), linen #F5F0E8
- Fonts: Avenir Light / Montserrat 300 fallback for headings (weight 300);
  Poppins for body and nav
- Voice: warm, honest, human. No wellness buzzwords, no overclaiming, no
  promising outcomes. Stigma-free, non-deficit language throughout.
<!-- END:project-context -->
