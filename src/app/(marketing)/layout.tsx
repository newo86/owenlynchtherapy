import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileBottomNav from '@/components/ui/mobile-bottom-nav';
import { SITE_URL, BUSINESS_ID, PERSON_ID, PRACTICE } from '@/lib/siteConfig';

// The ONE canonical business entity, emitted on every marketing page.
// Individual pages reference it by `@id` (BUSINESS_ID / PERSON_ID) instead of
// re-declaring the business — previously home, services and contact each
// declared their own copy with conflicting @ids, opening hours and localities,
// which confuses Google's entity reconciliation.
const businessJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['LocalBusiness', 'MedicalBusiness'],
      '@id': BUSINESS_ID,
      name: PRACTICE.name,
      url: SITE_URL,
      logo: `${SITE_URL}/images/logo-horizontal-pdf.png`,
      image: `${SITE_URL}/og-image.jpg`,
      description:
        'IAHIP and ICP accredited integrative psychotherapy in Dublin and online across Ireland and the UK.',
      telephone: PRACTICE.telephone,
      email: PRACTICE.email,
      priceRange: PRACTICE.priceRange,
      address: {
        '@type': 'PostalAddress',
        streetAddress: `${PRACTICE.address.venue}, ${PRACTICE.address.streetAddress}`,
        addressLocality: PRACTICE.address.addressLocality,
        postalCode: PRACTICE.address.postalCode,
        addressCountry: PRACTICE.address.addressCountry,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: PRACTICE.geo.latitude,
        longitude: PRACTICE.geo.longitude,
      },
      openingHoursSpecification: PRACTICE.openingHours.map(h => ({
        '@type': 'OpeningHoursSpecification',
        ...h,
      })),
      medicalSpecialty: ['MedicalPsychology', 'MentalHealth'],
      founder: { '@id': PERSON_ID },
      sameAs: PRACTICE.sameAs,
    },
    {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: 'Owen Lynch',
      jobTitle: 'Psychotherapist',
      url: `${SITE_URL}/about`,
      worksFor: { '@id': BUSINESS_ID },
    },
  ],
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(businessJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <Header />
      {/* pb-20 on mobile accounts for the fixed bottom nav height */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <hr style={{ borderColor: '#D4A843', borderTopWidth: '1px', margin: 0 }} />
      <Footer />
      <MobileBottomNav />
    </>
  );
}
