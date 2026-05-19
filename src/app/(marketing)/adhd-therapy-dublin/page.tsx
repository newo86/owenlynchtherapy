import type { Metadata } from 'next';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FloatingCircles from '@/components/ui/floating-circles';
import ServiceHowSessionsWork from '@/components/sections/ServiceHowSessionsWork';
import ServiceCTA from '@/components/sections/ServiceCTA';

const BASE_URL = 'https://owenlynchtherapy.com';
const SLUG = 'adhd-therapy-dublin';
const PAGE_URL = `${BASE_URL}/${SLUG}`;

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalTherapy',
  name: 'ADHD Therapy',
  description:
    'ADHD therapy for adults in Dublin and online across Ireland & the UK. Support for diagnosed and self-identifying adults. IAHIP-accredited psychotherapist.',
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
    { '@type': 'ListItem', position: 3, name: 'ADHD Therapy', item: PAGE_URL },
  ],
};

export const metadata: Metadata = {
  title: { absolute: 'ADHD Therapy Dublin & Online | Owen Lynch Psychotherapy' },
  description:
    'ADHD therapy for adults in Dublin and online across Ireland & the UK. Support for diagnosed and self-identifying adults. IAHIP-accredited psychotherapist.',
  alternates: {
    canonical: PAGE_URL,
    languages: { 'en-IE': PAGE_URL, 'x-default': PAGE_URL },
  },
  openGraph: {
    title: 'ADHD Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'ADHD therapy for adults in Dublin and online across Ireland & the UK. Support for diagnosed and self-identifying adults. IAHIP-accredited psychotherapist.',
    type: 'website',
    url: PAGE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ADHD Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'ADHD therapy for adults in Dublin and online across Ireland & the UK. Support for diagnosed and self-identifying adults.',
  },
  robots: { index: true, follow: true },
};

const p = 'font-normal text-base text-gray-700 leading-[1.75] mb-6';
const h2 =
  'font-heading font-light text-2xl sm:text-[1.75rem] text-forest mt-14 mb-5 leading-snug';

export default function AdhdTherapyPage() {
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
            ADHD Therapy for Adults in Dublin &amp; Online
          </h1>
          <p className="font-normal text-base text-cream/80 leading-[1.75] max-w-2xl">
            ADHD in adults often looks nothing like the stereotype. It&apos;s the project you
            can&apos;t start despite caring deeply about it. The conversations you replay for days
            afterward. The job interview you ace and then can&apos;t seem to follow through on. The
            chronic sense that you&apos;re working twice as hard as everyone else for half the
            output.
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
              Many adults arrive at ADHD late — sometimes after a child&apos;s diagnosis, sometimes
              after years of feeling that something didn&apos;t fit. Whether you have a formal
              diagnosis, are exploring whether ADHD might be a factor in your difficulties, or are
              self-identifying without seeking diagnosis, therapy can help you make sense of how
              your brain works and build a life that works with it.
            </p>

            <h2 className={h2}>What ADHD actually is</h2>
            <p className={p}>
              ADHD isn&apos;t a deficit of attention. It&apos;s a difference in how attention is
              regulated. Attention can be highly focused (sometimes hyper-focused) on what&apos;s
              interesting or urgent, and almost impossible to direct toward what&apos;s important
              but neutral. The executive functions that most people use to plan, prioritise,
              transition between tasks, and follow through can work differently in an ADHD brain.
            </p>
            <p className={p}>
              This isn&apos;t a character flaw. It&apos;s neurological. But because it&apos;s
              invisible and inconsistent, ADHD often gets misread — by others and by the person
              themselves — as laziness, lack of motivation, or unreliability. Years of that
              misreading take a toll. Many adults with ADHD arrive in therapy carrying significant
              shame, anxiety, or depression layered on top of the ADHD itself.
            </p>

            <h2 className={h2}>How I work with ADHD</h2>
            <p className={p}>
              Therapy for ADHD isn&apos;t about fixing your brain. It&apos;s about understanding
              how it works and building strategies that actually fit you — not strategies designed
              for neurotypical brains that you&apos;ve been failing to implement for years.
            </p>
            <p className={p}>
              <strong>Psychoeducation</strong>{' '}is often a significant part of early work.
              Understanding the actual mechanics of ADHD — executive function, dopamine, time
              blindness, rejection sensitivity — can be genuinely transformative. A lot of what
              you&apos;ve been blaming yourself for starts to make sense.
            </p>
            <p className={p}>
              <strong>Practical strategy work</strong>{' '}focuses on real-life adaptations: external
              scaffolding, body doubling, environment design, and ways of working with motivation
              rather than against it. The goal isn&apos;t to push you to be neurotypical.
              It&apos;s to help you function more sustainably as yourself.
            </p>
            <p className={p}>
              <strong>Processing what ADHD has cost you</strong>{' '}is often part of the work too.
              There&apos;s frequently grief, anger, or relief that needs space — for the years spent
              struggling, for the relationships strained, for the missed potential. Therapy can hold
              all of that.
            </p>
            <p className={p}>
              I don&apos;t carry out ADHD assessments or provide diagnoses. If you&apos;re looking
              to be assessed, I&apos;m happy to signpost you toward appropriate assessment services
              in Ireland.
            </p>

            <h2 className={h2}>What therapy with me looks like</h2>
            <p className={p}>
              I work in a way that fits how ADHD brains actually function. Sessions aren&apos;t
              rigid. We can be flexible about structure. You don&apos;t need to mask, perform, or
              pretend that everything is going better than it is.
            </p>
            <p className={p}>
              We&apos;ll figure out what matters most to you, what you want to change, and
              what&apos;s been getting in the way. Then we&apos;ll work with the brain you have —
              not the one you&apos;ve been told you should have.
            </p>
          </article>
        </div>
      </section>

      <ServiceHowSessionsWork />
      <ServiceCTA />
    </>
  );
}
