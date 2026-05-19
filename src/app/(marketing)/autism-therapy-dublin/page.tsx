import type { Metadata } from 'next';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FloatingCircles from '@/components/ui/floating-circles';
import ServiceHowSessionsWork from '@/components/sections/ServiceHowSessionsWork';
import ServiceCTA from '@/components/sections/ServiceCTA';

const BASE_URL = 'https://owenlynchtherapy.com';
const SLUG = 'autism-therapy-dublin';
const PAGE_URL = `${BASE_URL}/${SLUG}`;

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalTherapy',
  name: 'Autism Therapy',
  description:
    'Affirming therapy for autistic adults in Dublin and online across Ireland & the UK. Late-diagnosed and self-identifying welcome. IAHIP-accredited psychotherapist.',
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
    { '@type': 'ListItem', position: 3, name: 'Autism Therapy', item: PAGE_URL },
  ],
};

export const metadata: Metadata = {
  title: { absolute: 'Autism Therapy Dublin & Online | Owen Lynch Psychotherapy' },
  description:
    'Affirming therapy for autistic adults in Dublin and online across Ireland & the UK. Late-diagnosed and self-identifying welcome. IAHIP-accredited psychotherapist.',
  alternates: {
    canonical: PAGE_URL,
    languages: { 'en-IE': PAGE_URL, 'x-default': PAGE_URL },
  },
  openGraph: {
    title: 'Autism Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'Affirming therapy for autistic adults in Dublin and online across Ireland & the UK. Late-diagnosed and self-identifying welcome. IAHIP-accredited psychotherapist.',
    type: 'website',
    url: PAGE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Autism Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'Affirming therapy for autistic adults in Dublin and online across Ireland & the UK. Late-diagnosed and self-identifying welcome.',
  },
  robots: { index: true, follow: true },
};

const p = 'font-normal text-base text-gray-700 leading-[1.75] mb-6';
const h2 =
  'font-heading font-light text-2xl sm:text-[1.75rem] text-forest mt-14 mb-5 leading-snug';

export default function AutismTherapyPage() {
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
            Therapy for Autistic Adults in Dublin &amp; Online
          </h1>
          <p className="font-normal text-base text-cream/80 leading-[1.75] max-w-2xl">
            If you&apos;re autistic, diagnosed, self-identifying, or somewhere in the middle, 
            and looking for a therapist who won&apos;t make you explain why you&apos;re autistic
            before you can talk about anything else, this is that space.
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
              I work with autistic adults across the spectrum, including those who are
              late-diagnosed, those who have self-identified after years of feeling different, and
              those still in the process of figuring it out. There&apos;s no expectation here to
              mask, perform neurotypicality, or justify your identity.
            </p>

            <h2 className={h2}>What autism is, and isn&apos;t</h2>
            <p className={p}>
              Autism is a neurodevelopmental difference, not a disorder to be cured. It shapes how
              you perceive, process, communicate, and connect. The diagnostic frameworks are still
              catching up to what autistic adults actually experience, particularly autistic adults
              who weren&apos;t picked up as children, which often means women, non-binary people,
              and anyone who learned to mask early.
            </p>
            <p className={p}>
              What people describe varies enormously: differences in sensory processing, social
              communication, executive function, emotional regulation, special interests, the need
              for predictability, the cost of unmasking. Autism doesn&apos;t look one way.
              It&apos;s a profile, not a checklist.
            </p>
            <p className={p}>
              A note on language: I use identity-first language (&ldquo;autistic person&rdquo;) as
              the majority of autistic adults prefer, but I&apos;ll follow your lead on what feels
              right for you. Same with diagnosis, formal diagnosis isn&apos;t required to come to
              therapy or to use the language that fits your experience.
            </p>

            <h2 className={h2}>How I work with autistic clients</h2>
            <p className={p}>
              Therapy is adapted to suit how you actually communicate and process. That means:
            </p>
            <p className={p}>
              <strong>No assumed shared frameworks.</strong>{' '}I won&apos;t assume metaphor lands,
              that direct questions feel safe, that eye contact is wanted, or that processing time
              should match the standard. You can take silence. You can think out loud. You can ask
              me to repeat or rephrase. You can email me afterward if something comes up that
              didn&apos;t fit in the session.
            </p>
            <p className={p}>
              <strong>Working with sensory and regulatory reality.</strong>{' '}Burnout, overwhelm,
              shutdown, and the cost of masking are real. We can work with all of it without
              pathologising it.
            </p>
            <p className={p}>
              <strong>Late diagnosis processing.</strong>{' '}For many people, identifying as autistic
              later in life brings up grief, relief, anger, and a re-narrating of your own history.
              There&apos;s a lot to make sense of. Therapy can hold that.
            </p>
            <p className={p}>
              <strong>Relationships, work, family.</strong>{' '}Navigating a world built for
              neurotypical brains has costs. We can work on the practical strategies as well as the
              emotional weight of it.
            </p>
            <p className={p}>
              I don&apos;t carry out autism assessments or provide diagnoses. If you&apos;re
              looking to be assessed, I&apos;m happy to signpost you toward appropriate assessment
              services in Ireland.
            </p>

            <h2 className={h2}>What therapy with me looks like</h2>
            <p className={p}>
              You don&apos;t have to perform competence here. You don&apos;t have to apologise for
              not making eye contact, for being literal, for needing things spelled out, for being
              too much, or for not being enough. You&apos;re allowed to bring your actual self.
            </p>
            <p className={p}>
              Many of my clients describe the relief of being in a space where they don&apos;t have
              to translate themselves. That relief is the starting point. From there, we work on
              what&apos;s actually brought you to therapy.
            </p>
          </article>
        </div>
      </section>

      <ServiceHowSessionsWork />
      <ServiceCTA />
    </>
  );
}
