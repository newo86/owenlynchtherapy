import type { Metadata } from 'next';
import Hero from '@/components/sections/Hero';
import Services from '@/components/sections/Services';
import AboutTeaser from '@/components/sections/AboutTeaser';
import HomeCta from '@/components/sections/HomeCta';

export const metadata: Metadata = {
  title: { absolute: 'Psychotherapy in Dublin & Online | Owen Lynch' },
  description:
    'IAHIP and ICP accredited psychotherapist in Dublin. In-person and online therapy for anxiety, OCD, ADHD, autism, depression and relationships.',
  alternates: {
    canonical: 'https://owenlynchtherapy.com',
    languages: {
      'en':        'https://owenlynchtherapy.com',
      'x-default': 'https://owenlynchtherapy.com',
    },
  },
  openGraph: {
    title: 'Psychotherapy in Dublin & Online | Owen Lynch',
    description:
      'IAHIP and ICP accredited psychotherapist in Dublin. In-person and online therapy for anxiety, OCD, ADHD, autism, depression and relationships.',
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
