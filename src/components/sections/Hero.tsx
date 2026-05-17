import Link from 'next/link';

const BREATHE_CSS = `
  @keyframes breathe1 { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
  @keyframes breathe2 { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.09); } }
  @keyframes breathe3 { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
  @media (max-width: 767px) {
    .hero-c1 { width: 25% !important; max-width: 120px !important; max-height: 120px !important; top: -80px !important; left: -80px !important; }
    .hero-c2 { width: 13% !important; max-width: 60px !important; max-height: 60px !important; bottom: -60px !important; left: -40px !important; }
    .hero-c3 { width: 18% !important; max-width: 90px !important; max-height: 90px !important; bottom: -80px !important; right: -60px !important; }
  }
`;

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-start justify-center overflow-hidden pt-[15vh]"
      style={{ backgroundColor: '#2A4D3C' }}
      aria-labelledby="hero-heading"
    >
      {/* Inline keyframes — bypasses any external CSS suppression on iOS Safari */}
      <style>{BREATHE_CSS}</style>

      {/* Breathing circles — constrained within hero, partially clipped at edges */}
      {/* Sage green — top-left */}
      <div aria-hidden="true" className="hero-c1" style={{ position: 'absolute', borderRadius: '50%', pointerEvents: 'none', width: '42%', aspectRatio: '1', top: '-8%', left: '-8%', background: '#4f8a68', opacity: 0.8, willChange: 'transform', animation: 'breathe1 8s ease-in-out infinite', animationDelay: '0s' }} />
      {/* Terracotta — bottom-left */}
      <div aria-hidden="true" className="hero-c2" style={{ position: 'absolute', borderRadius: '50%', pointerEvents: 'none', width: '22%', aspectRatio: '1', bottom: '-8%', left: '-4%', background: '#c85a1a', willChange: 'transform', animation: 'breathe2 8s ease-in-out infinite', animationDelay: '2.6s' }} />
      {/* Gold — bottom-right */}
      <div aria-hidden="true" className="hero-c3" style={{ position: 'absolute', borderRadius: '50%', pointerEvents: 'none', width: '30%', aspectRatio: '1', bottom: '-6%', right: '-6%', background: '#d4a843', willChange: 'transform', animation: 'breathe3 8s ease-in-out infinite', animationDelay: '5.2s' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 sm:px-8">

        {/* Brand mark */}
        <svg
          width="90"
          height="90"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="100" cy="100" r="82" fill="none" stroke="#C85A1A" strokeWidth="9"
            strokeLinecap="round" strokeDasharray="335 180" transform="rotate(70,100,100)" />
          <circle cx="100" cy="100" r="50" fill="none" stroke="#F5F0E8" strokeWidth="6"
            strokeLinecap="round" strokeDasharray="200 100" transform="rotate(70,100,100)" />
          <text x="100" y="108" fontFamily="Avenir,'Avenir Next',Montserrat,sans-serif"
            fontSize="44" fontWeight="300" fill="#F5F0E8" textAnchor="middle">OL</text>
        </svg>

        {/* Name */}
        <p style={{
          fontFamily: "var(--font-montserrat),'Montserrat',sans-serif",
          fontWeight: 400,
          fontSize: '26px',
          color: '#F5F0E8',
          textTransform: 'uppercase',
          letterSpacing: '5px',
          marginTop: '16px',
        }}>
          Owen Lynch
        </p>

        {/* Discipline */}
        <p style={{
          fontFamily: 'var(--font-poppins),Poppins,sans-serif',
          fontWeight: 600,
          fontSize: '13px',
          color: '#C85A1A',
          textTransform: 'uppercase',
          letterSpacing: '7px',
          marginTop: '4px',
        }}>
          Psychotherapy
        </p>

        {/* Gold rule */}
        <div aria-hidden="true" style={{
          width: '40px',
          height: '1px',
          backgroundColor: '#D4A843',
          marginTop: '24px',
          marginBottom: '24px',
        }} />

        {/* H1 */}
        <h1
          id="hero-heading"
          className="text-[36px] md:text-[52px]"
          style={{
            fontFamily: "'Avenir','Avenir Next','Nunito',system-ui,sans-serif",
            fontWeight: 300,
            color: '#ffffff',
            letterSpacing: '1px',
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          Psychotherapy in Dublin &amp; Online
        </h1>

        {/* Tagline */}
        <p style={{
          fontFamily: 'var(--font-poppins),Poppins,sans-serif',
          fontWeight: 400,
          fontSize: '16px',
          color: 'rgba(255,255,255,0.85)',
          marginTop: '16px',
          maxWidth: '480px',
          lineHeight: 1.7,
        }}>
          A warm, confidential space to explore what&apos;s troubling you.
        </p>

        {/* CTA */}
        <Link
          href="/contact"
          className="inline-block bg-orange text-white px-10 py-4 rounded-md text-xs uppercase tracking-[2px] font-normal hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2A4D3C]"
          style={{ marginTop: '32px' }}
        >
          Get in touch
        </Link>

      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        aria-hidden="true"
      >
        <span className="text-white/40 text-[10px] uppercase tracking-[3px]">Scroll</span>
        <svg
          className="w-4 h-4 text-white/40 animate-bounce"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
