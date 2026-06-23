import type { Metadata } from 'next';
import { Suspense } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import ContactForm from './ContactForm';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FloatingCircles from '@/components/ui/floating-circles';

export const metadata: Metadata = {
  title: 'Contact Owen Lynch | Psychotherapist Dublin',
  description:
    'Get in touch with Owen Lynch, IAHIP and ICP accredited psychotherapist in Dublin. Currently accepting new clients on Tuesday evenings and Friday evenings.',
  alternates: {
    canonical: 'https://owenlynchtherapy.com/contact',
    languages: {
      'en': 'https://owenlynchtherapy.com/contact',
      'x-default': 'https://owenlynchtherapy.com/contact',
    },
  },
  openGraph: {
    title: 'Contact Owen Lynch | Psychotherapist Dublin',
    description:
      'Get in touch with Owen Lynch, IAHIP and ICP accredited psychotherapist in Dublin.',
    url: 'https://owenlynchtherapy.com/contact',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://owenlynchtherapy.com/#business',
  name: 'Owen Lynch Psychotherapy',
  url: 'https://owenlynchtherapy.com',
  telephone: '+353851471689',
  email: 'info@owenlynchtherapy.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '106 Capel Street',
    addressLocality: 'Dublin',
    postalCode: 'D01 WY40',
    addressCountry: 'IE',
  },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Tuesday', opens: '17:00', closes: '20:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Friday',  opens: '16:00', closes: '20:00' },
  ],
};

const availability = [
  { day: 'Tuesday Evenings', hours: '5:00pm – 8:00pm', format: 'Online' },
  { day: 'Friday Evenings',  hours: '4:00pm – 8:00pm', format: 'In Person & Online' },
];

const reassurance = [
  {
    heading: 'Confidential',
    body: 'Everything discussed in therapy remains private and confidential.',
  },
  {
    heading: 'No pressure',
    body: "Getting in touch doesn't commit you to anything. It's just a conversation.",
  },
  {
    heading: 'Quick response',
    body: 'I aim to reply to all messages within one working day.',
  },
];

const labelClass =
  'block text-xs font-normal uppercase tracking-normal text-gray-500 mb-1.5';

export default function ContactPage() {
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
        aria-labelledby="contact-hero-heading"
      >
        <PageHeroCircles />

        <div className="relative z-10 max-w-6xl mx-auto">
          <p className="text-white text-sm font-semibold uppercase tracking-normal mb-5">
            Get in touch
          </p>
          <h1
            id="contact-hero-heading"
            className="font-heading font-light text-4xl sm:text-5xl lg:text-[3.25rem] leading-tight text-cream mb-6"
          >
            Contact Owen Lynch
          </h1>
          <p className="font-normal text-base text-cream/75 leading-[1.8] max-w-lg">
            I respond to all enquiries within one working day.
          </p>
        </div>
      </section>

      {/* ── Section 2: Availability + Venue image ── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8"
        aria-labelledby="availability-heading"
      >
        <FloatingCircles />
        <div className="relative max-w-6xl mx-auto" style={{ zIndex: 1 }}>
          <p className="text-orange text-sm font-semibold uppercase tracking-normal mb-5">
            Accepting new clients
          </p>
          <h2
            id="availability-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-forest mb-12"
          >
            Current Availability
          </h2>

          {/* Two-column: stacked cards left, image right */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

            {/* Left — stacked cards + note */}
            <div className="flex flex-col gap-6">
              {availability.map(({ day, hours, format }) => (
                <div key={day} className="service-card-border rounded-lg">
                  <div
                    className="relative z-[1] bg-white rounded-lg shadow-md p-6"
                    style={{ borderTop: '3px solid #c85a1a' }}
                  >
                    <p className="font-heading font-light text-lg text-forest mb-2">{day}</p>
                    <p className="font-normal text-base text-gray-700 mb-1">{hours}</p>
                    <p className="text-base font-normal uppercase tracking-normal text-orange mt-3">
                      {format}
                    </p>
                  </div>
                </div>
              ))}
              <p className="font-normal text-base leading-[1.8]" style={{ color: '#555555' }}>
                In-person sessions take place at Insight Matters, 106 Capel Street, Dublin 1.
                Online sessions are available to clients across Ireland and the UK.
              </p>
            </div>

            {/* Right — venue image, proportional */}
            <div
              className="w-full overflow-hidden"
              style={{ borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}
            >
              <Image
                src="/images/capel-street.png"
                alt="106 Capel Street, Dublin 1, where Owen Lynch sees clients in person at Insight Matters."
                width={2554}
                height={1664}
                className="w-full h-auto block"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

          </div>
        </div>
      </section>

      {/* ── Section 3: Info + Form ── */}
      <section
        className="py-20 px-4 sm:px-6 lg:px-8 bg-white"
        aria-labelledby="contact-form-heading"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-12 lg:gap-16">

          {/* Info column */}
          <div>
            <h3 className="font-heading font-light text-2xl text-forest mb-8">
              Get in Touch
            </h3>

            <div className="space-y-6 mb-10">
              <div>
                <p className={labelClass}>Email</p>
                <a
                  href="mailto:info@owenlynchtherapy.com"
                  className="font-normal text-base text-orange h-hover:underline"
                >
                  info@owenlynchtherapy.com
                </a>
              </div>
              <div>
                <p className={labelClass}>Phone</p>
                <a
                  href="tel:+353851471689"
                  className="font-normal text-base text-orange h-hover:underline"
                >
                  085 147 1689
                </a>
              </div>
              <div>
                <p className={labelClass}>Address</p>
                <address className="font-normal text-base text-gray-700 not-italic leading-[1.8]">
                  Insight Matters<br />
                  106 Capel Street<br />
                  Dublin 1, D01 WY40
                </address>
              </div>
            </div>

            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2381.894320464544!2d-6.270040684229736!3d53.34883197997623!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48670e87a5b8b8b7%3A0x1234567890abcdef!2s106%20Capel%20St%2C%20Dublin%201%2C%20D01%20WY40!5e0!3m2!1sen!2sie!4v1234567890123"
              width="100%"
              height="280"
              style={{ border: 0, borderRadius: '8px', display: 'block' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Insight Matters, 106 Capel Street, Dublin 1"
            />
          </div>

          {/* Form column — client island so the page itself stays static */}
          <Suspense fallback={null}>
            <ContactForm turnstileSiteKey={process.env.TURNSTILE_SITE_KEY} />
          </Suspense>
        </div>
      </section>

      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        async
        defer
      />

      {/* ── Section 4: Reassurance ── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8"
        aria-label="Why get in touch"
      >
        <FloatingCircles />
        <div className="relative max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10" style={{ zIndex: 1 }}>
          {reassurance.map(({ heading, body }) => (
            <div key={heading}>
              <span
                className="block w-8 h-px mb-5"
                style={{ backgroundColor: '#c85a1a' }}
                aria-hidden="true"
              />
              <h3 className="font-heading font-light text-xl text-forest mb-3">
                {heading}
              </h3>
              <p className="font-normal text-base text-gray-600 leading-[1.8]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
