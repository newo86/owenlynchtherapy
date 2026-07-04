// Single source of truth for the public site's canonical origin and
// local-business facts (NAP: name / address / phone). Import from here rather
// than hardcoding URLs so a future host change (apex vs www) is one edit.
//
// IMPORTANT: this must match the PRIMARY domain configured in Vercel. The apex
// currently 307-redirects to www while canonicals point at the apex — the fix
// tracked in docs/ROADMAP.md is to make the apex primary in Vercel so serving,
// canonicals, sitemap and the Stripe webhook all align on this origin.
export const SITE_URL = 'https://owenlynchtherapy.com';

export const BUSINESS_ID = `${SITE_URL}/#business`;
export const PERSON_ID = `${SITE_URL}/#person`;

export const PRACTICE = {
  name: 'Owen Lynch Psychotherapy',
  legalName: 'Owen Lynch Psychotherapy',
  telephone: '+353851471689',
  telephoneDisplay: '085 147 1689',
  email: 'info@owenlynchtherapy.com',
  priceRange: '€70-€80',
  address: {
    venue: 'Insight Matters',
    streetAddress: '106 Capel Street',
    addressLocality: 'Dublin',
    postalCode: 'D01 WY40',
    addressCountry: 'IE',
  },
  geo: { latitude: '53.3488', longitude: '-6.2687' },
  // Practice days (feeds Google's opening-hours display). Session days are
  // Monday/Tuesday evenings and Friday afternoons — schema.org can't express
  // "every second Friday", so Friday is listed plainly. Keep roughly in sync
  // with the availability shown on /contact.
  openingHours: [
    { dayOfWeek: 'Monday', opens: '17:00', closes: '20:00' },
    { dayOfWeek: 'Tuesday', opens: '17:00', closes: '20:00' },
    { dayOfWeek: 'Friday', opens: '15:00', closes: '20:00' },
  ],
  sameAs: [
    'https://www.psychologytoday.com/ie/counselling/owen-lynch-dublin-dn/1745757',
    'https://psychotherapistdirectory.iahip.org/therapist/owen-lynch',
    'https://psychotherapycouncil.ie/therapist/owen-lynch/',
    'https://www.instagram.com/owenlynchtherapy',
  ],
} as const;

export const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}/og-image.jpg`,
  width: 1200,
  height: 630,
  alt: 'Owen Lynch Psychotherapy — Psychotherapy in Dublin & Online',
} as const;
