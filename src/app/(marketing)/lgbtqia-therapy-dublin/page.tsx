import type { Metadata } from 'next';
import Link from 'next/link';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FloatingCircles from '@/components/ui/floating-circles';
import ServiceHowSessionsWork from '@/components/sections/ServiceHowSessionsWork';
import ServiceCTA from '@/components/sections/ServiceCTA';

const BASE_URL = 'https://owenlynchtherapy.com';
const SLUG = 'lgbtqia-therapy-dublin';
const PAGE_URL = `${BASE_URL}/${SLUG}`;

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalTherapy',
  name: 'LGBTQIA+ Therapy',
  description:
    'Affirming LGBTQIA+ therapy in Dublin and online across Ireland & the UK. Identity, relationships, minority stress, chemsex. IAHIP-accredited psychotherapist.',
  url: PAGE_URL,
  provider: {
    '@type': 'Person',
    name: 'Owen Lynch',
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
    { '@type': 'ListItem', position: 3, name: 'LGBTQIA+ Therapy', item: PAGE_URL },
  ],
};

export const metadata: Metadata = {
  title: { absolute: 'LGBTQIA+ Therapy Dublin & Online | Owen Lynch Psychotherapy' },
  description:
    'Affirming LGBTQIA+ therapy in Dublin and online across Ireland & the UK. Identity, relationships, minority stress, chemsex. IAHIP-accredited psychotherapist.',
  alternates: {
    canonical: PAGE_URL,
    languages: { 'en-IE': PAGE_URL, 'x-default': PAGE_URL },
  },
  openGraph: {
    title: 'LGBTQIA+ Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'Affirming LGBTQIA+ therapy in Dublin and online across Ireland & the UK. Identity, relationships, minority stress, chemsex. IAHIP-accredited psychotherapist.',
    type: 'website',
    url: PAGE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LGBTQIA+ Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'Affirming LGBTQIA+ therapy in Dublin and online across Ireland & the UK. Identity, relationships, minority stress, chemsex.',
  },
  robots: { index: true, follow: true },
};

const p = 'font-normal text-base text-gray-700 leading-[1.75] mb-6';
const h2 =
  'font-heading font-light text-2xl sm:text-[1.75rem] text-forest mt-14 mb-5 leading-snug';

export default function LgbtqiaTherapyPage() {
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
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 list-none text-xs text-cream/60">
              <li><Link href="/" className="hover:text-cream transition-colors">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/services" className="hover:text-cream transition-colors">Services</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-cream/80">LGBTQIA+ Therapy</li>
            </ol>
          </nav>
          <h1
            id="page-hero-heading"
            className="font-heading font-light text-3xl sm:text-4xl lg:text-[3rem] leading-tight text-cream mb-8"
          >
            LGBTQIA+ Affirming Therapy in Dublin &amp; Online
          </h1>
          <p className="font-normal text-base text-cream/80 leading-[1.75] max-w-2xl">
            If you&apos;re LGBTQIA+ and looking for a therapist who you won&apos;t have to explain
            yourself to, this is that space.
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
              I work with adults across the LGBTQIA+ spectrum: gay, lesbian, bisexual, queer,
              trans, non-binary, asexual, intersex, questioning, and identities that don&apos;t fit
              neatly inside any of those words. There&apos;s no expectation here that you&apos;ll
              educate me on your identity, justify it, or translate yourself into something more
              palatable.
            </p>

            <h2 className={h2}>What this work involves</h2>
            <p className={p}>
              LGBTQIA+ affirming therapy isn&apos;t a separate kind of therapy. It&apos;s therapy
              without the obstacles that mainstream therapy still sometimes presents — without the
              silent assumptions, the misnamings, the moments where you have to teach the therapist
              before you can actually use the session.
            </p>
            <p className={p}>
              You might come to therapy because of something specifically related to your identity:
            </p>
            <ul className="list-disc list-outside pl-6 space-y-3 mb-6 text-base text-gray-700 leading-[1.75]">
              <li>Coming out (to yourself, to others, at different stages of life)</li>
              <li>Identity exploration — including non-linear, fluid, or evolving identities</li>
              <li>Minority stress — the chronic cost of navigating a world not built for you</li>
              <li>Internalised stigma and self-acceptance</li>
              <li>Family reactions and rebuilding family of choice</li>
              <li>Religious or cultural conflict around identity</li>
              <li>Trans-specific work: transition, dysphoria, navigating healthcare, family and workplace</li>
              <li>Relationships, sex, intimacy</li>
              <li>Chemsex — exploration, complication, or recovery</li>
            </ul>
            <p className={p}>
              You might also come for something that has nothing to do with your identity — anxiety,
              OCD, depression, work stress, grief. The fact that you&apos;re LGBTQIA+ doesn&apos;t
              mean every session has to be about it. But you&apos;ll be in a space where it can be
              when it needs to be.
            </p>

            <h2 className={h2}>How I work</h2>
            <p className={p}>
              I work integratively, drawing on evidence-based modalities — ACT, CBT, psychodynamic,
              person-centred — and adapting to what fits for you. The approaches aren&apos;t unique
              to LGBTQIA+ clients. What&apos;s unique is the foundation: you don&apos;t have to do
              the labour of making yourself understood before therapy can begin.
            </p>
            <p className={p}>
              I have experience working with chemsex-related concerns specifically, including
              exploring chemsex without shame, navigating its complications, and working through
              dependency or its aftermath. This is an area where stigma still does significant
              damage. Therapy here is non-judgmental, harm-reduction-informed, and honest.
            </p>
            <p className={p}>
              A note on identity-first language: I&apos;ll follow your lead on language, pronouns,
              and how you describe yourself. If something I say doesn&apos;t fit, please tell me —
              I&apos;d rather get corrected and adjust than continue using language that doesn&apos;t
              work for you.
            </p>

            <h2 className={h2}>What therapy with me looks like</h2>
            <p className={p}>
              You don&apos;t have to be in crisis to come to therapy. You don&apos;t have to have a
              clear &ldquo;issue&rdquo; to work on. Many LGBTQIA+ clients describe the value of
              having a space that is just for them — a regular hour each week where they don&apos;t
              have to mask, manage, or explain.
            </p>
            <p className={p}>
              If you do come with something specific, we&apos;ll work on it. If what&apos;s most
              pressing changes over time, the focus changes with you. The work is yours.
            </p>
          </article>
        </div>
      </section>

      <ServiceHowSessionsWork />
      <ServiceCTA />
    </>
  );
}
