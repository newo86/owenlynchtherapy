"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import PillNav from "@/components/ui/pill-nav"
import { PRACTICE } from '@/practice.config';

const OLMark = ({ size = 48 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
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
)

export default function Header() {
  const pathname = usePathname()
  const isHomepage = pathname === "/"
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    // Reset when navigating
    setPastHero(false)

    if (!isHomepage) return

    const onScroll = () => {
      // Switch to solid when scrolled past ~70% of viewport height
      setPastHero(window.scrollY > window.innerHeight * 0.7)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [isHomepage])

  // Transparent: homepage and not yet scrolled past hero
  const transparent = isHomepage && !pastHero
  // Show spacer below fixed header on non-homepage pages (or scrolled homepage)
  const needsSpacer = !isHomepage

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          transparent
            ? "bg-transparent shadow-none"
            : "bg-linen/95 backdrop-blur-sm shadow-sm border-b border-forest/10"
        }`}
      >
        {/* ── Desktop header ── */}
        <div className="hidden md:flex items-center h-20 px-8 gap-4">
          {/* Logo — always in DOM for layout balance; invisible when transparent */}
          <Link
            href="/"
            aria-label={`${PRACTICE.businessName} — home`}
            tabIndex={transparent ? -1 : 0}
            aria-hidden={transparent}
            className={`flex-shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest transition-opacity duration-300 ${
              transparent ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            <OLMark size={48} />
          </Link>

          {/* Pill nav — centred */}
          <div className="flex-1 flex justify-center">
            <PillNav variant={transparent ? "transparent" : "solid"} />
          </div>

          {/* Balance spacer matching logo width */}
          <div className="w-12 flex-shrink-0" aria-hidden="true" />
        </div>

        {/* ── Mobile header — logo only, hidden while hero is visible ── */}
        <div
          className={`md:hidden flex items-center justify-center h-16 px-4 transition-all duration-300 ${
            transparent ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <Link
            href="/"
            aria-label={`${PRACTICE.businessName} — home`}
            tabIndex={transparent ? -1 : 0}
            aria-hidden={transparent}
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          >
            <OLMark size={40} />
          </Link>
        </div>
      </div>

      {/* Spacer so fixed header doesn't cover page content on non-homepage pages */}
      {needsSpacer && (
        <div className="h-16 md:h-20" aria-hidden="true" />
      )}
    </>
  )
}
