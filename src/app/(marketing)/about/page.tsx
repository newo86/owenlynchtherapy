import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import PsychologyTodayBadge from '@/components/sections/PsychologyTodayBadge';

export const metadata: Metadata = {
  title: 'About Owen Lynch | IAHIP & ICP Accredited Psychotherapist Dublin',
  description:
    'Owen Lynch is an IAHIP and ICP accredited integrative psychotherapist based in Dublin, working with adults in person and online across Ireland and the UK.',
  alternates: { canonical: 'https://owenlynchtherapy.com/about' },
  openGraph: {
    title: 'About Owen Lynch | IAHIP & ICP Accredited Psychotherapist Dublin',
    description:
      'Owen Lynch is an IAHIP and ICP accredited integrative psychotherapist based in Dublin, working with adults in person and online across Ireland and the UK.',
    url: 'https://owenlynchtherapy.com/about',
    type: 'profile',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': 'https://owenlynchtherapy.com/#person',
  name: 'Owen Lynch',
  jobTitle: 'Psychotherapist',
  description:
    'IAHIP and ICP accredited integrative psychotherapist based in Dublin, working with adults in person and online across Ireland and the UK.',
  url: 'https://owenlynchtherapy.com',
  image: 'https://owenlynchtherapy.com/images/Owen2.jpg',
  worksFor: { '@id': 'https://owenlynchtherapy.com/#business' },
  sameAs: [
    'https://www.psychologytoday.com/ie/counselling/owen-lynch-dublin-dn/1745757',
    'https://psychotherapistdirectory.iahip.org/therapist/owen-lynch',
    'https://psychotherapycouncil.ie/therapist/owen-lynch/',
  ],
  hasCredential: [
    {
      '@type': 'EducationalOccupationalCredential',
      name: "Master's in Integrative Psychotherapy (Level 9)",
      credentialCategory: 'degree',
      recognizedBy: { '@type': 'Organization', name: 'Dublin Business School' },
    },
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'Higher Diploma in Counselling and Psychotherapy (Level 8)',
      credentialCategory: 'degree',
      recognizedBy: { '@type': 'Organization', name: 'Dublin Business School' },
    },
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'IAHIP Accredited Member',
      credentialCategory: 'professionalCertificate',
      recognizedBy: {
        '@type': 'Organization',
        name: 'Irish Association of Humanistic and Integrative Psychotherapy',
        url: 'https://www.iahip.org',
      },
    },
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'Registered Psychotherapist',
      credentialCategory: 'professionalCertificate',
      recognizedBy: {
        '@type': 'Organization',
        name: 'Irish Council for Psychotherapy',
        url: 'https://psychotherapycouncil.ie',
      },
    },
  ],
  knowsAbout: [
    'Psychotherapy', 'Integrative Therapy', 'CBT', 'ACT', 'ERP', 'Psychodynamic Therapy',
    'OCD', 'Anxiety', 'ADHD', 'Autism', 'Depression', 'Trauma', 'LGBTQIA+ Mental Health',
  ],
};

const approaches = [
  {
    heading: 'Integrative',
    body: "I don't follow a single fixed model. I draw on ACT, CBT, ERP, psychodynamic, and person-centred approaches — adapting how I work to fit you, not the other way around.",
  },
  {
    heading: 'Honest & Direct',
    body: "I'll engage genuinely with what you bring — offering perspective, naming what I notice, and challenging you when that's useful. Always with care, never with judgment.",
  },
  {
    heading: 'Specialist Focus',
    body: 'I have particular experience with OCD, anxiety, ADHD, autism, depression, trauma, relationships, and LGBTQIA+ mental health including chemsex support.',
  },
];

