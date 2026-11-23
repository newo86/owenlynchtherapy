'use client';

import { useState } from 'react';
import { PRACTICE } from '@/practice.config';

type Answer = 'yes' | 'no';

export default function RespondForm({ token, initial }: { token: string; initial: Answer }) {
  const [answer, setAnswer] = useState<Answer>(initial);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(a: Answer) {
    setStatus('sending');
    setMsg('');
    try {
      const res = await fetch('/api/waitlist/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: token, answer: a }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) { setAnswer(a); setStatus('done'); }
      else { setStatus('error'); setMsg(json.error ?? 'Something went wrong. Please try again.'); }
    } catch {
      setStatus('error');
      setMsg('Network error. Please try again.');
    }
  }

  const mail = <a href={`mailto:${PRACTICE.email}`} className="text-orange underline">{PRACTICE.email}</a>;
  const primary = 'inline-block bg-orange text-white px-8 py-3.5 rounded-md text-xs uppercase tracking-normal font-normal h-hover:opacity-90 h-can:transition-opacity disabled:opacity-50';
  const secondary = 'text-sm text-ink-soft underline underline-offset-2 mt-5 disabled:opacity-50';

  if (!token) {
    return (
      <>
        <h1 className="font-heading font-light text-2xl text-forest mb-3">Link not recognised</h1>
        <p className="font-normal text-base text-gray-600 leading-[1.8]">
          Please use the button in your email, or just email {mail} and let me know.
        </p>
      </>
    );
  }

  if (status === 'done') {
    return answer === 'yes' ? (
      <>
        <h1 className="font-heading font-light text-2xl text-forest mb-3">Thank you</h1>
        <p className="font-normal text-base text-gray-600 leading-[1.8]">
          You&apos;re staying on the waiting list. I&apos;ll be in touch as soon as a space opens up.
        </p>
      </>
    ) : (
      <>
        <h1 className="font-heading font-light text-2xl text-forest mb-3">Thanks for letting me know</h1>
        <p className="font-normal text-base text-gray-600 leading-[1.8]">
          I&apos;ve taken you off the waiting list. I wish you all the best, and you&apos;re always welcome to get in touch again.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="font-heading font-light text-2xl text-forest mb-3">
        {answer === 'yes' ? 'Stay on the waiting list?' : 'Come off the waiting list?'}
      </h1>
      <p className="font-normal text-base text-gray-600 leading-[1.8] mb-6">
        {answer === 'yes'
          ? 'Tap below to let me know you’re still looking for therapy.'
          : 'Tap below and I’ll take you off the list. You’re always welcome to get in touch again.'}
      </p>
      {status === 'error' && <p className="font-normal text-sm text-orange leading-[1.7] mb-4">{msg}</p>}
      <button onClick={() => submit(answer)} disabled={status === 'sending'} className={primary}>
        {status === 'sending' ? 'Sending…' : answer === 'yes' ? 'Yes, keep me on the list' : 'Yes, take me off'}
      </button>
      <div>
        <button
          onClick={() => setAnswer(answer === 'yes' ? 'no' : 'yes')}
          disabled={status === 'sending'}
          className={secondary}
        >
          {answer === 'yes' ? 'Actually, please take me off' : 'Actually, keep me on the list'}
        </button>
      </div>
    </>
  );
}
