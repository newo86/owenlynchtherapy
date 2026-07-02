import Image from 'next/image';
import Link from 'next/link';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/articles', label: 'Articles' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#2A4D3C' }} className="text-cream" role="contentinfo">
      <div className="max-w-6xl mx-auto px-6 lg:px-16 pt-12 pb-24 md:pb-8">

        {/* Three-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1.2fr] gap-10 md:gap-8">

          {/* Left — brand */}
          <div className="flex flex-col gap-3">
            <p className="font-heading font-light text-xl text-white leading-snug">
              Owen Lynch Psychotherapy
            </p>
            <p className="text-sm text-cream/60 leading-relaxed max-w-xs">
              Evidence-based therapy in Dublin &amp; online.
            </p>
            <a
              href="https://www.instagram.com/owenlynchtherapy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Owen Lynch Psychotherapy on Instagram"
              className="inline-flex text-white/50 h-hover:text-white h-can:transition-colors w-fit"
            >
              {/* Instagram icon */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>

          {/* Middle — pages, two columns to stay short */}
          <nav aria-label="Footer navigation" className="flex flex-col gap-4">
            <p className="text-xs font-normal uppercase tracking-widest text-cream/40">
              Pages
            </p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2 list-none max-w-[200px]">
              {navLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-cream/70 h-hover:text-white h-can:transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right — contact */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-normal uppercase tracking-widest text-cream/40">
              Contact
            </p>
            <address className="text-sm text-cream/60 not-italic leading-relaxed">
              Insight Matters, 106 Capel Street, Dublin 1, D01 WY40
              <br />
              <a
                href="tel:+353851471689"
                className="h-hover:text-white h-can:transition-colors"
              >
                085 147 1689
              </a>
              {' · '}
              <a
                href="mailto:info@owenlynchtherapy.com"
                className="h-hover:text-white h-can:transition-colors"
              >
                info@owenlynchtherapy.com
              </a>
            </address>
            <Link
              href="/contact"
              className="inline-block w-fit bg-[#C85A1A] text-white px-6 py-3 rounded-md text-xs uppercase tracking-normal font-normal h-hover:opacity-90 h-can:transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Get in touch
            </Link>
          </div>

        </div>

        {/* Divider */}
        <div className="mt-10 border-t border-white/10" />

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://psychotherapistdirectory.iahip.org/therapist/owen-lynch"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center h-hover:opacity-80 h-can:transition-opacity"
              style={{ background: '#fff', borderRadius: '6px', padding: '4px 10px' }}
              aria-label="IAHIP accredited psychotherapist — view directory listing"
            >
              <Image
                src="/images/IAHIPLogo.jpg"
                alt="IAHIP accredited psychotherapist"
                width={962}
                height={437}
                className="h-7 w-auto object-contain"
              />
            </a>

            <a
              href="https://psychotherapycouncil.ie/therapist/owen-lynch/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center h-hover:opacity-80 h-can:transition-opacity"
              style={{ background: '#fff', borderRadius: '6px', padding: '4px 10px' }}
              aria-label="Irish Council for Psychotherapy member — view directory listing"
            >
              <Image
                src="/images/ICP.png"
                alt="Irish Council for Psychotherapy member"
                width={324}
                height={90}
                className="h-7 w-auto object-contain"
              />
            </a>

            <a
              href="https://www.psychologytoday.com/ie/counselling/owen-lynch-dublin-dn/1745757"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-hover:opacity-80 h-can:transition-opacity"
              style={{ background: '#c85a1a', borderRadius: '6px', padding: '5px 12px' }}
              aria-label="Verified by Psychology Today"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="white" strokeWidth="1.5" />
                <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-white text-xs font-normal" style={{ letterSpacing: '0.03em' }}>
                Verified by Psychology Today
              </span>
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-cream/40 md:text-right">
            &copy; 2026 Owen Lynch Psychotherapy · IAHIP &amp; ICP Accredited
          </p>

        </div>

      </div>
    </footer>
  );
}
