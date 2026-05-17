import Link from 'next/link';

const CSS = `
  @keyframes breathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.06); }
  }

  .hero-c1 {
    position: absolute; border-radius: 50%; pointer-events: none;
    will-change: transform; z-index: 0;
    width: 380px; height: 380px;
    background: #4F8A68;
    top: -120px; left: -120px;
    animation: breathe 4s ease-in-out infinite;
  }
  .hero-c2 {
    position: absolute; border-radius: 50%; pointer-events: none;
    will-change: transform; z-index: 0;
    width: 300px; height: 300px;
    background: #2D5A42;
    top: 60px; left: -60px;
    animation: breathe 4s ease-in-out infinite;
  }
  .hero-c3 {
    position: absolute; border-radius: 50%; pointer-events: none;
    will-change: transform; z-index: 0;
    width: 220px; height: 220px;
    background: #C85A1A;
    bottom: -60px; left: -40px;
    animation: breathe 4s ease-in-out infinite;
  }
  .hero-c4 {
    position: absolute; border-radius: 50%; pointer-events: none;
    will-change: transform; z-index: 0;
    width: 280px; height: 280px;
    background: #D4A843;
    bottom: -80px; right: -60px;
    animation: breathe 4s ease-in-out infinite;
  }

  @media (min-width: 768px) {
    .hero-c1 { width: 600px; height: 600px; top: -150px; left: -150px; }
    .hero-c2 { width: 500px; height: 500px; top: 80px; left: -80px; }
    .hero-c3 { width: 350px; height: 350px; bottom: -80px; left: -60px; }
    .hero-c4 { width: 420px; height: 420px; bottom: -100px; right: -80px; }
  }
`;

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-start justify-center overflow-hidden pt-[15vh]"
      style={{ backgroundColor: '#2A4D3C' }}
      aria-labelledby="hero-heading"
    >
      <style>{CSS}</style>

      <div aria-hidden="true" className="hero-c1" />
      <div aria-hidden="true" className="hero-c2" />
      <div aria-hidden="true" className="hero-c3" />
      <div aria-hidden="true" className="hero-c4" />

      {/* Content — sits above circles */}
      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col items-center text-center px-6 sm:px-8">

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
        style={{ zIndex: 10 }}
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
