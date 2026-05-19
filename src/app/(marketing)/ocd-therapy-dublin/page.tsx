import type { Metadata } from 'next';
import Link from 'next/link';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FloatingCircles from '@/components/ui/floating-circles';
import ServiceHowSessionsWork from '@/components/sections/ServiceHowSessionsWork';
import ServiceCTA from '@/components/sections/ServiceCTA';

const BASE_URL = 'https://owenlynchtherapy.com';
const SLUG = 'ocd-therapy-dublin';
const PAGE_URL = `${BASE_URL}/${SLUG}`;

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalTherapy',
  name: 'OCD Therapy',
  description:
    'Specialist OCD therapy in Dublin and online across Ireland & the UK. IAHIP-accredited psychotherapist using I-CBT, ACT, and ERP. €70-€80 per session.',
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
    { '@type': 'ListItem', position: 3, name: 'OCD Therapy', item: PAGE_URL },
  ],
};

export const metadata: Metadata = {
  title: { absolute: 'OCD Therapy Dublin & Online | Owen Lynch Psychotherapy' },
  description:
    'Specialist OCD therapy in Dublin and online across Ireland & the UK. IAHIP-accredited psychotherapist using I-CBT, ACT, and ERP. €70-€80 per session.',
  alternates: {
    canonical: PAGE_URL,
    languages: { 'en-IE': PAGE_URL, 'x-default': PAGE_URL },
  },
  openGraph: {
    title: 'OCD Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'Specialist OCD therapy in Dublin and online across Ireland & the UK. IAHIP-accredited psychotherapist using I-CBT, ACT, and ERP. €70-€80 per session.',
    type: 'website',
    url: PAGE_URL,
    images: [{ url: `${BASE_URL}/images/blog-hero-ocd-therapy.png`, width: 3200, height: 1800 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OCD Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'Specialist OCD therapy in Dublin and online across Ireland & the UK. IAHIP-accredited psychotherapist using I-CBT, ACT, and ERP.',
    images: [`${BASE_URL}/images/blog-hero-ocd-therapy.png`],
  },
  robots: { index: true, follow: true },
};

const p = 'font-normal text-base text-gray-700 leading-[1.75] mb-6';
const h2 =
  'font-heading font-light text-2xl sm:text-[1.75rem] text-forest mt-14 mb-5 leading-snug';
const inlineLink =
  'underline underline-offset-2 decoration-orange/60 hover:decoration-orange transition-colors';

export default function OcdTherapyPage() {
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
            OCD Therapy in Dublin &amp; Online
          </h1>
          <p className="font-normal text-base text-cream/80 leading-[1.75] max-w-2xl">
            OCD is one of the most misunderstood conditions in mental health. It&apos;s often
            reduced to a stereotype about tidiness or hand-washing, but the lived reality is far
            more complex and often deeply distressing. Intrusive thoughts about harm, contamination,
            relationships, sexuality, religion, or identity can feel completely at odds with who you
            know yourself to be, and the compulsions that follow can take over your day.
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
              I work with adults across all presentations of OCD: intrusive thoughts, checking,
              contamination fears, harm OCD, relationship OCD, religious OCD (scrupulosity), and
              Pure O. Whether you&apos;ve been diagnosed or you suspect what you&apos;re
              experiencing might be OCD, therapy can help.
            </p>

            <h2 className={h2}>What OCD actually is</h2>
            <p className={p}>
              OCD has two main components. Obsessions are intrusive, unwanted thoughts, images, or
              urges that cause significant distress. Compulsions are repetitive behaviours or mental
              acts performed to neutralise that distress. The cycle is exhausting and
              self-reinforcing, the compulsion offers brief relief, which strengthens the urge to
              repeat it.
            </p>
            <p className={p}>
              Research suggests OCD affects 2–3% of the population over a lifetime, but it often
              takes years to identify and seek help. One reason is that the content of obsessions
              can feel shameful or frightening to disclose. It&apos;s worth saying clearly: the
              distress your thoughts cause you is itself evidence of how seriously you hold your
              values. Intrusive thoughts are not a reflection of who you are.
            </p>

            <h2 className={h2}>How I work with OCD</h2>
            <p className={p}>
              My approach draws on three evidence-based modalities, adapted to what fits for you.
            </p>
            <p className={p}>
              <strong>Inference-Based CBT (I-CBT)</strong>{' '}is a newer approach that looks at the
              reasoning process underneath the doubt. Rather than focusing only on managing the
              anxiety once a thought has taken hold, I-CBT examines why the thought got taken
              seriously in the first place. It&apos;s a different angle that many people find
              genuinely freeing.
            </p>
            <p className={p}>
              <strong>Acceptance and Commitment Therapy (ACT)</strong>{' '}helps you change your
              relationship with intrusive thoughts rather than fighting them. The goal isn&apos;t to
              eliminate the thoughts, it&apos;s to take their power away, so they no longer
              dictate what you do or how you live.
            </p>
            <p className={p}>
              <strong>Exposure and Response Prevention (ERP)</strong>{' '}is the most extensively
              researched treatment for OCD. It involves gradually facing the situations or thoughts
              that trigger your obsessions while supporting you to resist performing compulsions. ERP
              is introduced thoughtfully and at your pace, never as a boot camp.
            </p>
            <p className={p}>
              For a more detailed look at how these approaches work and what the research says, you
              can read{' '}
              <Link href="/blog/how-ocd-therapy-works" className={inlineLink}>
                my evidence-based guide to OCD therapy
              </Link>
              .
            </p>

            <h2 className={h2}>What therapy with me looks like</h2>
            <p className={p}>
              We don&apos;t begin with techniques. We begin by building a relationship in which you
              feel safe enough to talk about thoughts that may feel shameful, frightening, or
              difficult to say out loud. Many people have spent years hiding the content of their
              OCD. That ends here.
            </p>
            <p className={p}>
              From there, we develop a shared understanding of how your OCD operates, what maintains
              it, and what your experience of it has been. You&apos;re the expert on your own life.
              I bring expertise in how OCD functions and what the research says about changing it.
            </p>
            <p className={p}>
              Therapy never forces you to do anything you don&apos;t want to do. You set the pace.
              The goal isn&apos;t to white-knuckle your way through distress, it&apos;s to develop
              a fundamentally different relationship with your own mind.
            </p>
          </article>
        </div>
      </section>

      <ServiceHowSessionsWork />
      <ServiceCTA />
    </>
  );
}