const credentials = [
  {
    text: "Master's in Integrative Psychotherapy (Level 9), Dublin Business School",
    link: null,
  },
  {
    text: 'Higher Diploma in Counselling and Psychotherapy (Level 8), Dublin Business School',
    link: null,
  },
  {
    text: 'Accredited member of the Irish Association of Humanistic and Integrative Psychotherapy (IAHIP)',
    link: 'https://psychotherapistdirectory.iahip.org/therapist/owen-lynch',
  },
  {
    text: 'Registered with the Irish Council for Psychotherapy (ICP)',
    link: 'https://psychotherapycouncil.ie/therapist/owen-lynch/',
  },
  {
    text: "Honours Bachelor's Degree in Biomedical Science, National University of Ireland Maynooth",
    link: null,
  },
  {
    text: 'Higher Diploma in Web Development, Computer Science',
    link: null,
  },
  {
    text: 'Certified Yoga Teacher',
    link: null,
  },
];

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* ── Section 1: Hero ── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="relative overflow-hidden pt-[100px] pb-[60px] md:pt-[120px] md:pb-[80px] px-4 sm:px-6 lg:px-8"
        aria-labelledby="about-hero-heading"
      >
        <PageHeroCircles />

        <div className="relative z-10 max-w-6xl mx-auto">
          <p className="relative z-10 text-white md:text-orange text-xs font-semibold uppercase tracking-[2px] mb-5">
            <a href="https://psychotherapistdirectory.iahip.org/therapist/owen-lynch" target="_blank" rel="noopener noreferrer" className="hover:underline">IAHIP</a>
            {' & '}
            <a href="https://psychotherapycouncil.ie/therapist/owen-lynch/" target="_blank" rel="noopener noreferrer" className="hover:underline">ICP</a>
            {' Accredited Psychotherapist'}
          </p>
          <h1
            id="about-hero-heading"
            className="font-heading font-light text-4xl sm:text-5xl lg:text-[3.25rem] leading-tight text-cream"
          >
            About Owen Lynch
          </h1>
        </div>
      </section>

      {/* ── Section 2: Introduction ── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="py-20 px-4 sm:px-6 lg:px-8"
        aria-labelledby="about-intro-heading"
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 lg:gap-16 items-start">

          {/* Portrait */}
          <div className="w-full md:w-[300px] lg:w-[340px] shrink-0">
            <Image
              src="/images/Owen2.jpg"
              alt="Owen Lynch, psychotherapist Dublin"
              width={4352}
              height={6528}
              className="w-full h-auto rounded-xl object-cover"
              sizes="(max-width: 768px) 100vw, 340px"
              priority
            />
          </div>

          {/* Text */}
          <div className="flex-1">
            <p className="text-orange text-xs font-semibold uppercase tracking-[2px] mb-5">
              About me
            </p>
            <h2
              id="about-intro-heading"
              className="font-heading font-light text-3xl sm:text-4xl text-forest mb-8"
            >
              Hello, I&apos;m Owen
            </h2>

            <p className="font-normal text-sm text-gray-600 leading-[1.8] mb-5">
              I&apos;m an{' '}
              <a href="https://psychotherapistdirectory.iahip.org/therapist/owen-lynch" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-orange/50 hover:decoration-orange transition-colors">IAHIP</a>
              {' '}and{' '}
              <a href="https://psychotherapycouncil.ie/therapist/owen-lynch/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-orange/50 hover:decoration-orange transition-colors">ICP</a>
              {' '}accredited integrative psychotherapist based in Dublin. I work with
              adults in person and online across Ireland and the UK.
            </p>
            <p className="font-normal text-sm text-gray-600 leading-[1.8] mb-5">
              I adapt therapy to you. We might focus on what&apos;s happening now, or take time to
              understand where things come from. My work draws on approaches including ACT, CBT,
              ERP, psychodynamic, and person-centred therapy.
            </p>
            <p className="font-normal text-sm text-gray-600 leading-[1.8] mb-10">
              I&apos;ll be engaged in the process with you. I work with curiosity and honesty —
              that means I&apos;ll support you fully, and I&apos;ll also challenge you when
              it&apos;s needed.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/contact"
                className="inline-block bg-orange text-white px-8 py-3.5 rounded-md text-xs uppercase tracking-[2px] font-normal hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2"
              >
                Get in touch
              </Link>
              <PsychologyTodayBadge />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Approach ── */}
      <section
        className="py-20 px-4 sm:px-6 lg:px-8 bg-white"
        aria-labelledby="approach-heading"
      >
        <div className="max-w-6xl mx-auto">
          <p className="text-orange text-xs font-semibold uppercase tracking-[2px] mb-5">
            My approach
          </p>
          <h2
            id="approach-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-forest mb-14"
          >
            How I Work
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {approaches.map(({ heading, body }) => (
              <div key={heading}>
                <span
                  className="block w-8 h-px mb-5"
                  style={{ backgroundColor: '#c85a1a' }}
                  aria-hidden="true"
                />
                <h3 className="font-heading font-light text-xl text-forest mb-4">
                  {heading}
                </h3>
                <p className="font-normal text-sm text-gray-600 leading-[1.8]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Qualifications ── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="py-20 px-4 sm:px-6 lg:px-8"
        aria-labelledby="credentials-heading"
      >
        <div className="max-w-6xl mx-auto">
          <p className="text-orange text-xs font-semibold uppercase tracking-[2px] mb-5">
            Credentials
          </p>
          <h2
            id="credentials-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-forest mb-12"
          >
            Qualifications &amp; Accreditation
          </h2>

          <ul className="space-y-5 list-none mb-14 max-w-3xl">
            {credentials.map(({ text, link }) => (
              <li key={text} className="flex items-start gap-3">
                <span
                  className="mt-[0.45rem] shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: '#c85a1a' }}
                  aria-hidden="true"
                />
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-normal text-sm text-gray-700 leading-[1.8] underline underline-offset-2 decoration-orange/50 hover:decoration-orange transition-colors"
                  >
                    {text}
                  </a>
                ) : (
                  <span className="font-normal text-sm text-gray-700 leading-[1.8]">
                    {text}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {/* Accreditation badges */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://psychotherapistdirectory.iahip.org/therapist/owen-lynch"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:opacity-80 transition-opacity"
              style={{ background: '#fff', borderRadius: '6px', padding: '4px 10px' }}
              aria-label="IAHIP accredited psychotherapist — view directory listing"
            >
              <Image
                src="/images/IAHIPLogo.jpg"
                alt="IAHIP accredited psychotherapist"
                width={962}
                height={437}
                className="h-10 w-auto object-contain"
              />
            </a>
            <a
              href="https://psychotherapycouncil.ie/therapist/owen-lynch/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:opacity-80 transition-opacity"
              style={{ background: '#fff', borderRadius: '6px', padding: '4px 10px' }}
              aria-label="Irish Council for Psychotherapy member — view directory listing"
            >
              <Image
                src="/images/ICP.png"
                alt="Irish Council for Psychotherapy member"
                width={324}
                height={90}
                className="h-10 w-auto object-contain"
              />
            </a>
            <a
              href="https://www.psychologytoday.com/ie/counselling/owen-lynch-dublin-dn/1745757"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
              style={{ background: '#c85a1a', borderRadius: '6px', padding: '6px 14px' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="white" strokeWidth="1.5" />
                <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-white text-xs font-normal" style={{ letterSpacing: '0.03em' }}>
                Verified by Psychology Today
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Section 5: CTA ── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="py-24 px-4 sm:px-6 lg:px-8"
        aria-labelledby="about-cta-heading"
      >
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-orange text-xs font-semibold uppercase tracking-[2px] mb-5">
            Get in touch
          </p>
          <h2
            id="about-cta-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-cream mb-6"
          >
            Ready to take the first step?
          </h2>
          <p className="font-normal text-sm text-cream/70 leading-[1.8] mb-10">
            Getting started can feel daunting. Send me a message and I&apos;ll get back to you
            within one working day.
          </p>
          <span className="block w-12 h-px mx-auto mb-8" style={{ backgroundColor: '#d4a843' }} aria-hidden="true" />
          <Link
            href="/contact"
            className="inline-block bg-orange text-white px-10 py-4 rounded-md text-xs uppercase tracking-[2px] font-normal hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2A4D3C]"
          >
            Get in touch
          </Link>
        </div>
      </section>
    </>
  );
}
