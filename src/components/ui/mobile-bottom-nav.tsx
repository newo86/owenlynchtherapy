"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, User, Layers, BookOpen, HelpCircle, Mail } from "lucide-react"

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: <Home size={20} /> },
  { label: "About", href: "/about", icon: <User size={20} /> },
  { label: "Services", href: "/services", icon: <Layers size={20} /> },
  { label: "Articles", href: "/articles", icon: <BookOpen size={20} /> },
  { label: "FAQ", href: "/faq", icon: <HelpCircle size={20} /> },
  { label: "Contact", href: "/contact", icon: <Mail size={20} /> },
] as const

function isActive(itemHref: string, pathname: string) {
  if (itemHref === "/") return pathname === "/"
  return pathname === itemHref || pathname.startsWith(itemHref + "/")
}

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] bg-cream border-t border-forest/10 px-2 pb-[env(safe-area-inset-bottom)] md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
      aria-label="Mobile navigation"
    >
      <ul className="flex justify-around items-center py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl h-can:transition-colors h-can:duration-200 ${
                  active ? "text-white bg-orange" : "text-forest/60"
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
