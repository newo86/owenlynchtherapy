import Link from 'next/link';

const BREATHE_CSS = `
  @keyframes breathe {
    0%, 100% { transform: scale(1) translate(0px, 0px); }
    33%       { transform: scale(1.08) translate(-8px, 12px); }
    66%       { transform: scale(0.94) translate(10px, -8px); }
  }
`;

const circle = (
  overrides: React.CSSProperties,
  delay: string,
): React.CSSProperties => ({
  position: 'absolute',
  borderRadius: '50%',
  pointerEvents: 'none',
  userSelect: 'none',
  willChange: 'transform',
  animation: 'breathe 8s ease-in-out infinite',
  animationDelay: delay,
  ...overrides,
});

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-start justify-center overflow-hidden pt-[15vh]"
      style={{ backgroundColor: '#2A4D3C' }}
      aria-labelledby="hero-heading"
    >
      {/* Inline keyframes — bypasses any external CSS suppression on iOS Safari */}
      <style>{BREATHE_CSS}</style>

      {/* Breathing circles */}
      <div aria-hidden="true" style={circle({ width: '28%', aspectRatio: '1', top: '-15%', left: '-4%', background: '#5a9e78', opacity: 0.4 }, '0s')} />
      <div aria-hidden="true" style={circle({ width: '50%', aspectRatio: '1', bottom: '-30%', left: '-5%', background: '#3d7254' }, '1.5s')} />
      <div aria-hidden="true" style={circle({ width: '55%', aspectRatio: '1', bottom: '-35%', left: '25%',  background: '#2d5a42' }, '3s')} />
      <div aria-hidden="true" style={circle({ width: '32%', aspectRatio: '1', bottom: '-18%', right: '-3%', background: '#d4a843' }, '0.8s')} />
      <div aria-hidden="true" style={circle({ width: '18%', aspectRatio: '1', bottom: '-5%',  left: '-2%', background: '#c85a1a' }, '4.5s')} />

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
