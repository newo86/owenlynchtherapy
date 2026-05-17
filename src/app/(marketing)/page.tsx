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
  '@graph': [
    {
      '@type': 'Person',
      '@id': 'https://owenlynchtherapy.com/#person',
      name: 'Owen Lynch',
      jobTitle: 'Psychotherapist',
      url: 'https://owenlynchtherapy.com',
      worksFor: { '@id': 'https://owenlynchtherapy.com/#business' },
      sameAs: [
        'https://www.psychologytoday.com/ie/counselling/owen-lynch-dublin-dn/1745757',
        'https://psychotherapistdirectory.iahip.org/therapist/owen-lynch',
        'https://psychotherapycouncil.ie/therapist/owen-lynch/',
      ],
    },
    {
      '@type': ['MedicalBusiness', 'LocalBusiness'],
      '@id': 'https://owenlynchtherapy.com/#business',
      name: 'Owen Lynch Psychotherapy',
      description:
        'IAHIP and ICP accredited psychotherapist in Dublin offering in-person and online therapy for anxiety, OCD, ADHD, autism, depression, relationships and LGBTQIA+ mental health.',
      url: 'https://owenlynchtherapy.com',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Dublin',
        addressCountry: 'IE',
      },
      areaServed: [
        { '@type': 'City', name: 'Dublin' },
        { '@type': 'Country', name: 'Ireland' },
      ],
      availableService: [
        { '@type': 'MedicalTherapy', name: 'Psychotherapy' },
        { '@type': 'MedicalTherapy', name: 'Online Therapy' },
      ],
      employee: { '@id': 'https://owenlynchtherapy.com/#person' },
    },
  ],
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
