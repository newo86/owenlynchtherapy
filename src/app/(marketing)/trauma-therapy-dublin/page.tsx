import type { Metadata } from 'next';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FloatingCircles from '@/components/ui/floating-circles';
import ServiceHowSessionsWork from '@/components/sections/ServiceHowSessionsWork';
import ServiceCTA from '@/components/sections/ServiceCTA';

const BASE_URL = 'https://owenlynchtherapy.com';
const SLUG = 'trauma-therapy-dublin';
const PAGE_URL = `${BASE_URL}/${SLUG}`;

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalTherapy',
  name: 'Trauma Therapy',
  description:
    'Trauma therapy in Dublin and online across Ireland & the UK. Gentle, paced support for past experiences affecting the present. IAHIP accredited.',
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
    { '@type': 'ListItem', position: 3, name: 'Trauma Therapy', item: PAGE_URL },
  ],
};

export const metadata: Metadata = {
  title: { absolute: 'Trauma Therapy Dublin & Online | Owen Lynch Psychotherapy' },
  description:
    'Trauma therapy in Dublin and online across Ireland & the UK. Gentle, paced support for past experiences affecting the present. IAHIP accredited.',
  alternates: {
    canonical: PAGE_URL,
    languages: { 'en-IE': PAGE_URL, 'x-default': PAGE_URL },
  },
  openGraph: {
    title: 'Trauma Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'Trauma therapy in Dublin and online across Ireland & the UK. Gentle, paced support for past experiences affecting the present. IAHIP accredited.',
    type: 'website',
    url: PAGE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trauma Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'Trauma therapy in Dublin and online across Ireland & the UK. Gentle, paced support for past experiences affecting the present.',
  },
  robots: { index: true, follow: true },
};

const p = 'font-normal text-base text-gray-700 leading-[1.75] mb-6';
const h2 =
  'font-heading font-light text-2xl sm:text-[1.75rem] text-forest mt-14 mb-5 leading-snug';

export default function TraumaTherapyPage() {
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
            Trauma Therapy in Dublin &amp; Online
          </h1>
          <p className="font-normal text-base text-cream/80 leading-[1.75] max-w-2xl">
            Trauma isn&apos;t only about what happened. It&apos;s about what&apos;s still happening
            — in your body, in your reactions, in the patterns that don&apos;t seem to shift no
            matter how much you understand them intellectually.
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
              I work with adults whose past experiences are showing up in the present: anxiety that
              doesn&apos;t have an obvious cause, relationship patterns that feel familiar in
              painful ways, hypervigilance, emotional numbing, intrusive memories, or a sense that
              something happened that you&apos;ve never properly processed.
            </p>

            <h2 className={h2}>What trauma actually is</h2>
            <p className={p}>
              Trauma isn&apos;t defined by the event itself — it&apos;s defined by how your nervous
              system responded to it. What was overwhelming for one person at one moment might not
              be for someone else. There&apos;s no objective scale. What matters is what your
              system couldn&apos;t fully metabolise at the time.
            </p>
            <p className={p}>
              This includes what&apos;s sometimes called &ldquo;big T&rdquo; trauma — discrete
              events like accidents, assaults, sudden losses — but also &ldquo;small t&rdquo;
              trauma, which is often more pervasive: emotional neglect, chronic invalidation,
              environments that weren&apos;t safe enough for you to develop in. The latter often
              doesn&apos;t get named as trauma at all, which is part of why it can be so difficult
              to access and work with.
            </p>
            <p className={p}>
              The body remembers what the mind doesn&apos;t always have words for. Trauma lives in
              the nervous system, not just the memory. That&apos;s why purely cognitive approaches
              sometimes only get you so far.
            </p>

            <h2 className={h2}>How I work with trauma</h2>
            <p className={p}>
              Trauma work has to be paced carefully. Going too fast or too deep too soon can
              re-traumatise rather than heal. The early stages of therapy for trauma are often about
              building the capacity to do the work — establishing safety, learning to regulate,
              developing trust in the therapeutic relationship.
            </p>
            <p className={p}>
              <strong>Stabilisation and resourcing.</strong>{' '}Before we approach the difficult
              material, we make sure you have the internal and external resources to handle what
              comes up. This isn&apos;t a delay — it&apos;s the actual work.
            </p>
            <p className={p}>
              <strong>Integrative approaches.</strong>{' '}I draw on psychodynamic understanding,
              somatic awareness, and cognitive work as fits what you bring. I don&apos;t use a
              single rigid trauma protocol — different approaches suit different people and different
              kinds of trauma.
            </p>
            <p className={p}>
              <strong>Working with the body.</strong>{' '}Trauma changes the nervous system. We work
              with grounding, breath, and noticing what&apos;s happening in the body, alongside the
              cognitive and relational work. The goal is to help your system update — to learn, at a
              level deeper than thought, that the danger is over.
            </p>
            <p className={p}>
              <strong>Relational safety as the foundation.</strong>{' '}For trauma that happened in
              relationships — and most does — the therapeutic relationship is itself a vehicle for
              healing. Having a consistent, attuned, non-judgmental presence over time can do work
              that techniques alone can&apos;t.
            </p>
            <p className={p}>
              A note: I don&apos;t provide EMDR. If you&apos;ve identified that EMDR is what you
              specifically want, I can signpost you to colleagues who do that work. The approaches I
              do offer have strong evidence bases for trauma and may be a good fit for many people.
            </p>

            <h2 className={h2}>What therapy with me looks like</h2>
            <p className={p}>
              You set the pace. Always. Trauma work that doesn&apos;t respect your pace isn&apos;t
              trauma work — it&apos;s re-traumatising. If something is too much, we slow down. If
              you need to pause the deeper work and focus on coping for a while, that&apos;s part
              of it.
            </p>
            <p className={p}>
              The goal isn&apos;t to &ldquo;fix&rdquo; what happened. The goal is to help your
              system finish processing it, so that the past stops governing your present.
            </p>
          </article>
        </div>
      </section>

      <ServiceHowSessionsWork />
      <ServiceCTA />
    </>
  );
}
