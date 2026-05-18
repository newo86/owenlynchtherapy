import type { Metadata } from 'next';
import Link from 'next/link';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import AnimatedCard from '@/components/ui/AnimatedCard';
import { Globe } from '@/components/ui/cobe-globe';
import FloatingCircles from '@/components/ui/floating-circles';

export const metadata: Metadata = {
  title: 'Therapy Services Dublin & Online | Owen Lynch Psychotherapy',
  description:
    'IAHIP and ICP accredited psychotherapy in Dublin and online. Specialist support for OCD, anxiety, ADHD, autism, depression, relationships, trauma, and LGBTQIA+ mental health.',
  alternates: { canonical: 'https://owenlynchtherapy.com/services' },
  openGraph: {
    title: 'Therapy Services Dublin & Online | Owen Lynch Psychotherapy',
    description:
      'IAHIP and ICP accredited psychotherapy in Dublin and online. Specialist support for OCD, anxiety, ADHD, autism, depression, relationships, trauma, and LGBTQIA+ mental health.',
    url: 'https://owenlynchtherapy.com/services',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalBusiness',
  '@id': 'https://owenlynchtherapy.com/#business',
  name: 'Owen Lynch Psychotherapy',
  url: 'https://owenlynchtherapy.com',
  description:
    'IAHIP and ICP accredited psychotherapy in Dublin and online.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '106 Capel Street',
    addressLocality: 'Dublin',
    postalCode: 'D01 WY40',
    addressCountry: 'IE',
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Psychotherapy Services',
    itemListElement: [
      { '@type': 'MedicalTherapy', name: 'OCD Therapy',          url: 'https://owenlynchtherapy.com/ocd-therapy-dublin' },
      { '@type': 'MedicalTherapy', name: 'Anxiety Therapy',      url: 'https://owenlynchtherapy.com/anxiety-therapy-dublin' },
      { '@type': 'MedicalTherapy', name: 'ADHD Therapy',         url: 'https://owenlynchtherapy.com/adhd-therapy-dublin' },
      { '@type': 'MedicalTherapy', name: 'Autism Therapy',       url: 'https://owenlynchtherapy.com/autism-therapy-dublin' },
      { '@type': 'MedicalTherapy', name: 'Depression Therapy',   url: 'https://owenlynchtherapy.com/depression-therapy-dublin' },
      { '@type': 'MedicalTherapy', name: 'Relationship Therapy', url: 'https://owenlynchtherapy.com/relationship-therapy-dublin' },
      { '@type': 'MedicalTherapy', name: 'Trauma Therapy',       url: 'https://owenlynchtherapy.com/trauma-therapy-dublin' },
      { '@type': 'MedicalTherapy', name: 'LGBTQIA+ Therapy',     url: 'https://owenlynchtherapy.com/lgbtqia-therapy-dublin' },
    ],
  },
};

const services = [
  {
    name: 'OCD',
    url: '/ocd-therapy-dublin',
    description:
      'Intrusive thoughts, compulsive behaviours, constant doubt – OCD can be exhausting and isolating. Therapy can help you break the cycle and reclaim your day-to-day life.',
  },
  {
    name: 'Anxiety',
    url: '/anxiety-therapy-dublin',
    description:
      "Racing thoughts, constant worry, a body that won't settle – anxiety can make everything feel harder than it should. Therapy offers a space to understand what's driving it and find steadier ground.",
  },
  {
    name: 'ADHD',
    url: '/adhd-therapy-dublin',
    description:
      "Whether you're recently diagnosed or starting to wonder if ADHD might explain a lot, therapy can help you make sense of how your brain works – and build a life that works with it, not against it.",
  },
  {
    name: 'Autism',
    url: '/autism-therapy-dublin',
    description:
      "Late diagnosis, masking, sensory overwhelm, navigating a world that wasn't designed with you in mind – therapy can be a space to understand yourself better and live more comfortably as you are.",
  },
  {
    name: 'Depression',
    url: '/depression-therapy-dublin',
    description:
      'Loss of motivation, withdrawing from the people and things you care about, a heaviness that won\'t lift – therapy can help you gently reconnect with yourself and find a way forward.',
  },
  {
    name: 'Relationships',
    url: '/relationship-therapy-dublin',
    description:
      'Patterns that keep repeating, communication that breaks down, feeling disconnected from the people closest to you – therapy can help you understand what\'s happening and start to shift it.',
  },
  {
    name: 'Trauma',
    url: '/trauma-therapy-dublin',
    description:
      'When difficult experiences from the past keep showing up in the present – in your body, your reactions, your relationships – therapy offers a safe space to process what happened at your own pace.',
  },
  {
    name: 'LGBTQIA+',
    url: '/lgbtqia-therapy-dublin',
    description:
      'Navigating identity, relationships, coming out, minority stress, chemsex, or just wanting a therapist who gets it without you having to explain – this is an affirming space where you can bring your whole self.',
  },
];

