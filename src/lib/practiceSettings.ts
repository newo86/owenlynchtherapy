import { unstable_cache } from 'next/cache';
import { PRACTICE } from '@/practice.config';

// Live practice settings (Platform plan, Phase 1).
//
// The dashboard's Settings page stores edits in the practice_settings table;
// this module merges that row over the code defaults in practice.config.ts.
// Everything is cached under the 'practice' tag and revalidated when the
// settings are saved, so static pages stay static between edits.
//
// FAIL-SAFE: any error (no DB env in a sandbox build, table missing, network)
// falls back to the code defaults — a clone renders correctly before its
// database exists.

/** The editable subset of the practice config (see src/practice.config.ts). */
export interface PracticeSettings {
  businessName: string;
  practitionerName: string;
  practitionerFirstName: string;
  jobTitle: string;
  accreditation: {
    bodyAbbrev: string;
    bodyName: string;
    regNumber: string;
    summary: string;
  };
  email: string;
  telephone: string;
  telephoneDisplay: string;
  hasInPerson: boolean;
  address: {
    venue: string;
    streetAddress: string;
    addressLocality: string;
    postalCode: string;
    addressCountry: string;
  };
  geo: { latitude: string; longitude: string };
  serviceArea: string;
  mapsEmbedUrl: string;
  fees: {
    onlineCents: number;
    inPersonCents: number;
    lowCostCents: number;
    roomCostCents: number;
  };
  sessionMinutes: number;
  priceRange: string;
  openingHours: Array<{ dayOfWeek: string; opens: string; closes: string }>;
  telehealthUrl: string;
  stripeLinks: { online: string; inPerson: string };
  gtmId: string;
  googleSiteVerification: string;
  socials: {
    instagram: string;
    psychologyToday: string;
    directoryProfiles: string[];
  };
}

/** Code defaults, derived from practice.config.ts. */
export const PRACTICE_DEFAULTS: PracticeSettings = {
  businessName: PRACTICE.businessName,
  practitionerName: PRACTICE.practitionerName,
  practitionerFirstName: PRACTICE.practitionerFirstName,
  jobTitle: PRACTICE.jobTitle,
  accreditation: { ...PRACTICE.accreditation },
  email: PRACTICE.email,
  telephone: PRACTICE.telephone,
  telephoneDisplay: PRACTICE.telephoneDisplay,
  hasInPerson: PRACTICE.hasInPerson,
  address: {
    venue: PRACTICE.address.venue,
    streetAddress: PRACTICE.address.streetAddress,
    addressLocality: PRACTICE.address.addressLocality,
    postalCode: PRACTICE.address.postalCode,
    addressCountry: PRACTICE.address.addressCountry,
  },
  geo: { ...PRACTICE.geo },
  serviceArea: PRACTICE.serviceArea,
  mapsEmbedUrl: PRACTICE.mapsEmbedUrl,
  fees: { ...PRACTICE.fees },
  sessionMinutes: PRACTICE.sessionMinutes,
  priceRange: PRACTICE.priceRange,
  openingHours: PRACTICE.openingHours.map(h => ({ ...h })),
  telehealthUrl: PRACTICE.telehealthUrl,
  stripeLinks: { ...PRACTICE.stripeLinks },
  gtmId: PRACTICE.gtmId,
  googleSiteVerification: PRACTICE.googleSiteVerification,
  socials: {
    instagram: PRACTICE.socials.instagram,
    psychologyToday: PRACTICE.socials.psychologyToday,
    directoryProfiles: [...PRACTICE.socials.directoryProfiles],
  },
};

/** Merge a stored partial over the defaults. One level deep per section —
 *  the Settings form always saves whole sections, so this stays simple. */
export function mergeSettings(stored: Partial<PracticeSettings> | null | undefined): PracticeSettings {
  if (!stored || typeof stored !== 'object') return PRACTICE_DEFAULTS;
  const d = PRACTICE_DEFAULTS;
  return {
    ...d,
    ...stored,
    accreditation: { ...d.accreditation, ...(stored.accreditation ?? {}) },
    address: { ...d.address, ...(stored.address ?? {}) },
    geo: { ...d.geo, ...(stored.geo ?? {}) },
    fees: { ...d.fees, ...(stored.fees ?? {}) },
    stripeLinks: { ...d.stripeLinks, ...(stored.stripeLinks ?? {}) },
    socials: { ...d.socials, ...(stored.socials ?? {}) },
    openingHours: stored.openingHours ?? d.openingHours,
  };
}

async function fetchPractice(): Promise<PracticeSettings> {
  try {
    // Lazy import so a build without Supabase env never touches the client.
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { data, error } = await supabaseAdmin
      .from('practice_settings')
      .select('data')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    return mergeSettings(data?.data as Partial<PracticeSettings> | undefined);
  } catch {
    return PRACTICE_DEFAULTS;
  }
}

/**
 * The live practice settings (DB over code defaults), cached under the
 * 'practice' tag. Call `revalidateTag('practice')` after saving settings.
 */
export const getPractice = unstable_cache(fetchPractice, ['practice-settings'], {
  tags: ['practice'],
});
