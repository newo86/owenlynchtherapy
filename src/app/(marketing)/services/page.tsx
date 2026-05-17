import type { Metadata } from 'next';
import Link from 'next/link';

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
        className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8"
        aria-labelledby="services-hero-heading"
      >
        <div aria-hidden="true" className="services-hero-circle services-hero-circle-1" />
        <div aria-hidden="true" className="services-hero-circle services-hero-circle-2" />
        <div aria-hidden="true" className="services-hero-circle services-hero-circle-3" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <p className="text-orange text-xs font-normal uppercase tracking-[3px] mb-5">
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
        className="py-20 px-4 sm:px-6 lg:px-8"
        aria-labelledby="services-grid-heading"
      >
        <div className="max-w-6xl mx-auto">
          <p className="text-orange text-xs font-normal uppercase tracking-[3px] mb-5">
            Areas of practice
          </p>
          <h2
            id="services-grid-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-forest mb-14"
          >
            How I Can Help
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map(({ name, url, description }) => (
              <Link
                key={name}
                href={url}
                className="group bg-white rounded-xl p-8 flex flex-col shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 ease-out"
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

                <span className="inline-flex items-center gap-1.5 text-orange text-[10px] uppercase tracking-[2px] font-normal group-hover:gap-3 transition-all duration-200">
                  Learn more <span aria-hidden="true">→</span>
                </span>
              </Link>
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
          <p className="text-orange text-xs font-normal uppercase tracking-[3px] mb-5">
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
            className="inline-block bg-orange text-white px-8 py-3.5 rounded-md text-xs uppercase tracking-[2px] font-normal hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2"
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
            <p className="text-orange text-xs font-normal uppercase tracking-[3px] mb-5">
              Online therapy
            </p>
            <h2
              id="online-heading"
              className="font-heading font-light text-3xl sm:text-4xl text-forest mb-8"
            >
              Available Across Ireland &amp; the UK
            </h2>
            <p className="font-normal text-sm text-gray-600 leading-[1.8] mb-8">
              All sessions are available online via secure video call — no travel, no waiting
              rooms, no compromise on quality. Online therapy works just as well as in-person for
              most people and many clients prefer it.
            </p>
            <Link
              href="/online-therapy-ireland"
              className="inline-flex items-center gap-2 text-orange text-xs font-normal uppercase tracking-[2px] hover:gap-3 transition-all duration-200"
            >
              Learn more <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Ireland & Great Britain map */}
          <div className="flex items-center justify-center">
            <svg
              viewBox="0 0 280 380"
              width="300"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-labelledby="map-title"
              style={{ overflow: 'visible' }}
            >
              <title id="map-title">Map of Ireland and Great Britain with Dublin and UK marked</title>

              {/* Great Britain — forest green, clockwise from Cape Wrath */}
              <path
                d="M 129 74 L 164 72 L 194 104 L 184 134 L 178 154 L 194 164
                   L 206 192 L 235 217 L 248 255 L 265 254 L 268 302 L 265 310
                   L 258 317 L 220 323 L 184 330 L 114 344 L 139 317 L 143 299
                   L 128 285 L 134 261 L 136 239 L 153 242 L 168 239 L 167 217
                   L 132 200 L 112 179 L 102 134 L 118 98 Z"
                fill="#2D5A42"
                fillOpacity="0.6"
              />

              {/* Ireland — sage green, clockwise from Malin Head */}
              <path
                d="M 77 178 L 103 183 L 115 205 L 100 221 L 102 242
                   L 107 254 L 97 279 L 86 282 L 53 295 L 27 303
                   L 14 290 L 23 268 L 41 245 L 19 237 L 19 212
                   L 62 200 Z"
                fill="#4F8A68"
                fillOpacity="0.8"
              />

              {/* Dublin pin */}
              <circle className="map-pin-ring" cx="102" cy="242" r="5" fill="none" stroke="#D4A843" strokeWidth="1.5" />
              <circle cx="102" cy="242" r="3.5" fill="#D4A843" />
              <text x="111" y="246" fontFamily="Poppins,sans-serif" fontSize="10" fill="#C85A1A">Dublin</text>

              {/* London / UK pin */}
              <circle className="map-pin-ring map-pin-ring-london" cx="234" cy="300" r="4" fill="none" stroke="#D4A843" strokeWidth="1.5" />
              <circle cx="234" cy="300" r="2.5" fill="#D4A843" />
              <text x="242" y="304" fontFamily="Poppins,sans-serif" fontSize="10" fill="#C85A1A">UK</text>
            </svg>
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
          <p className="text-orange text-xs font-normal uppercase tracking-[3px] mb-5">
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
            className="inline-block bg-orange text-white px-10 py-4 rounded-md text-xs uppercase tracking-[2px] font-normal hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2A4D3C]"
          >
            Get in touch
          </Link>
        </div>
      </section>
    </>
  );
}
