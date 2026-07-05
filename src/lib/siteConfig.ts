// Backwards-compatible facade over the master config in src/practice.config.ts.
// Existing modules import { SITE_URL, PRACTICE, ... } from '@/lib/siteConfig';
// keep that working while the single source of truth moves to practice.config.
// New code can import from '@/practice.config' directly.
import { PRACTICE as CFG, SITE_URL as ORIGIN, SAME_AS } from '@/practice.config';

export const SITE_URL = ORIGIN;
export const BUSINESS_ID = `${SITE_URL}/#business`;
export const PERSON_ID = `${SITE_URL}/#person`;

// Re-shaped to the structure existing consumers expect (name/address/geo/...).
export const PRACTICE = {
  name: CFG.businessName,
  legalName: CFG.businessName,
  telephone: CFG.telephone,
  telephoneDisplay: CFG.telephoneDisplay,
  email: CFG.email,
  priceRange: CFG.priceRange,
  address: {
    venue: CFG.address.venue,
    streetAddress: CFG.address.streetAddress,
    addressLocality: CFG.address.addressLocality,
    postalCode: CFG.address.postalCode,
    addressCountry: CFG.address.addressCountry,
  },
  geo: CFG.geo,
  openingHours: CFG.openingHours,
  sameAs: SAME_AS,
} as const;

export const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}${CFG.assets.ogImage}`,
  width: 1200,
  height: 630,
  alt: `${CFG.businessName} — ${CFG.serviceArea}`,
} as const;
