'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const navLinks = [
  { href: '/about',    label: 'About'    },
  { href: '/services', label: 'Services' },
  { href: '/blog',     label: 'Blog'     },
  { href: '/faq',      label: 'FAQ'      },
  { href: '/contact',  label: 'Contact'  },
] as const;

const OLMark = () => (
  <svg
    width="56"
    height="56"
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <circle cx="100" cy="100" r="82" fill="none" stroke="#C85A1A" strokeWidth="9"
      strokeLinecap="round" strokeDasharray="335 180" transform="rotate(70,100,100)" />
    <circle cx="100" cy="100" r="50" fill="none" stroke="#2A4D3C" strokeWidth="6"
      strokeLinecap="round" strokeDasharray="200 100" transform="rotate(70,100,100)" />
    <text x="100" y="108" fontFamily="Avenir,'Avenir Next',Montserrat,sans-serif"
      fontSize="44" fontWeight="300" fill="#2A4D3C" textAnchor="middle">OL</text>
  </svg>
);

export default function Header() {
  const pathname            = usePathname();
  const [open, setOpen]     = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  const linkClass = (href: string) =>
    `text-[12px] font-medium uppercase tracking-normal transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest rounded-sm ${
      pathname === href ? 'text-orange' : 'text-forest hover:text-orange'
    }`;

  return (
    <div className="sticky top-0 z-50">
      <header
        style={{ backgroundColor: '#F5F0E8', borderBottom: '1px solid #E0D8CE' }}
        className={`transition-shadow duration-200 ${scrolled ? 'shadow-md' : ''}`}
      >
        <div className="w-full px-6 md:pl-10 md:pr-10 h-20 flex items-center justify-between">

          {/* Logo mark — left */}
          <Link
            href="/"
            aria-label="Owen Lynch Psychotherapy — home"
            className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest rounded-sm"
          >
            <OLMark />
          </Link>

          {/* Desktop nav — right */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-7 lg:gap-10">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={linkClass(href)}
                aria-current={pathname === href ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-md text-forest hover:bg-forest/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

        </div>
      </header>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className="md:hidden overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{
          maxHeight: open ? '480px' : '0',
          backgroundColor: '#F5F0E8',
          borderBottom: open ? '1px solid #E0D8CE' : 'none',
        }}
      >
        <nav aria-label="Mobile navigation" className="max-w-6xl mx-auto px-6 py-4">
          <ul className="list-none space-y-1">
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`block py-3 px-2 text-[15px] font-medium uppercase tracking-normal rounded-md transition-colors ${
                    pathname === href
                      ? 'text-orange'
                      : 'text-forest hover:text-orange hover:bg-forest/5'
                  }`}
                  aria-current={pathname === href ? 'page' : undefined}
                  style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
