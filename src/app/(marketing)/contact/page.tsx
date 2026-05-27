import type { Metadata } from 'next';
import Image from 'next/image';
import Script from 'next/script';
import { submitContactForm } from './actions';
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

const inputClass =
  'w-full rounded-md px-3 py-3 text-sm font-normal bg-white text-gray-800 ' +
  'border border-[#D0C8BC] focus:outline-none focus:border-[#2a4d3c] ' +
  'focus:ring-1 focus:ring-[#2a4d3c] h-can:transition-colors placeholder:text-gray-400';

const labelClass =
  'block text-xs font-normal uppercase tracking-normal text-gray-500 mb-1.5';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ContactPage({ searchParams }: Props) {
  const sp = await searchParams;
  const sent     = sp.sent  === '1';
  const hasError = sp.error === '1';

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
                    <p className="font-normal text-sm text-gray-700 mb-1">{hours}</p>
                    <p className="text-sm font-normal uppercase tracking-normal text-orange mt-3">
                      {format}
                    </p>
                  </div>
                </div>
              ))}
              <p className="font-normal text-sm leading-[1.8]" style={{ color: '#555555' }}>
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
                  className="font-normal text-sm text-orange h-hover:underline"
                >
                  info@owenlynchtherapy.com
                </a>
              </div>
              <div>
                <p className={labelClass}>Phone</p>
                <a
                  href="tel:+353851471689"
                  className="font-normal text-sm text-orange h-hover:underline"
                >
                  085 147 1689
                </a>
              </div>
              <div>
                <p className={labelClass}>Address</p>
                <address className="font-normal text-sm text-gray-700 not-italic leading-[1.8]">
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

          {/* Form column */}
          <div>
            <h3
              id="contact-form-heading"
              className="font-heading font-light text-2xl text-forest mb-8"
            >
              Send a Message
            </h3>

            {sent ? (
              <div
                className="rounded-lg p-6 text-sm font-normal leading-[1.8]"
                style={{
                  backgroundColor: '#eef6f1',
                  color: '#2a4d3c',
                  border: '1px solid rgba(42,77,60,0.2)',
                }}
                role="alert"
              >
                Thank you for getting in touch. I&apos;ll get back to you within one working day.
              </div>
            ) : (
              <>
                {hasError && (
                  <div
                    className="rounded-lg p-4 mb-6 text-sm font-normal leading-[1.8]"
                    style={{
                      backgroundColor: '#fdf0eb',
                      color: '#c85a1a',
                      border: '1px solid rgba(200,90,26,0.2)',
                    }}
                    role="alert"
                  >
                    Something went wrong. Please try emailing{' '}
                    <a href="mailto:info@owenlynchtherapy.com" className="underline">
                      info@owenlynchtherapy.com
                    </a>{' '}
                    directly.
                  </div>
                )}

                <form action={submitContactForm} noValidate className="space-y-5">
                  {/* Honeypot — hidden from users, catches bots */}
                  <input
                    type="text"
                    name="website"
                    style={{ display: 'none' }}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="firstName" className={labelClass}>
                        First Name <span aria-hidden="true" className="text-orange">*</span>
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        autoComplete="given-name"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className={labelClass}>
                        Last Name <span aria-hidden="true" className="text-orange">*</span>
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        autoComplete="family-name"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Email Address <span aria-hidden="true" className="text-orange">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="Optional"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className={labelClass}>
                      Message <span aria-hidden="true" className="text-orange">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      required
                      placeholder="Tell me a little about what you're looking for..."
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  {process.env.TURNSTILE_SITE_KEY && (
                    <div
                      className="cf-turnstile"
                      data-sitekey={process.env.TURNSTILE_SITE_KEY}
                      data-theme="light"
                    />
                  )}

                  <button
                    type="submit"
                    className="w-full bg-orange text-white py-3.5 rounded-md text-xs uppercase tracking-normal font-normal h-hover:opacity-90 h-can:transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2"
                  >
                    Send Message
                  </button>
                </form>
              </>
            )}
          </div>
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
              <p className="font-normal text-sm text-gray-600 leading-[1.8]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
