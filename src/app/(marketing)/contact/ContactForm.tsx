'use client';

import { useSearchParams } from 'next/navigation';
import { submitContactForm } from './actions';
import { PRACTICE } from '@/practice.config';

// The post-submit banner state is read CLIENT-SIDE via useSearchParams (the
// server action redirects to ?sent=1 / ?error=1). Doing it here — rather than
// reading searchParams in the page — lets the /contact page stay statically
// prerendered. Must be rendered inside a <Suspense> boundary by the parent.

const inputClass =
  'w-full rounded-md px-3 py-3 text-base font-normal bg-white text-gray-800 ' +
  'border border-[#D0C8BC] focus:outline-none focus:border-[#2a4d3c] ' +
  'focus:ring-1 focus:ring-[#2a4d3c] h-can:transition-colors placeholder:text-gray-400';

const labelClass =
  'block text-xs font-normal uppercase tracking-normal text-gray-500 mb-1.5';

export default function ContactForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const sp = useSearchParams();
  const sent = sp.get('sent') === '1';
  const hasError = sp.get('error') === '1';

  return (
    <div>
      <h3
        id="contact-form-heading"
        className="font-heading font-light text-2xl text-forest mb-8"
      >
        Send a Message
      </h3>

      {sent ? (
        <div
          className="rounded-lg p-6 text-base font-normal leading-[1.8]"
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
              className="rounded-lg p-4 mb-6 text-base font-normal leading-[1.8]"
              style={{
                backgroundColor: '#fdf0eb',
                color: '#c85a1a',
                border: '1px solid rgba(200,90,26,0.2)',
              }}
              role="alert"
            >
              Something went wrong. Please try emailing{' '}
              <a href={`mailto:${PRACTICE.email}`} className="underline">{PRACTICE.email}</a>{' '}
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

            {turnstileSiteKey && (
              <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="light" />
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
  );
}
