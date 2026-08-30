'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarRange,
  MessageCircle,
  UserCircle2,
  LogOut,
  ChefHat,
  ShoppingBasket,
  ArrowRight,
} from 'lucide-react'
import Logo from '@/components/shared/Logo'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import ReserveButton from '@/components/shared/ReserveButton'

/**
 * Navigation client — 6 entrées principales, conformément à l'architecture
 * cible (§ 4.2 du brief). Les sous-entrées ne s'affichent que lorsque leur
 * section est active, pour garder la barre lisible.
 */
const NAV: {
  href: string
  label: string
  Icon: typeof LayoutDashboard
  badge?: string
  children?: { href: string; label: string }[]
}[] = [
  { href: '/espace-client', label: 'Accueil', Icon: LayoutDashboard },
  {
    href: '/espace-client/chefs',
    label: 'Réserver',
    Icon: ChefHat,
    children: [
      { href: '/espace-client/chefs', label: 'Trouver un batch cooker' },
      { href: '/espace-client/menus', label: 'Menus & plats' },
      { href: '/espace-client/reservation', label: 'Composer ma session' },
      { href: '/espace-client/personnalisation', label: 'Demande sur-mesure' },
    ],
  },
  {
    href: '/espace-client/commandes',
    label: 'Mes sessions',
    Icon: CalendarRange,
    badge: '2',
    children: [
      { href: '/espace-client/commandes', label: 'À venir & réalisées' },
      { href: '/espace-client/conservation', label: 'Réchauffage & conservation' },
    ],
  },
  { href: '/espace-client/courses', label: 'Ma liste de courses', Icon: ShoppingBasket },
  { href: '/espace-client/messages', label: 'Messagerie', Icon: MessageCircle, badge: '1' },
  {
    href: '/espace-client/compte',
    label: 'Mon compte',
    Icon: UserCircle2,
    children: [
      { href: '/espace-client/compte', label: 'Adresses & paiement' },
      { href: '/espace-client/profil', label: 'Profil & goûts' },
      { href: '/espace-client/statistiques', label: 'Mes statistiques' },
      { href: '/espace-client/parametres', label: 'Paramètres' },
    ],
  },
]

/** Une section est active si l'URL correspond à elle ou à l'une de ses filles. */
function sectionActive(pathname: string, item: (typeof NAV)[number]) {
  if (item.href === '/espace-client') return pathname === item.href
  if (pathname.startsWith(item.href)) return true
  return (item.children ?? []).some((c) => pathname.startsWith(c.href))
}

export default function DashboardSidebar() {
  const pathname = usePathname()
  const { user, roleLabel, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    signOut()
    router.push('/')
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'GO'

  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 sticky top-6 self-start h-[calc(100vh-3rem)] ml-6 my-6">
      <div className="flex flex-col h-full bg-navy text-white rounded-3xl overflow-hidden shadow-[0_30px_70px_-30px_rgba(31,42,55,0.55)] relative">
        {/* glow */}
        {/* <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-amber/20 blur-3xl pointer-events-none" /> */}
        {/* <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-mint/10 blur-3xl pointer-events-none" /> */}

        <div className="relative flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 pt-6 pb-4">
            <Logo variant="white" size="sm" />
          </div>

          {/* Profile card */}
          <div className="mx-4 mb-4 rounded-2xl bg-white/[0.06] border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-amber text-navy font-bold text-sm flex items-center justify-center">
                  {initials}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-mint-deep border-2 border-navy" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.name || 'Invité'}</p>
                {roleLabel && (
                  <span className="mt-0.5 inline-flex items-center rounded-full bg-amber/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber">
                    {roleLabel}
                  </span>
                )}
                <p className="text-[11px] text-white/55 truncate mt-0.5">
                  {user?.email || (user?.username && `@${user.username}`) || 'Espace client'}
                </p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="px-3 flex-1 overflow-y-auto custom-scroll">
            <ul className="space-y-1">
              {NAV.map((item) => {
                const { href, label, Icon, badge, children } = item
                const active = sectionActive(pathname, item)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                        active
                          ? 'bg-amber text-navy font-semibold shadow-[0_10px_24px_-12px_rgba(243,156,18,0.6)]'
                          : 'text-white/75 hover:text-white hover:bg-white/5',
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.4 : 2} />
                      <span className="flex-1">{label}</span>
                      {badge && (
                        <span
                          className={cn(
                            'min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-mono font-semibold',
                            active ? 'bg-navy text-amber' : 'bg-amber text-navy',
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>

                    {/* Sous-entrées : visibles uniquement sur la section active */}
                    {active && children && (
                      <ul className="mt-1 mb-1 ml-4 pl-3 border-l border-white/10 space-y-0.5">
                        {children.map((c) => {
                          const on = pathname === c.href
                          return (
                            <li key={c.href}>
                              <Link
                                href={c.href}
                                className={cn(
                                  'block px-3 py-1.5 rounded-lg text-[13px] transition-colors',
                                  on
                                    ? 'text-amber font-semibold'
                                    : 'text-white/55 hover:text-white hover:bg-white/5',
                                )}
                              >
                                {c.label}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* CTA + logout */}
          <div className="p-4 space-y-2">
            <ReserveButton
              asChild
              className="group flex items-center justify-between w-full bg-gradient-to-br from-amber to-amber-deep text-navy rounded-2xl px-4 py-3 font-semibold text-sm hover:shadow-[0_18px_36px_-12px_rgba(243,156,18,0.6)] transition-shadow"
            >
              <span className="flex items-center gap-2">
                <ChefHat className="w-4 h-4" />
                Nouvelle session
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </ReserveButton>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/55 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
      `}</style>
    </aside>
  )
}