export default function ServicesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* ── Section 1: Hero ── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="relative overflow-hidden pt-[100px] pb-[60px] md:pt-[120px] md:pb-[80px] px-4 sm:px-6 lg:px-8"
        aria-labelledby="services-hero-heading"
      >
        <PageHeroCircles />

        <div className="relative z-10 max-w-6xl mx-auto">
          <p className="text-white text-sm font-semibold uppercase tracking-normal mb-5">
            What I work with
          </p>
          <h1
            id="services-hero-heading"
            className="font-heading font-light text-4xl sm:text-5xl lg:text-[3.25rem] leading-tight text-cream mb-6"
          >
            Therapy Services in Dublin &amp; Online
          </h1>
          <p className="font-normal text-base text-cream/75 leading-[1.8] max-w-2xl">
            I work with adults across a range of areas. Each person is different — sessions are
            tailored to you, not to a fixed programme.
          </p>
        </div>
      </section>

      {/* ── Section 2: Services grid ── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8"
        aria-labelledby="services-grid-heading"
      >
        <FloatingCircles />
        <div className="relative max-w-6xl mx-auto" style={{ zIndex: 1 }}>
          <p className="text-orange text-sm font-semibold uppercase tracking-normal mb-5">
            Areas of practice
          </p>
          <h2
            id="services-grid-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-forest mb-14"
          >
            How I Can Help
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map(({ name, url, description }, i) => (
              <AnimatedCard key={name} index={i}>
                <Link
                  href={url}
                  className="group bg-white rounded-xl p-8 flex flex-col h-full shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 ease-out"
                >
                  {/* Gold accent line — extends on hover */}
                  <span
                    className="block h-[2px] w-10 group-hover:w-[60px] mb-6 transition-all duration-300 ease-out"
                    style={{ backgroundColor: '#d4a843' }}
                    aria-hidden="true"
                  />

                  <h3 className="font-heading font-light text-xl text-forest mb-3">
                    {name}
                  </h3>

                  <p className="font-normal text-sm text-gray-600 leading-[1.8] flex-1 mb-6">
                    {description}
                  </p>

                  <span className="inline-flex items-center gap-1.5 text-orange text-[10px] uppercase tracking-normal font-normal group-hover:gap-3 transition-all duration-200">
                    Learn more <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: How sessions work ── */}
      <section
        className="py-20 px-4 sm:px-6 lg:px-8 bg-white"
        aria-labelledby="process-heading"
      >
        <div className="max-w-[700px] mx-auto text-center">
          <p className="text-orange text-sm font-semibold uppercase tracking-normal mb-5">
            The process
          </p>
          <h2
            id="process-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-forest mb-10"
          >
            How Sessions Work
          </h2>

          <p className="font-normal text-sm text-gray-600 leading-[1.8] mb-5">
            Sessions are 50 minutes and take place in person at Insight Matters, 106 Capel
            Street, Dublin 1, or online via a secure video call. I work with adults only.
          </p>
          <p className="font-normal text-sm text-gray-600 leading-[1.8] mb-5">
            I don&apos;t follow a fixed model or programme. We work at a pace that feels right for
            you, focusing on what matters most. Some people come for a few sessions with a specific
            issue in mind. Others work with me longer term.
          </p>
          <p className="font-normal text-sm text-gray-600 leading-[1.8] mb-10">
            If you&apos;re not sure whether therapy is right for you, or whether I&apos;m the right
            fit, feel free to get in touch. There&apos;s no pressure — it&apos;s just a conversation.
          </p>

          <Link
            href="/contact"
            className="inline-block bg-orange text-white px-8 py-3.5 rounded-md text-xs uppercase tracking-normal font-normal hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2"
          >
            Get in touch
          </Link>
        </div>
      </section>

      {/* ── Section 4: Online therapy ── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="py-20 px-4 sm:px-6 lg:px-8"
        aria-labelledby="online-heading"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Text */}
          <div>
            <p className="text-orange text-sm font-semibold uppercase tracking-normal mb-5">
              Online therapy
            </p>
            <h2
              id="online-heading"
              className="font-heading font-light text-3xl sm:text-4xl text-forest mb-8"
            >
              Available Across Ireland &amp; the UK
            </h2>
            <p className="font-normal text-sm text-gray-600 leading-[1.8]">
              All sessions are available online via secure video call — no travel, no waiting
              rooms, no compromise on quality. Online therapy works just as well as in-person for
              most people and many clients prefer it.
            </p>
          </div>

          {/* Globe */}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-full max-w-[420px] md:max-w-[450px]">
              <Globe
                markers={[
                  { id: "dublin", location: [53.3498, -6.2603], label: "Dublin" },
                  { id: "london", location: [51.5074, -0.1278], label: "London" },
                ]}
                arcs={[
                  {
                    id: "dublin-london",
                    from: [53.3498, -6.2603],
                    to: [51.5074, -0.1278],
                  },
                ]}
                baseColor={[0.96, 0.94, 0.91]}
                markerColor={[0.78, 0.35, 0.10]}
                arcColor={[0.16, 0.30, 0.24]}
                glowColor={[0.96, 0.94, 0.91]}
                dark={0}
                mapBrightness={8}
                markerSize={0.04}
                markerElevation={0.02}
                arcWidth={0.6}
                arcHeight={0.3}
                speed={0.002}
                theta={0.3}
                diffuse={1.5}
                mapSamples={16000}
              />
            </div>
            <p className="font-normal text-xs text-gray-400 leading-relaxed text-center max-w-[320px]">
              Available in person in Dublin and online across Ireland &amp; the UK
            </p>
          </div>

        </div>
      </section>

      {/* ── Section 5: CTA ── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="py-24 px-4 sm:px-6 lg:px-8"
        aria-labelledby="services-cta-heading"
      >
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-orange text-sm font-semibold uppercase tracking-normal mb-5">
            Get in touch
          </p>
          <h2
            id="services-cta-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-cream mb-6"
          >
            Ready to get started?
          </h2>
          <p className="font-normal text-sm text-cream/70 leading-[1.8] mb-10">
            Getting started can feel daunting. Send me a message and I&apos;ll get back to you
            within one working day.
          </p>
          <span
            className="block w-12 h-px mx-auto mb-8"
            style={{ backgroundColor: '#d4a843' }}
            aria-hidden="true"
          />
          <Link
            href="/contact"
            className="inline-block bg-orange text-white px-10 py-4 rounded-md text-xs uppercase tracking-normal font-normal hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2A4D3C]"
          >
            Get in touch
          </Link>
        </div>
      </section>
    </>
  );
}
