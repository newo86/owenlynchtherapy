import type { Metadata } from 'next';
import Hero from '@/components/sections/Hero';
import Services from '@/components/sections/Services';
import AboutTeaser from '@/components/sections/AboutTeaser';
import HomeCta from '@/components/sections/HomeCta';
import { SITE_URL } from '@/practice.config';

export const metadata: Metadata = {
  title: { absolute: 'Psychotherapy in Dublin & Online | Owen Lynch' },
  description:
    'IAHIP and ICP accredited psychotherapist in Dublin. In-person and online therapy for anxiety, OCD, ADHD, autism, depression and relationships.',
  alternates: {
    canonical: `${SITE_URL}`,
    languages: {
      'en':        `${SITE_URL}`,
      'x-default': `${SITE_URL}`,
    },
  },
  openGraph: {
    title: 'Psychotherapy in Dublin & Online | Owen Lynch',
    description:
      'IAHIP and ICP accredited psychotherapist in Dublin. In-person and online therapy for anxiety, OCD, ADHD, autism, depression and relationships.',
    url: `${SITE_URL}`,
    type: 'website',
    siteName: 'Owen Lynch Psychotherapy',
    locale: 'en_IE',
    images: [
      {
        url: `${SITE_URL}/og-image.jpg`,
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

// The LocalBusiness/MedicalBusiness entity is emitted once for all marketing
// pages in (marketing)/layout.tsx — this page previously declared a
// conflicting duplicate (#medicalbusiness) with different hours and locality.

export default function HomePage() {
  return (
    <>
      <Hero />
      <Services />
      <AboutTeaser />
      <HomeCta />
    </>
  );
}
