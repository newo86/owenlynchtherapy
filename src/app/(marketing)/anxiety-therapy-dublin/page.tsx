import type { Metadata } from 'next';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FloatingCircles from '@/components/ui/floating-circles';
import ServiceHowSessionsWork from '@/components/sections/ServiceHowSessionsWork';
import ServiceCTA from '@/components/sections/ServiceCTA';

const BASE_URL = 'https://owenlynchtherapy.com';
const SLUG = 'anxiety-therapy-dublin';
const PAGE_URL = `${BASE_URL}/${SLUG}`;

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalTherapy',
  name: 'Anxiety Therapy',
  description:
    'Anxiety therapy in Dublin and online for adults across Ireland & the UK. Evidence-based support for worry, panic, and generalised anxiety. IAHIP accredited.',
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
    { '@type': 'ListItem', position: 3, name: 'Anxiety Therapy', item: PAGE_URL },
  ],
};

export const metadata: Metadata = {
  title: { absolute: 'Anxiety Therapy Dublin & Online | Owen Lynch Psychotherapy' },
  description:
    'Anxiety therapy in Dublin and online for adults across Ireland & the UK. Evidence-based support for worry, panic, and generalised anxiety. IAHIP accredited.',
  alternates: {
    canonical: PAGE_URL,
    languages: { 'en-IE': PAGE_URL, 'x-default': PAGE_URL },
  },
  openGraph: {
    title: 'Anxiety Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'Anxiety therapy in Dublin and online for adults across Ireland & the UK. Evidence-based support for worry, panic, and generalised anxiety. IAHIP accredited.',
    type: 'website',
    url: PAGE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anxiety Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'Anxiety therapy in Dublin and online for adults across Ireland & the UK. Evidence-based support for worry, panic, and generalised anxiety.',
  },
  robots: { index: true, follow: true },
};

const p = 'font-normal text-base text-gray-700 leading-[1.75] mb-6';
const h2 =
  'font-heading font-light text-2xl sm:text-[1.75rem] text-forest mt-14 mb-5 leading-snug';

export default function AnxietyTherapyPage() {
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
            Anxiety Therapy in Dublin &amp; Online
          </h1>
          <p className="font-normal text-base text-cream/80 leading-[1.75] max-w-2xl">
            Anxiety can take many forms. For some people it&apos;s a constant background hum of
            worry. For others it&apos;s panic attacks that come out of nowhere. It might be the
            racing thoughts that keep you awake at 3am, the tight chest before a meeting, or the
            avoidance that&apos;s quietly narrowed your life over months and years.
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
              Whatever shape your anxiety takes, you don&apos;t have to live with it as a given. I
              work with adults experiencing generalised anxiety, panic disorder, social anxiety,
              health anxiety, performance anxiety, and the kind of free-floating dread that
              doesn&apos;t have an obvious name.
            </p>

            <h2 className={h2}>What anxiety actually is</h2>
            <p className={p}>
              Anxiety is your nervous system doing what it was designed to do — preparing you to
              respond to threat. The problem is that for many people, that system has become
              miscalibrated. It fires in situations that aren&apos;t dangerous. It stays on long
              after the actual stressor has passed. It interprets ordinary uncertainty as evidence
              that something is wrong.
            </p>
            <p className={p}>
              The body and the mind feed each other in anxiety. A racing heart triggers anxious
              thoughts, which release more stress hormones, which speed up the heart further.
              Breaking that cycle requires working with both the physical sensations and the
              cognitive patterns that sustain them.
            </p>
            <p className={p}>
              It&apos;s also worth saying: anxiety often makes sense in context. If you&apos;ve
              experienced trauma, loss, illness, or chronic stress, an over-active threat system is
              not a malfunction. It&apos;s an adaptation. Therapy isn&apos;t about labelling that
              adaptation as wrong — it&apos;s about understanding it and helping it settle.
            </p>

            <h2 className={h2}>How I work with anxiety</h2>
            <p className={p}>
              My approach is integrative, drawing on several evidence-based modalities.
            </p>
            <p className={p}>
              <strong>Cognitive Behavioural Therapy (CBT)</strong>{' '}helps you identify the thought
              patterns that fuel anxiety and develop new ways of relating to them. CBT is
              well-established and has strong empirical support for anxiety presentations.
            </p>
            <p className={p}>
              <strong>Acceptance and Commitment Therapy (ACT)</strong>{' '}focuses less on whether your
              anxious thoughts are true and more on whether they&apos;re helpful. It helps you move
              toward what matters to you, even when anxiety shows up.
            </p>
            <p className={p}>
              <strong>Psychodynamic exploration</strong>{' '}can help when anxiety has deeper roots —
              when your nervous system has learned, often early in life, that uncertainty isn&apos;t
              safe. Understanding why your threat system is so primed adds depth that purely
              technique-driven work sometimes misses.
            </p>
            <p className={p}>
              For physical anxiety, we may also work with practical regulation strategies —
              breathwork, grounding, and approaches that help the body itself settle.
            </p>

            <h2 className={h2}>What therapy with me looks like</h2>
            <p className={p}>
              We start by understanding your specific experience of anxiety — what it looks like,
              when it appeared, what it costs you, and what you&apos;ve already tried. From there,
              we develop an approach tailored to you. There&apos;s no one-size-fits-all programme.
            </p>
            <p className={p}>
              You won&apos;t be asked to &ldquo;just relax&rdquo; or to do things that feel
              overwhelming. Therapy for anxiety works best when it moves at a pace your nervous
              system can actually metabolise. Sometimes the work is calm and gradual. Sometimes
              it&apos;s more active. We figure that out together.
            </p>
          </article>
        </div>
      </section>

      <ServiceHowSessionsWork />
      <ServiceCTA />
    </>
  );
}
