import Image from 'next/image';
import Link from 'next/link';

const footerLinks = [
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ backgroundColor: '#2A4D3C' }} className="text-cream" role="contentinfo">
      <div className="max-w-6xl mx-auto px-8 lg:px-16 py-12">

        {/* Three-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 md:gap-8 gap-10 items-start">

          {/* Brand — left */}
          <div>
            <p className="font-heading font-bold text-lg mb-3">
              Owen Lynch Psychotherapy
            </p>
            <p className="text-sm text-cream/75 leading-relaxed">
              Evidence-based therapy for anxiety, OCD, ADHD, autism, depression, trauma, and
              relationship difficulties.
            </p>
          </div>

          {/* Pages — centre */}
          <nav aria-label="Footer navigation" className="md:text-center">
            <p className="text-xs font-normal uppercase tracking-[3px] mb-4 text-cream/50">
              Pages
            </p>
            <ul className="space-y-2.5 list-none">
              {footerLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-cream/75 hover:text-cream transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact — right, right-aligned on desktop */}
          <div className="md:text-right">
            <p className="text-xs font-normal uppercase tracking-[3px] mb-4 text-cream/50">
              Contact
            </p>
            <Link
              href="/contact"
              className="inline-block w-full md:w-auto bg-orange text-white px-5 py-3 rounded-md text-xs uppercase tracking-[2px] font-normal text-center hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Get in touch
            </Link>
          </div>

        </div>

        {/* Accreditation badges — left-aligned */}
        <div className="mt-10 pt-8 border-t border-cream/15 flex flex-wrap items-center gap-3">
          <a
            href="https://psychotherapistdirectory.iahip.org/therapist/owen-lynch"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center hover:opacity-90 transition-opacity"
            style={{ background: '#fff', borderRadius: '6px', padding: '4px 10px' }}
            aria-label="IAHIP accredited psychotherapist — view directory listing"
          >
            <Image
              src="/images/IAHIPLogo.jpg"
              alt="IAHIP accredited psychotherapist"
              width={962}
              height={437}
              className="h-10 w-auto object-contain"
            />
          </a>

          <a
            href="https://psychotherapycouncil.ie/therapist/owen-lynch/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center hover:opacity-90 transition-opacity"
            style={{ background: '#fff', borderRadius: '6px', padding: '4px 10px' }}
            aria-label="Irish Council for Psychotherapy member — view directory listing"
          >
            <Image
              src="/images/ICP.png"
              alt="Irish Council for Psychotherapy member"
              width={324}
              height={90}
              className="h-10 w-auto object-contain"
            />
          </a>

          <a
            href="https://www.psychologytoday.com/ie/counselling/owen-lynch-dublin-dn/1745757"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
            style={{ background: '#c85a1a', borderRadius: '6px', padding: '6px 14px' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="white" strokeWidth="1.5" />
              <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-white text-xs font-normal" style={{ letterSpacing: '0.03em' }}>
              Verified by Psychology Today
            </span>
          </a>
        </div>

        {/* Copyright */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-cream/50">
          <p>&copy; {year} Owen Lynch Psychotherapy. All rights reserved.</p>
          <p>IAHIP &amp; ICP Accredited Psychotherapist</p>
        </div>

      </div>
    </footer>
  );
}
