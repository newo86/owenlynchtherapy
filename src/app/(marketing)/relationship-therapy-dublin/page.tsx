import type { Metadata } from 'next';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FloatingCircles from '@/components/ui/floating-circles';
import ServiceHowSessionsWork from '@/components/sections/ServiceHowSessionsWork';
import ServiceCTA from '@/components/sections/ServiceCTA';
import RelatedServices from '@/components/sections/RelatedServices';
import { SITE_URL, PRACTICE } from '@/practice.config';

const BASE_URL = SITE_URL;
const SLUG = 'relationship-therapy-dublin';
const PAGE_URL = `${BASE_URL}/${SLUG}`;

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalTherapy',
  name: 'Relationship Therapy',
  description:
    'Therapy for relationship difficulties in Dublin and online across Ireland & the UK. Support for patterns, communication and attachment. IAHIP accredited.',
  url: PAGE_URL,
  provider: {
    '@type': 'Person',
    name: PRACTICE.practitionerName,
    jobTitle: 'Psychotherapist',
    url: `${BASE_URL}/about`,
  },
  areaServed: [
    { '@type': 'Place', name: 'Dublin, Ireland' },
    { '@type': 'Country', name: 'Ireland' },
    { '@type': 'Country', name: 'United Kingdom' },
  ],
  availableService: {
    '@type': 'MedicalProcedure',
    name: 'Psychotherapy',
    procedureType: 'Therapeutic',
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
    { '@type': 'ListItem', position: 2, name: 'Services', item: `${BASE_URL}/services` },
    { '@type': 'ListItem', position: 3, name: 'Relationship Therapy', item: PAGE_URL },
  ],
};

export const metadata: Metadata = {
  title: { absolute: 'Relationship Therapy Dublin & Online | Owen Lynch' },
  description:
    'Therapy for relationship difficulties in Dublin and online across Ireland & the UK. Support for patterns, communication and attachment. IAHIP accredited.',
  alternates: {
    canonical: PAGE_URL,
    languages: { 'en': PAGE_URL, 'x-default': PAGE_URL },
  },
  openGraph: {
    title: 'Relationship Therapy Dublin & Online | Owen Lynch',
    description:
      'Therapy for relationship difficulties in Dublin and online across Ireland & the UK. Support for patterns, communication and attachment. IAHIP accredited.',
    type: 'website',
    url: PAGE_URL,
    images: [{ url: `${BASE_URL}/og-image.jpg`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Relationship Therapy Dublin & Online | Owen Lynch',
    description:
      'Therapy for relationship difficulties in Dublin and online across Ireland & the UK. Support for patterns, communication and attachment.',
  },
  robots: { index: true, follow: true },
};

const p = 'font-normal text-base text-gray-700 leading-[1.75] mb-6';
const h2 =
  'font-heading font-light text-2xl sm:text-[1.75rem] text-forest mt-14 mb-5 leading-snug';

export default function RelationshipTherapyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* ── Hero ── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="relative overflow-hidden pt-[100px] pb-[60px] md:pt-[120px] md:pb-[80px] px-4 sm:px-6 lg:px-8"
        aria-labelledby="page-hero-heading"
      >
        <PageHeroCircles />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1
            id="page-hero-heading"
            className="font-heading font-light text-3xl sm:text-4xl lg:text-[3rem] leading-tight text-cream mb-8"
          >
            Therapy for Relationship Difficulties in Dublin &amp; Online
          </h1>
          <p className="font-normal text-base text-cream/80 leading-[1.75] max-w-2xl">
            The relationships in your life, romantic, familial, friendships, work, shape your
            wellbeing more than almost anything else. When they&apos;re going well, life feels
            manageable. When they&apos;re not, everything else gets harder.
          </p>
        </div>
      </section>

      {/* ── Content ── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="relative overflow-hidden py-14 px-4 sm:px-6 lg:px-8"
        aria-label="Page content"
      >
        <FloatingCircles />
        <div className="relative max-w-4xl mx-auto" style={{ zIndex: 1 }}>
          <article className="max-w-[720px] mx-auto">
            <p className={p}>
              I work with adults navigating relationship difficulties from an individual
              perspective. That means I work with one person at a time, not couples. The focus is
              on understanding your patterns, your attachments, and your choices, so that whatever
              happens with the other people in your life, you have more clarity about yourself.
            </p>

            <h2 className={h2}>What I work with</h2>
            <ul className="list-disc list-outside pl-6 space-y-3 mb-10 text-base text-gray-700 leading-[1.75]">
              <li>Romantic relationships that keep ending the same way, or that you can&apos;t quite leave</li>
              <li>Family dynamics, parents, siblings, in-laws, the inherited patterns that show up regardless of your best intentions</li>
              <li>Friendships that feel one-sided, draining, or that you&apos;ve outgrown</li>
              <li>Conflict, communication breakdown, the same arguments on repeat</li>
              <li>Difficulty trusting, difficulty letting people close, difficulty being alone</li>
              <li>Attachment patterns, anxious, avoidant, fearful, and how they shape what you choose and tolerate</li>
              <li>Recovering from a significant relationship ending, infidelity, or betrayal</li>
              <li>Difficulty setting boundaries, or boundaries that feel like walls</li>
            </ul>

            <h2 className={h2}>How I work with relationship difficulties</h2>
            <p className={p}>
              The work usually has two layers. The first is what&apos;s happening now, the
              specific situation, the people, the dynamics. The second is the deeper pattern, why
              this kind of thing keeps showing up, what role you tend to play, what you&apos;re
              drawn to and what you avoid.
            </p>
            <p className={p}>
              <strong>Attachment work</strong>{' '}can be central. The ways we learned to relate, very
              early in life, often shape our adult relationships in ways that are invisible until
              they&apos;re named. Understanding your attachment style, and where it came from, 
              can shift a lot.
            </p>
            <p className={p}>
              <strong>Pattern recognition.</strong>{' '}Once you can see your own pattern, you have a
              choice. Until then, the pattern runs you. Therapy is partly the work of bringing
              patterns into view without judgment.
            </p>
            <p className={p}>
              <strong>Communication and conflict.</strong>{' '}We work on practical skills, how to
              have hard conversations, how to listen without defending, how to express what you
              need. These are learnable.
            </p>
            <p className={p}>
              <strong>Self-knowledge.</strong>{' '}A lot of relationship work is really self work. The
              more clearly you understand yourself, what you want, what you can offer, what you
              can&apos;t, the better your relationships tend to go.
            </p>

            <h2 className={h2}>What therapy with me looks like</h2>
            <p className={p}>
              We start with what&apos;s most pressing, the specific situation that brought you in.
              From there, the work usually broadens. You might come in to talk about your partner
              and find yourself talking about your father. That&apos;s not derailment; that&apos;s
              how relationship work tends to move.
            </p>
            <p className={p}>
              I bring honesty and challenge alongside support. If I notice a pattern, I&apos;ll
              name it. If something doesn&apos;t add up, I&apos;ll say so. The goal isn&apos;t to
              be told you&apos;re right, it&apos;s to see yourself more clearly.
            </p>
          </article>
        </div>
      </section>

      <RelatedServices current={SLUG} />
      <ServiceHowSessionsWork />
      <ServiceCTA />
    </>
  );
}
