'use client';

import { useState } from 'react';
import { PRACTICE } from '@/practice.config';

type Status = 'idle' | 'sending' | 'done' | 'error';

export default function UnsubscribeForm({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState('');

  async function submit() {
    setStatus('sending');
    setMsg('');
    try {
      const res = await fetch('/api/reminders/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('done');
      } else {
        setStatus('error');
        setMsg(json.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMsg('Network error — please try again.');
    }
  }

  if (!token) {
    return (
      <>
        <h1 className="font-heading font-light text-2xl text-forest mb-3">Link not recognised</h1>
        <p className="font-normal text-base text-gray-600 leading-[1.8]">
          This unsubscribe link looks incomplete. Please use the link from your reminder email, or email{' '}
          <a href={`mailto:${PRACTICE.email}`} className="text-orange underline">{PRACTICE.email}</a> and we&apos;ll take care of it.
        </p>
      </>
    );
  }

  if (status === 'done') {
    return (
      <>
        <h1 className="font-heading font-light text-2xl text-forest mb-3">You&apos;re unsubscribed</h1>
        <p className="font-normal text-base text-gray-600 leading-[1.8]">
          You won&apos;t receive any more automatic session reminders. You&apos;ll still get receipts and any direct messages from Owen.
        </p>
        <p className="font-normal text-sm text-gray-500 leading-[1.8] mt-4">
          Changed your mind? Just email <a href={`mailto:${PRACTICE.email}`} className="text-orange underline">{PRACTICE.email}</a> to turn reminders back on.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="font-heading font-light text-2xl text-forest mb-3">Unsubscribe from reminders?</h1>
      <p className="font-normal text-base text-gray-600 leading-[1.8] mb-6">
        You&apos;ll stop receiving automatic email reminders about your upcoming sessions. This won&apos;t affect receipts or any direct messages.
      </p>
      {status === 'error' && (
        <p className="font-normal text-sm text-orange leading-[1.7] mb-4">{msg}</p>
      )}
      <button
        onClick={submit}
        disabled={status === 'sending'}
        className="inline-block bg-orange text-white px-8 py-3.5 rounded-md text-xs uppercase tracking-normal font-normal h-hover:opacity-90 h-can:transition-opacity disabled:opacity-50"
      >
        {status === 'sending' ? 'Unsubscribing…' : 'Unsubscribe me'}
      </button>
    </>
  );
}
