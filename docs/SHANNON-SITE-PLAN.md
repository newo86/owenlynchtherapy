# Shannon Egan Psychotherapy — Website Build Plan

**Client:** Shannon Egan, MA — Humanistic & Integrative Psychotherapist
**Domain:** shannonegantherapy.ie (already purchased, not yet attached)
**Package:** Standard, €500 (agreed 23 June 2026) — includes three rounds of changes
**Built by:** Owen Lynch · This document is the single source of truth for the build.
**Handoff-ready:** this plan is written so it can be given to Claude Code as-is to build the site.

---

## 1. Scope — what the €500 Standard package includes

Everything below is in scope; anything not listed is out of scope.

- Up to **5 pages**: Home, About, Services, FAQ, Contact
- Mobile-friendly, fast, accessible
- **Short brand & style guide + basic design assets** (section 4 of this doc, plus SVG motifs)
- **SEO & local search setup** with Google Business Profile guidance (section 8)
- **Light editing of Shannon's words** (done — drafted copy in section 7)
- Contact form that emails straight to Shannon; **nothing about visitors is stored**
- Help getting it live (domain + Vercel walkthrough)
- Three rounds of changes

**Explicitly out of scope:** client dashboard / intake system, blog, online booking,
payments, CMS. (The reference site owenlynchtherapy.com has these — do **not** copy them.)

## 2. Design brief

Shannon likes the **spacing and flow** of owenlynchtherapy.com — clear, easy to
navigate, not overwhelming amounts of text. Carry over the *structure and rhythm*,
**not** the visual identity. It must not look like the same site.

Carry over (structure):
- Generous section padding (`py-24` desktop, less on mobile), `max-w-6xl` content
  containers, roomy `line-height: 1.8` body text
- Section rhythm on Home: Hero → what I help with → about teaser → single clear CTA
- Subtle scroll-reveal (fade + rise, ~0.55s, honours `prefers-reduced-motion`)
- Zero-JS FAQ accordion (native `<details>`/`<summary>`)
- Short paragraphs, one idea per section, low text density

