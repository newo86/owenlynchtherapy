/**
 * ─────────────────────────────────────────────────────────────────────────
 *  PRACTICE CONFIG — the one file a new practitioner fills in.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Everything specific to THIS therapist lives here: who they are, how to
 * reach them, their fees, their branding, their integration URLs. Clone the
 * repo, edit this file, provision the accounts (see docs/ONBOARDING.md), and
 * the whole public site + dashboard re-skins itself.
 *
 * SECRETS DO NOT GO HERE. API keys, database URLs and signing secrets live in
 * environment variables (Vercel), never in the repo. This file holds only
 * public-facing facts and non-secret configuration.
 *
 * Bespoke page *content* (the About bio, the condition-page essays, the FAQ
 * answers, blog articles) is not in this file — it lives in the page/content
 * components and is edited per practice. This config covers the structured,
 * repeated values that are otherwise scattered and easy to miss when cloning.
 */

export const PRACTICE = {
  // ── Identity ──────────────────────────────────────────────────────────
  /** Business name, e.g. "Owen Lynch Psychotherapy". Used site-wide. */
  businessName: 'Owen Lynch Psychotherapy',
  /** The practitioner's personal name, e.g. "Owen Lynch". */
  practitionerName: 'Owen Lynch',
  /** First name — used in warm email sign-offs. */
  practitionerFirstName: 'Owen',
  jobTitle: 'Psychotherapist',

  /** Professional accreditation. `regNumber` prints on legal receipts. */
  accreditation: {
    // Primary registering body shown on receipts + "Reg. No.".
    bodyAbbrev: 'IAHIP',
    bodyName: 'Irish Association of Humanistic and Integrative Psychotherapy',
    regNumber: '1890',
    // Short line used in footers / PDF footers.
    summary: 'IAHIP & ICP Accredited',
    // Post-accreditation client-hours tracker (Revenue page).
    // hoursBaseline = hours accrued before hoursCountFrom (counted from the
    // practitioner's calendars); from that date the dashboard's own session
    // records are counted automatically, 1 hour per session.
    hoursTarget: 500,
    hoursBaseline: 47,
    hoursCountFrom: '2026-06-01',
  },

  // ── Contact / NAP (name, address, phone — local-SEO critical) ─────────
  email: 'info@owenlynchtherapy.com',
  /** From-address for outgoing mail. MUST be on a Resend-verified domain. */
  emailFrom: 'Owen Lynch Psychotherapy <noreply@owenlynchtherapy.com>',
  telephone: '+353851471689',
  telephoneDisplay: '085 147 1689',

  /** Set hasInPerson false for an online-only practice (hides the venue). */
  hasInPerson: true,
  address: {
    venue: 'Insight Matters',
    streetAddress: '106 Capel Street',
    addressLocality: 'Dublin',
    addressRegion: 'Dublin',
    postalCode: 'D01 WY40',
    addressCountry: 'IE',
  },
  geo: { latitude: '53.3488', longitude: '-6.2687' },
  /** Where the practitioner serves clients, in prose. */
  serviceArea: 'Dublin & Online · Ireland & the UK',

  // Google Maps embed src for the /contact map (from Google Maps → Share →
  // Embed a map → copy the src="..." URL).
  mapsEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2381.894320464544!2d-6.270040684229736!3d53.34883197997623!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48670e87a5b8b8b7%3A0x1234567890abcdef!2s106%20Capel%20Street%2C%20Dublin%201%2C%20D01%20WY40!5e0!3m2!1sen!2sie!4v1234567890123',

  // ── Practice facts (money in CENTS) ──────────────────────────────────
  fees: {
    onlineCents: 7000,
    inPersonCents: 8000,
    lowCostCents: 6000,
    /** Flat room cost deducted from in-person NET revenue figures. */
    roomCostCents: 2000,
  },
  sessionMinutes: 50,
  /** Human-readable price range for schema.org / copy, e.g. "€70-€80". */
  priceRange: '€70-€80',

  /** Practice days — feeds Google's opening-hours display (schema.org). */
  openingHours: [
    { dayOfWeek: 'Monday', opens: '17:00', closes: '20:00' },
    { dayOfWeek: 'Tuesday', opens: '17:00', closes: '20:00' },
    { dayOfWeek: 'Friday', opens: '15:00', closes: '20:00' },
  ],

  /** The specific slots currently open to new clients — the cards on the
   *  /contact page. Empty array = fully booked (the page then leads with the
   *  waiting list instead). `note` is free text, e.g. "every second week". */
  availability: [
    { day: 'Monday', time: '7:00pm', format: 'in_person', note: '' },
    { day: 'Tuesday', time: '5:00pm', format: 'online', note: '' },
    { day: 'Friday', time: '3:00pm', format: 'in_person', note: 'every second week' },
  ] as Array<{ day: string; time: string; format: 'in_person' | 'online'; note: string }>,

  // ── Integrations (public, non-secret URLs/IDs) ───────────────────────
  /** Canonical site origin — MUST match the primary domain set in Vercel. */
  siteUrl: 'https://owenlynchtherapy.com',
  /** Telehealth room link included in online-session emails. */
  telehealthUrl: 'https://doxy.me/owenlynchtherapy',
  /** Stripe payment links (Stripe → Payment links). Per session type. */
  stripeLinks: {
    online: 'https://buy.stripe.com/8x27sN4Yx3y70ha1A17g40p',
    inPerson: 'https://buy.stripe.com/5kQ8wR8aJc4D9RK2E57g40q',
  },
  /** Google Tag Manager container id, or '' to disable analytics. */
  gtmId: 'GTM-PT5KPMD3',
  /** Google Search Console verification token, or '' if none. */
  googleSiteVerification: 'INmCeOlMzKRQuiKu2-9w4Vq6-JypCzLXvOb0Mjfj2xY',

  /** Public profile / social links (schema.org sameAs + footer). */
  socials: {
    instagram: 'https://www.instagram.com/owenlynchtherapy',
    psychologyToday: 'https://www.psychologytoday.com/ie/counselling/owen-lynch-dublin-dn/1745757',
    directoryProfiles: [
      'https://psychotherapistdirectory.iahip.org/therapist/owen-lynch',
      'https://psychotherapycouncil.ie/therapist/owen-lynch/',
    ],
  },

  // ── Brand ─────────────────────────────────────────────────────────────
  // NOTE: these hexes must be kept in sync with the Tailwind @theme tokens in
  // src/app/globals.css (the CSS is the source for utility classes; this
  // mirror is for inline styles, PDFs and emails). Change both when rebranding.
  brand: {
    forest: '#2A4D3C',
    forestDeep: '#2D5A42',
    sage: '#4F8A68',
    terracotta: '#C85A1A',
    terracottaDark: '#A64810',
    gold: '#D4A843',
    linen: '#F5F0E8',
  },
  /** Logo + share assets in /public. */
  assets: {
    logoHorizontalPdf: '/images/logo-horizontal-pdf.png',
    ogImage: '/og-image.jpg',
  },
} as const;

// ── Derived helpers (don't edit — computed from the config above) ────────

export const SITE_URL = PRACTICE.siteUrl;
export const BUSINESS_ID = `${SITE_URL}/#business`;
export const PERSON_ID = `${SITE_URL}/#person`;

export const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}${PRACTICE.assets.ogImage}`,
  width: 1200,
  height: 630,
  alt: `${PRACTICE.businessName} — ${PRACTICE.serviceArea}`,
} as const;

/** All public profile URLs as a flat array for schema.org `sameAs`. */
export const SAME_AS: string[] = [
  PRACTICE.socials.psychologyToday,
  ...PRACTICE.socials.directoryProfiles,
  PRACTICE.socials.instagram,
].filter(Boolean);
