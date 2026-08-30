'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarRange,
  ChefHat,
  ShoppingBasket,
  UserCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* Les 5 entrées les plus utilisées, alignées sur la navigation principale. */
const ITEMS = [
  { href: '/espace-client',           label: 'Accueil',  Icon: LayoutDashboard },
  { href: '/espace-client/chefs',     label: 'Réserver', Icon: ChefHat },
  { href: '/espace-client/commandes', label: 'Sessions', Icon: CalendarRange },
  { href: '/espace-client/courses',   label: 'Courses',  Icon: ShoppingBasket },
  { href: '/espace-client/compte',    label: 'Compte',   Icon: UserCircle2 },
]

export default function DashboardMobileNav() {
  const pathname = usePathname()
  return (
    <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-30 bg-navy text-white rounded-2xl shadow-[0_20px_50px_-20px_rgba(31,42,55,0.5)] px-2 py-2">
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, label, Icon }) => {
          const active =
            href === '/espace-client'
              ? pathname === href
              : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-medium transition-colors',
                  active ? 'text-amber' : 'text-white/55 hover:text-white',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