Do differently (identity):
- Completely different palette (from Shannon's logo — section 4)
- Serif display headings (her logo is serif; Owen's site is all sans, weight 300)
- Her logo's **plant sprig, sun, and river** motifs as recurring decorative SVG
  accents (section dividers, list bullets, card corners) instead of Owen's circles
- Softer, more watercolour/organic feel vs. Owen's flat forest-green blocks

## 3. Tech stack

- **Astro 5** (static output) + **Tailwind CSS v4** (`@theme` tokens, like Owen's site)
- **One serverless endpoint** (Astro Action or `src/pages/api/contact.ts` with
  `prerender = false`) for the contact form → **Resend** → Shannon's inbox.
  Honeypot field + simple time-trap for spam. **No database, no logging of
  submissions** — the email is the only record. Privacy note on the form.
- **Vercel** hosting (Shannon's own account — Owen walks her through setup, it
  stays hers). Domain `shannonegantherapy.ie` attached in Vercel, apex → www
  redirect (or the reverse, pick one canonical host).
- New repo (e.g. `shannonegantherapy`) — **not** inside owenlynchtherapy.
- Env vars: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`. Her email will change from
  shannon.psychotherapy@gmail.com later — it must only live in that env var and
  one `src/config.ts` constant (displayed email), so the swap is a 2-line change.

## 4. Brand & style guide (deliverable)

### 4.1 Palette — drawn from the logo

Direction Owen chose: **white/warm ivory base + the logo's orange/coral + copper/gold**,
with the logo's deep teal-navy as the ink colour (near-black text is needed anyway
for contrast, and it's the monogram "S" colour — it reads as neutral, not a 4th colour).

| Token | Hex | Use |
|---|---|---|
| `--color-ivory` | `#FBF9F5` | page background (warm white) |
| `--color-ink` | `#1F4257` | headings + body text (logo's deep teal-navy) |
| `--color-coral` | `#E2795F` | primary accent: buttons, links, highlights (logo's river/leaf coral) |
| `--color-coral-deep` | `#D05A3E` | button hover / darker coral from logo |
| `--color-copper` | `#C9922E` | hairline dividers, small accents, sun motif (logo's gold ring) |
| `--color-mist` | `#EEF1EE` | alternate section background (very pale sage-grey tint) |

Rules: coral is for actions and emphasis only — never large background areas.
Copper is decorative only (dividers, motifs) — never text on light backgrounds
(fails contrast). Body text is always ink on ivory/mist (both pairs pass WCAG AA;
ink on ivory ≈ 10:1). White text only ever sits on ink or coral-deep.

### 4.2 Typography

- **Headings:** *Cormorant Garamond* (Google Fonts, weights 500/600) — an elegant
  serif matching the logo's lettering. Fallback: Georgia, serif.
- **Body & nav:** *Nunito Sans* (400/600) — warm, rounded, highly readable.
- Scale (same bands as Owen's proven scale): H1 40–48px, H2 24–32px, body 16–18px,
  captions 12–14px. Define once in Tailwind `@theme`, never per-component.
- Body line-height 1.8.

### 4.3 Motifs & assets (basic design assets deliverable)

Recreate three elements from the logo as small inline SVGs (single-colour, so they
can take any token colour):
1. **Sprig** — the leafy branch: page-top flourish on About/Services, list bullets
2. **Sun** — the gold circle: FAQ/section accent, favicon companion
3. **River** — the flowing wave line: section divider between Home sections

Plus: favicon set from the SE monogram, OG share image (logo on ivory, 1200×630),
and the logo exported as optimised SVG/PNG for header (small, horizontal lockup if
possible) and footer (full circular version).

### 4.4 Voice

Same principles as Owen's copy standards: warm, honest, human. No wellness
buzzwords, no promising outcomes, stigma-free and non-deficit language.
Shannon's register is slightly softer/more nurturing than Owen's.

## 5. Site map & page structure

Nav: Home · About · Services · FAQ · Contact — plus a coral "Get in touch" button.
Footer: logo, contact details, MIAHIP/ICP registration line, links, privacy note.

### Home
1. **Hero** — headline + subline, warm photo of Shannon (or room), CTA "Get in touch",
   quiet secondary link "How I work". River divider below.
2. **How therapy can help** — 3 short cards (sprig bullets): what she helps with, distilled
3. **About teaser** — photo + 2 sentences + link to About
4. **Practical strip** — €80 · 50 minutes · In person in Bray & online across Ireland · Adults
5. **CTA band** (ink background, white text, coral button)

### About
Hero intro → her story/approach (the merged bio, section 7.2) → qualifications &
registration block (MA · MIAHIP · ICP · OBF insured · EMDR in training, with links)
→ photo → CTA.

### Services
What sessions are like → **what I can help with** (the grouped list, 7.3) →
fees & practicalities (€80/50 min, weekly, in person Tue–Fri in Bray + online,
adults only, 24-hour cancellation) → CTA.

### FAQ
Native-details accordion, ~10 questions (7.4) → CTA.

### Contact
Contact form (name, email, phone optional, message) + direct email + address with
map link + "covering South Dublin & Wicklow, online across Ireland" + hours note.
Privacy line under the form: *"This form sends your message straight to me by
email — nothing is stored on the website."*
Accessibility note (7.5) — honest, gentle wording about no wheelchair access,
offering online sessions as an alternative.

## 6. Facts (single source of truth — use exactly these)

- **Name/credentials:** Shannon Egan, MA — pre-accredited member MIAHIP, member ICP; insured with OBF; currently training in EMDR
  *(⚠️ confirm with Shannon: is she accredited MIAHIP or pre-accredited? Get her MIAHIP, ICP and Psychology Today profile links — placeholders in copy below.)*
- **Fee:** €80 per 50-minute session, in person and online. Weekly sessions; number varies by client need.
- **Cancellation:** 24 hours' notice, or the full fee applies.
- **Clients:** adults only (18+).
- **Hours:** Tuesday–Friday (flexible — don't publish exact times yet).
- **Location:** Unit 6, Cedar Industrial Estate, Killarney Road, Bray, Co. Wicklow, A98 N152. Not wheelchair accessible.
- **Coverage:** South Dublin & Wicklow in person; online across Ireland.
- **Email:** shannon.psychotherapy@gmail.com (will change — keep configurable). No phone published yet (⚠️ ask Shannon if she wants one listed).
- **Domain:** shannonegantherapy.ie

## 7. Drafted copy (light edit of Shannon's words — for her approval)

### 7.1 Home

**H1:** A warm, supportive space to explore what's going on for you.
**Sub:** I'm Shannon, a Humanistic and Integrative Psychotherapist working in Bray,
Co. Wicklow and online across Ireland. Whatever brings you here, you're welcome to
take it at your own pace.

**How therapy can help (3 cards):**
- *Feeling overwhelmed* — Anxiety, stress, low mood or panic can make everyday life
  feel heavy. Therapy offers steady support and space to breathe.
- *Life changing around you* — Loss, transitions, relationship difficulties or the
  weight of past experiences. Together we can make sense of what's happening.
- *Wanting something more* — Greater confidence, self-understanding or balance.
  You don't need to be in crisis to benefit from therapy.

**Practical strip:** €80 per session · 50 minutes · In person in Bray & online across Ireland · Adults (18+)

**CTA band:** Ready to take the first step? → *Get in touch*

### 7.2 About (merged from her two bios, simplified)

I'm a qualified Humanistic and Integrative Psychotherapist, holding a Higher Diploma
and a Master's degree in Humanistic and Integrative Psychotherapy.

I offer a warm, supportive and non-judgmental space where you can explore whatever
is happening in your life, at your own pace. Whether you're struggling with anxiety,
stress, relationship difficulties, low self-esteem, a life transition, or the impact
of past experiences, therapy is an opportunity to find greater understanding,
clarity and support.

My approach is collaborative and tailored to you. Drawing on a range of therapeutic
approaches, I work in a way that recognises the uniqueness of each person. I'm also
trauma-informed, which means I place real importance on creating a safe, respectful
environment where you feel heard and understood.

I believe every person has the capacity for growth, healing and meaningful change.
At the heart of my work is the therapeutic relationship — built on trust, empathy
and authenticity. My aim is to support you in developing greater self-awareness,
resilience and confidence as you move towards a life that feels more balanced.

**Qualifications & registration block:**
- MA & H.Dip. in Humanistic and Integrative Psychotherapy
- Member, Irish Association of Humanistic & Integrative Psychotherapy (MIAHIP) [link]
- Member, Irish Council for Psychotherapy (ICP) [link]
- Professionally insured (OBF)
- Currently training in EMDR
- [Psychology Today profile — link]

### 7.3 What I can help with (26 items grouped into 6 — full list available on request/FAQ)

- **Anxiety & stress** — anxiety, panic, worry, stress, burnout and work-related issues
- **Low mood & self-worth** — depression, low self-esteem, guilt and shame, loneliness
- **Relationships & family** — relationship difficulties, family issues, communication, attachment, abandonment or rejection
- **Loss & change** — grief and bereavement, life transitions, health and illness
- **Trauma & past experiences** — trauma, bullying or harassment, self-harm, eating difficulties
- **Growth & self-understanding** — personal development, self-compassion, meaning and values, anger, neurodivergence, OCD, menstrual health and wellbeing

*(Keep the full A–Z list from her notes in a collapsible "full list" details element
for SEO — every term is a search query someone types.)*

### 7.4 FAQ (draft ~10)

1. **How much does a session cost?** €80 for a 50-minute session, in person or online.
2. **How long is a session, and how often do we meet?** Sessions are 50 minutes,
   usually weekly. How many sessions varies from person to person — some come for
   a few months, others longer. We'll review together as we go.
3. **Do you work online or in person?** Both. In person in Bray, Co. Wicklow, and
   online across Ireland.
4. **What happens in the first session?** It's a chance to talk about what brings
   you, ask questions, and see how it feels to work together. There's no pressure
   and no commitment beyond that first meeting.
5. **What's your cancellation policy?** I ask for 24 hours' notice. With less
   notice, the full session fee applies.
6. **Is everything confidential?** Yes — what you share stays between us, within
   the standard ethical limits of psychotherapy (I'll explain these clearly when
   we meet).
7. **Do you work with couples or under-18s?** I work with adults (18+),
   individually.
8. **What kind of therapy do you offer?** Humanistic and Integrative psychotherapy —
   a collaborative, trauma-informed approach drawing on a range of therapeutic
   methods to suit your needs.
9. **Is your practice wheelchair accessible?** Unfortunately my practice room in
   Bray isn't wheelchair accessible. I offer online sessions as an alternative —
   please get in touch and we'll find what works.
10. **How do I get started?** Send me a message through the contact page or email
    me directly. I'll reply to arrange a first session.

### 7.5 Contact page intro

Getting in touch is often the hardest step — there's no obligation, and no
pressure. Send a message and I'll get back to you as soon as I can, usually within
a couple of working days.

## 8. SEO & local search setup (deliverable)

- **Canonical host:** decide www vs apex, 308-redirect the other. HTTPS via Vercel.
- **Titles/descriptions** (patterns):
  - Home: `Psychotherapist in Bray, Co. Wicklow | Shannon Egan Psychotherapy`
  - About: `About Shannon | Humanistic & Integrative Psychotherapist, Bray`
  - Services: `Therapy Services & Fees | Counselling in Bray & Online, Ireland`
  - FAQ: `FAQ | Shannon Egan Psychotherapy, Bray & Online`
  - Contact: `Contact | Psychotherapy in Bray, South Dublin & Online`
- **Structured data:** JSON-LD `ProfessionalService` (name, address A98 N152, geo,
  areaServed: Bray/Wicklow/South Dublin/Ireland, priceRange €80) + `Person`
  (Shannon, credentials, memberOf MIAHIP/ICP) + `FAQPage` on the FAQ.
- `sitemap.xml` + `robots.txt` (Astro integrations), OG/Twitter meta with share image.
- Keywords woven naturally (never stuffed): *psychotherapist Bray*, *counselling
  Wicklow*, *therapist South Dublin*, *online therapy Ireland*, plus the
  "what I help with" terms.
- Performance: static HTML, self-hosted font subsets, `loading="lazy"` images,
  target Lighthouse ≥95 across the board.
- **Google Business Profile (guidance for Shannon):** create/claim profile as
  "Shannon Egan Psychotherapy", category *Psychotherapist*; use the exact address
  & new domain; choose whether to show the unit address or "service area"
  (South Dublin & Wicklow) — service-area often suits therapists for privacy;
  add photos, hours (Tue–Fri), link to site; verify by post/phone. Also: register
  on MIAHIP & ICP directories and update her Psychology Today profile to link to
  the new domain — those backlinks matter most in this niche.

## 9. Build phases (checklist for Claude Code)

**Phase 1 — Scaffold**
- [ ] New Astro 5 project, Tailwind v4, `@theme` tokens from section 4.1/4.2
- [ ] Fonts via `astro-font` or self-hosted subsets (Cormorant Garamond, Nunito Sans)
- [ ] Base layout: header (logo, nav, CTA button), footer, skip-link, meta component
- [ ] `src/config.ts` with all facts from section 6 (email, address, fee, links)

**Phase 2 — Components & motifs**
- [ ] Sprig / sun / river SVG components (single-colour, `currentColor`)
- [ ] Scroll-reveal utility (IntersectionObserver + CSS, reduced-motion safe)
- [ ] Card, CTA band, practical-strip, FAQ `<details>` accordion components

**Phase 3 — Pages** (copy from section 7)
- [ ] Home, About, Services, FAQ, Contact

**Phase 4 — Contact form**
- [ ] Resend endpoint, honeypot + time-trap, success/error states, no persistence
- [ ] Test deliverability to Gmail (SPF/DKIM: send from a domain address via
      Resend once domain is verified, reply-to visitor)

**Phase 5 — SEO & polish**
- [ ] JSON-LD, sitemap, robots, OG image, favicons, 404 page
- [ ] Accessibility pass: landmarks, focus states, contrast, keyboard nav
- [ ] Lighthouse ≥95; test iPhone SE width → desktop

**Phase 6 — Launch**
- [ ] Shannon's Vercel account, connect repo, env vars, attach shannonegantherapy.ie
- [ ] GBP + directory guidance (section 8) sent to Shannon
- [ ] Round 1 of 3 review with Shannon

## 10. Open questions for Shannon (need answers before Phase 3 is final)

1. Photos — professional photos of her (and the room)? Owen to ask his photographer friend.
2. MIAHIP status (member vs pre-accredited) + her MIAHIP, ICP, Psychology Today links.
3. Publish a phone number, or email-only contact?
4. New email address (post-holiday) — site ships with Gmail, swapped via config later.
5. Approve the palette direction (ivory + coral + copper, teal-navy ink) and drafted copy.
