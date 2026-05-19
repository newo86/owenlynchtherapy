import type { Metadata } from 'next';
import Link from 'next/link';
import FloatingCircles from '@/components/ui/floating-circles';

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main
      className="relative overflow-hidden flex-1 flex flex-col items-center justify-center px-6 py-32 text-center"
      style={{ backgroundColor: '#F5F0E8' }}
    >
      <FloatingCircles />
      <div className="relative flex flex-col items-center text-center" style={{ zIndex: 1 }}>
      <p
        style={{
          fontFamily: 'var(--font-poppins), system-ui, sans-serif',
          fontWeight: 600,
          fontSize: '11px',
          color: '#C85A1A',
          textTransform: 'uppercase',
          letterSpacing: '6px',
          marginBottom: '24px',
        }}
      >
        404
      </p>

      <h1
        style={{
          fontFamily: "'Avenir', 'Avenir Next', 'Nunito', system-ui, sans-serif",
          fontWeight: 300,
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          color: '#2A4D3C',
          lineHeight: 1.2,
          marginBottom: '20px',
          maxWidth: '520px',
        }}
      >
        This page doesn&apos;t exist yet
      </h1>

      <p
        style={{
          fontFamily: 'var(--font-poppins), system-ui, sans-serif',
          fontWeight: 400,
          fontSize: '15px',
          color: '#555',
          lineHeight: 1.8,
          maxWidth: '400px',
          marginBottom: '40px',
        }}
      >
        Looking for something? Get in touch and I&apos;ll point you in the right direction.
      </p>

      <div
        style={{ width: '40px', height: '1px', backgroundColor: '#D4A843', marginBottom: '40px' }}
        aria-hidden="true"
      />

      <Link
        href="/contact"
        className="inline-block text-white px-10 py-4 rounded-md text-xs uppercase tracking-normal font-normal hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#F5F0E8]"
        style={{ backgroundColor: '#C85A1A' }}
      >
        Get in Touch
      </Link>
      </div>
    </main>
  );
}
