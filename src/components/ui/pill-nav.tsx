"use client"

import React, { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Articles", href: "/articles" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
] as const

type NavHref = (typeof NAV_ITEMS)[number]["href"]

function isActive(itemHref: NavHref, pathname: string) {
  if (itemHref === "/") return pathname === "/"
  return pathname === itemHref || pathname.startsWith(itemHref + "/")
}

interface PillNavProps {
  variant: "transparent" | "solid"
}

export default function PillNav({ variant }: PillNavProps) {
  const pathname = usePathname()
  const [hoverPos, setHoverPos] = useState({ left: 0, width: 0, opacity: 0 })
  const [activePos, setActivePos] = useState({ left: 0, width: 0 })
  const [hovering, setHovering] = useState(false)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const tabRefs = useRef<(HTMLLIElement | null)[]>([])
  const isTransparent = variant === "transparent"

  useEffect(() => {
    const idx = NAV_ITEMS.findIndex((item) => isActive(item.href, pathname))
    if (idx >= 0 && tabRefs.current[idx]) {
      const el = tabRefs.current[idx]!
      setActivePos({ left: el.offsetLeft, width: el.getBoundingClientRect().width })
    }
  }, [pathname])

  return (
    <ul
      className={`relative flex w-fit rounded-full border-2 p-1 transition-colors duration-300 ${
        isTransparent
          ? "border-white/60 bg-transparent"
          : "border-forest/20 bg-white/90 backdrop-blur-sm"
      }`}
      onMouseLeave={() => {
        setHoverPos((p) => ({ ...p, opacity: 0 }))
        setHovering(false)
        setHoverIndex(null)
      }}
    >
      {NAV_ITEMS.map((item, index) => (
        <li
          key={item.href}
          ref={(el) => { tabRefs.current[index] = el }}
          onMouseEnter={() => {
            const el = tabRefs.current[index]
            if (!el) return
            setHoverPos({ left: el.offsetLeft, width: el.getBoundingClientRect().width, opacity: 1 })
            setHovering(true)
            setHoverIndex(index)
          }}
          className="relative z-10 block cursor-pointer"
        >
          <Link
            href={item.href}
            aria-current={isActive(item.href, pathname) ? "page" : undefined}
            className={`block px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide md:px-5 md:py-3 md:text-xs transition-colors duration-200 select-none ${
              isTransparent
                ? "text-white"
                : hoverIndex === index
                ? "text-white"
                : "text-forest"
            }`}
          >
            {item.label}
          </Link>
        </li>
      ))}

      {/* Hover pill */}
      <motion.li
        aria-hidden="true"
        animate={hoverPos}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="pointer-events-none absolute z-0 h-7 rounded-full bg-orange md:h-12"
        style={{ top: "50%", transform: "translateY(-50%)" }}
      />

      {/* Active page indicator */}
      <motion.li
        aria-hidden="true"
        animate={{ left: activePos.left, width: activePos.width, opacity: hovering ? 0 : 0.18 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`pointer-events-none absolute z-0 h-7 rounded-full md:h-12 ${
          isTransparent ? "bg-white" : "bg-forest"
        }`}
        style={{ top: "50%", transform: "translateY(-50%)" }}
      />
    </ul>
  )
}
