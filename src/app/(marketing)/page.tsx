import type { Metadata } from 'next';
import Hero from '@/components/sections/Hero';
import Services from '@/components/sections/Services';
import AboutTeaser from '@/components/sections/AboutTeaser';
import HomeCta from '@/components/sections/HomeCta';

export const metadata: Metadata = {
  title: { absolute: 'Psychotherapy in Dublin & Online | Owen Lynch' },
  description:
    'IAHIP and ICP accredited psychotherapist in Dublin offering in-person and online therapy for anxiety, OCD, ADHD, autism, depression, relationships and LGBTQIA+ mental health.',
  alternates: {
    canonical: 'https://owenlynchtherapy.com',
  },
  openGraph: {
    title: 'Psychotherapy in Dublin & Online | Owen Lynch',
    description:
      'IAHIP and ICP accredited psychotherapist in Dublin offering in-person and online therapy for anxiety, OCD, ADHD, autism, depression, relationships and LGBTQIA+ mental health.',
    url: 'https://owenlynchtherapy.com',
    type: 'website',
    siteName: 'Owen Lynch Psychotherapy',
    locale: 'en_IE',
    images: [
      {
        url: 'https://owenlynchtherapy.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Owen Lynch Psychotherapy — Psychotherapy in Dublin & Online',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Psychotherapy in Dublin & Online | Owen Lynch',
    description:
      'IAHIP and ICP accredited psychotherapist in Dublin offering in-person and online therapy.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalBusiness',
  '@id': 'https://www.owenlynchtherapy.com/#medicalbusiness',
  name: 'Owen Lynch Psychotherapy',
  url: 'https://www.owenlynchtherapy.com',
  logo: 'https://www.owenlynchtherapy.com/logo.png',
  image: 'https://www.owenlynchtherapy.com/therapy-room.jpg',
  description:
    'Accredited integrative psychotherapist in Dublin specializing in evidence-based treatments for Anxiety, OCD, ADHD, Autism, and Trauma.',
  telephone: '+353851471689',
  email: 'info@owenlynchtherapy.com',
  priceRange: '€70-€80',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '106 Capel Street',
    addressLocality: 'Rotunda',
    addressRegion: 'Dublin 1',
    postalCode: 'D01 WY40',
    addressCountry: 'IE',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: '53.3498',
    longitude: '-6.2674',
  },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Friday', opens: '16:00', closes: '20:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '10:00', closes: '15:00' },
  ],
  medicalSpecialty: ['MedicalPsychology', 'MentalHealth'],
  knowsAbout: [
    'Psychotherapy',
    'Cognitive Behavioral Therapy',
    'Acceptance and Commitment Therapy',
    'Exposure and Response Prevention',
    'Obsessive-Compulsive Disorder',
    'Anxiety Management',
    'ADHD Support',
  ],
  founder: {
    '@type': 'Person',
    name: 'Owen Lynch',
    jobTitle: 'Accredited Psychotherapist',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: 'National University of Ireland Maynooth',
    },
    award: ['IAHIP Accredited', 'ICP Accredited'],
    sameAs: [
      'https://www.psychologytoday.com/ie/counselling/owen-lynch-dublin-dn/1745757',
      'https://psychotherapistdirectory.iahip.org/therapist/owen-lynch',
      'https://psychotherapycouncil.ie/therapist/owen-lynch/',
    ],
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <Hero />
      <Services />
      <AboutTeaser />
      <HomeCta />
    </>
  );
}
