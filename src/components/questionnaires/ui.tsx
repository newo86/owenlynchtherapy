import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { PRACTICE } from '@/practice.config';

// Shared pieces for the client questionnaires (/values, /preferences).
// Same ground, card and button language as the intake form.

export function OLMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="100" cy="100" r="82" fill="none" stroke="#C85A1A" strokeWidth="9"
        strokeLinecap="round" strokeDasharray="335 180" transform="rotate(70,100,100)" />
      <circle cx="100" cy="100" r="50" fill="none" stroke="#2A4D3C" strokeWidth="6"
        strokeLinecap="round" strokeDasharray="200 100" transform="rotate(70,100,100)" />
      <text x="100" y="108" fontFamily="Avenir,'Avenir Next',Montserrat,sans-serif"
        fontSize="44" fontWeight="300" fill="#2A4D3C" textAnchor="middle">OL</text>
    </svg>
  );
}

export function QShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-linen px-5 py-10 md:py-16">
      <div className={`${wide ? 'max-w-[760px]' : 'max-w-[640px]'} mx-auto flex flex-col gap-8`}>{children}</div>
    </div>
  );
}

export function QCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-[#E9E2D6] px-5 py-7 md:px-10 md:py-10 shadow-[0_1px_2px_rgba(42,77,60,0.05)] ${className}`}>
      {children}
    </div>
  );
}

export function QHeading({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3">
      <h1 className="font-heading font-light text-4xl text-forest [text-wrap:balance]">{title}</h1>
      <span className="block w-12 h-0.5 bg-gold" aria-hidden />
      {lead && <p className="text-base leading-relaxed text-ink-soft [text-wrap:pretty]">{lead}</p>}
    </header>
  );
}

export function QProgress({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-heading font-light text-2xl text-forest">{label}</h2>
        <span className="text-sm text-ink-soft whitespace-nowrap">Step {step} of {total}</span>
      </div>
      <div className="w-full h-1 rounded-full bg-[#E9E2D6]">
        <div className="h-1 rounded-full bg-green transition-all duration-500" style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}

export function PrimaryButton({ children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center min-h-12 px-7 rounded-md bg-orange text-white text-base font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-forest ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center min-h-12 px-5 rounded-md text-forest text-base border border-[#D9D0C2] bg-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-forest ${className}`}
    >
      {children}
    </button>
  );
}

export function NavRow({ onBack, children }: { onBack?: () => void; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 print:hidden">
      {onBack ? <SecondaryButton onClick={onBack}>Back</SecondaryButton> : <span />}
      {children}
    </div>
  );
}

export type InvalidReason = 'invalid' | 'expired' | 'used';

const INVALID: Record<InvalidReason, { heading: string; body: string }> = {
  invalid: { heading: 'Link not recognised', body: 'This link doesn’t seem to be valid. Please check the link you were sent, or get in touch for a new one.' },
  expired: { heading: 'This link has expired', body: 'Links stay open for 14 days. Get in touch and I’ll send you a new one.' },
  used: { heading: 'Already completed', body: 'This link has already been used, so your answers are safely with me. If you’d like to change anything, we can talk about it in a session.' },
};

export function QInvalid({ reason }: { reason: InvalidReason }) {
  const m = INVALID[reason];
  return <QMessage heading={m.heading} body={m.body} contact />;
}

export function QMessage({ heading, body, contact = false }: { heading: string; body: ReactNode; contact?: boolean }) {
  return (
    <div className="min-h-[60vh] bg-linen flex items-center justify-center px-5 py-20">
      <div className="max-w-md w-full text-center flex flex-col items-center gap-5">
        <OLMark size={56} />
        <span className="block w-10 h-0.5 bg-gold" aria-hidden />
        <h1 className="font-heading font-light text-3xl text-forest [text-wrap:balance]">{heading}</h1>
        <div className="text-base leading-relaxed text-ink-soft [text-wrap:pretty]">{body}</div>
        {contact && (
          <a href={`mailto:${PRACTICE.email}`} className="text-base text-orange underline underline-offset-4">
            Email {PRACTICE.practitionerFirstName}
          </a>
        )}
      </div>
    </div>
  );
}

/** Keep a draft per link for this browser tab only (sessionStorage), so a
 *  refresh doesn't lose answers but nothing lingers on a shared device once the
 *  tab is closed. Wrapped: storage can be unavailable (private mode). */
export function loadDraft<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
export function saveDraft(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
export function clearDraft(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
}
