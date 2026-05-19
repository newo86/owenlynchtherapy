import type { Metadata } from 'next';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FloatingCircles from '@/components/ui/floating-circles';
import ServiceHowSessionsWork from '@/components/sections/ServiceHowSessionsWork';
import ServiceCTA from '@/components/sections/ServiceCTA';

const BASE_URL = 'https://owenlynchtherapy.com';
const SLUG = 'depression-therapy-dublin';
const PAGE_URL = `${BASE_URL}/${SLUG}`;

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalTherapy',
  name: 'Depression Therapy',
  description:
    'Therapy for depression in Dublin and online across Ireland & the UK. Evidence-based support for low mood, hopelessness, and burnout. IAHIP accredited.',
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
    { '@type': 'ListItem', position: 3, name: 'Depression Therapy', item: PAGE_URL },
  ],
};

export const metadata: Metadata = {
  title: { absolute: 'Depression Therapy Dublin & Online | Owen Lynch Psychotherapy' },
  description:
    'Therapy for depression in Dublin and online across Ireland & the UK. Evidence-based support for low mood, hopelessness, and burnout. IAHIP accredited.',
  alternates: {
    canonical: PAGE_URL,
    languages: { 'en-IE': PAGE_URL, 'x-default': PAGE_URL },
  },
  openGraph: {
    title: 'Depression Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'Therapy for depression in Dublin and online across Ireland & the UK. Evidence-based support for low mood, hopelessness, and burnout. IAHIP accredited.',
    type: 'website',
    url: PAGE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Depression Therapy Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'Therapy for depression in Dublin and online across Ireland & the UK. Evidence-based support for low mood, hopelessness, and burnout.',
  },
  robots: { index: true, follow: true },
};

const p = 'font-normal text-base text-gray-700 leading-[1.75] mb-6';
const h2 =
  'font-heading font-light text-2xl sm:text-[1.75rem] text-forest mt-14 mb-5 leading-snug';

export default function DepressionTherapyPage() {
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
            Depression Therapy in Dublin &amp; Online
          </h1>
          <p className="font-normal text-base text-cream/80 leading-[1.75] max-w-2xl">
            Depression isn&apos;t always sadness. Often it&apos;s flatness — the loss of
            motivation, the inability to start, the sense that nothing really matters. It might be
            waking up exhausted regardless of how much you slept. It might be functioning on the
            outside while everything feels empty on the inside. It might be the thing that crept up
            so slowly you didn&apos;t notice when it arrived.
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
              I work with adults experiencing depression in its many forms: major depressive
              episodes, persistent low mood, situational depression following loss or major life
              change, burnout, and the kind of chronic dimness that some people describe as having
              always been there.
            </p>

            <h2 className={h2}>What depression actually is</h2>
            <p className={p}>
              Depression isn&apos;t weakness or a failure of willpower. It&apos;s a state that
              affects how your brain processes reward, motivation, and meaning. Activities that
              should feel rewarding don&apos;t. Effort that should feel manageable feels
              impossible. The interpretation of yourself, your life, and your future gets pulled in
              a negative direction that feels true but isn&apos;t.
            </p>
            <p className={p}>
              Depression often makes sense in context. It can follow loss, prolonged stress,
              trauma, illness, isolation, or significant life transitions. It can be linked to ADHD,
              autism, OCD, or chronic anxiety — what looks like depression is sometimes the cost of
              years spent masking or managing something underneath. Understanding the context
              matters.
            </p>

            <h2 className={h2}>How I work with depression</h2>
            <p className={p}>
              My approach is integrative, drawing on what the research supports and adapting to
              what fits for you.
            </p>
            <p className={p}>
              <strong>Behavioural activation</strong>{' '}addresses the trap depression creates: the
              less you do, the worse you feel; the worse you feel, the less you do. Carefully and
              gradually re-engaging with activities — not because you feel like it, but because the
              engagement itself helps shift the mood — has strong evidence behind it.
            </p>
            <p className={p}>
              <strong>Cognitive work</strong>{' '}helps with the thinking patterns that depression
              generates: the negative filter, the self-criticism, the hopelessness about the
              future. We don&apos;t pretend the thoughts aren&apos;t there. We learn to recognise
              them and develop a different relationship to them.
            </p>
            <p className={p}>
              <strong>Psychodynamic exploration</strong>{' '}can be valuable when depression has deeper
              roots — when there&apos;s grief that hasn&apos;t been processed, anger that&apos;s
              been turned inward, or patterns from earlier in life that are still shaping your
              present.
            </p>
            <p className={p}>
              <strong>Working with the body</strong>{' '}is part of it too. Depression lives in the
              body, not just the mind. Sleep, movement, sunlight, nutrition, and nervous system
              regulation all play a role. We work with what&apos;s practical given where you are.
            </p>

            <h2 className={h2}>What therapy with me looks like</h2>
            <p className={p}>
              If you&apos;re in the thick of depression, the idea of &ldquo;doing therapy&rdquo;
              can itself feel exhausting. We start where you are. Sometimes the first weeks are
              about easing the load — finding small things that help, getting some momentum back,
              building the capacity to do more focused work.
            </p>
            <p className={p}>
              You don&apos;t have to come to therapy ready to engage at full tilt. You just have to
              come. We figure out the rest together.
            </p>
            <p className={p}>
              If you&apos;re currently in crisis or having thoughts of harming yourself, please
              contact the Samaritans on 116 123 or go to your nearest emergency department. Therapy
              is a good fit alongside other supports, but it&apos;s not an emergency service.
            </p>
          </article>
        </div>
      </section>

      <ServiceHowSessionsWork />
      <ServiceCTA />
    </>
  );
}
