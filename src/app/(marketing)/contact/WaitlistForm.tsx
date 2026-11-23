'use client';

import { useState } from 'react';
import { WAITLIST_CONSENT_TEXT } from '@/lib/waitlistConsent';
import { PRACTICE } from '@/practice.config';

const labelClass =
  'block text-sm font-medium text-ink-soft mb-1.5';
const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-800 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#C85A1A]/40 focus:border-[#C85A1A]';

export default function WaitlistForm({ hasInPerson = true }: { hasInPerson?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.get('full_name'),
          email: data.get('email'),
          phone: data.get('phone'),
          reason: data.get('reason'),
          format_preference: data.get('format_preference'),
          consent: data.get('consent') === 'on',
          website: data.get('website'), // honeypot
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setStatus('done');
      form.reset();
    } catch {
      setStatus('error');
      setError('Something went wrong. Please check your connection and try again.');
    }
  }

  if (status === 'done') {
    return (
      <div
        className="rounded-lg bg-white p-6 shadow-md"
        style={{ borderTop: '3px solid #4F8A68' }}
        role="status"
      >
        <p className="font-heading font-light text-lg text-forest mb-2">
          You&apos;re on the list
        </p>
        <p className="font-normal text-base text-gray-600 leading-[1.8]">
          I&apos;ll be in touch as soon as a space opens up. If anything changes in the
          meantime, you can email{' '}
          <a href={`mailto:${PRACTICE.email}`} className="text-orange h-hover:underline">{PRACTICE.email}</a>{' '}
          to update or remove your details.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg bg-white p-6 shadow-md" style={{ borderTop: '3px solid #c85a1a' }}>
      <p className="font-heading font-light text-lg text-forest mb-2">
        Join the waiting list
      </p>
      <p className="font-normal text-sm text-gray-600 leading-[1.7] mb-5">
        Leave your details and I&apos;ll contact you as soon as another space opens up.
      </p>

      {/* Honeypot — hidden from people, filled by bots. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="wl-name" className={labelClass}>Name *</label>
          <input id="wl-name" name="full_name" type="text" required maxLength={120} autoComplete="name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="wl-email" className={labelClass}>Email *</label>
          <input id="wl-email" name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} />
        </div>
      </div>
      <div className="mb-5">
        <label htmlFor="wl-phone" className={labelClass}>Phone (optional)</label>
        <input id="wl-phone" name="phone" type="tel" maxLength={40} autoComplete="tel" className={inputClass} />
      </div>

      {hasInPerson && (
        <fieldset className="mb-5">
          <legend className={labelClass}>Would you like online or in-person sessions? *</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1">
            {([
              ['online', 'Online'],
              ['in_person', 'In person (Capel Street, Dublin 1)'],
              ['either', 'Either is fine'],
            ] as const).map(([value, label]) => (
              <label key={value} className="inline-flex items-center gap-2 cursor-pointer text-base text-gray-700">
                <input type="radio" name="format_preference" value={value} required className="h-4 w-4 accent-[#C85A1A]" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mb-5">
        <label htmlFor="wl-reason" className={labelClass}>What brings you to therapy? (optional)</label>
        <textarea
          id="wl-reason"
          name="reason"
          rows={4}
          maxLength={1000}
          placeholder="A sentence or two about what you'd like to work on, only if you'd like to share. You can always tell me more when we speak."
          className={`${inputClass} resize-y`}
        />
        <p className="mt-1.5 text-xs text-ink-soft leading-[1.6]">
          Entirely optional. Share only what you&apos;re comfortable with, and feel free to leave this blank.
        </p>
      </div>

      <label className="flex items-start gap-3 mb-6 cursor-pointer">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 h-4 w-4 shrink-0 accent-[#C85A1A]"
        />
        <span className="font-normal text-xs text-gray-600 leading-[1.7]">
          {WAITLIST_CONSENT_TEXT}
        </span>
      </label>

      {error && (
        <p className="mb-4 text-sm text-orange" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-block bg-orange text-white px-8 py-3.5 rounded-md text-xs uppercase tracking-normal font-normal h-hover:opacity-90 h-can:transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {status === 'sending' ? 'Adding you…' : 'Join the waiting list'}
      </button>
    </form>
  );
}
