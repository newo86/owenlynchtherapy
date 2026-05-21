import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Payment Confirmed | Owen Lynch Psychotherapy',
  robots: { index: false, follow: false },
};

export default function PaymentConfirmedPage() {
  return (
    <main
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', backgroundColor: '#F5F0E8' }}
    >
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div
          style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#4F8A6820', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12l5 5L19 7" stroke="#4F8A68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 28, color: '#2A4D3C', margin: '0 0 12px' }}>
          Payment confirmed
        </h1>
        <p style={{ fontSize: 15, color: '#666', lineHeight: 1.7, margin: '0 0 32px' }}>
          Thank you — your session is now secured. If you haven&apos;t already, please complete your intake form so Owen can prepare for your first session.
        </p>
        <Link
          href="/"
          style={{ display: 'inline-block', fontSize: 12, color: '#2A4D3C', letterSpacing: '1.5px', textTransform: 'uppercase', textDecoration: 'none', borderBottom: '1px solid #2A4D3C', paddingBottom: 2 }}
        >
          Return to website
        </Link>
      </div>
    </main>
  );
}
