'use client'

import { useState } from 'react'
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
  ChevronDown,
} from 'lucide-react'
import Logo from '@/components/shared/Logo'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useUnreadCount } from '@/lib/api/messaging'
import ReserveButton from '@/components/shared/ReserveButton'

/**
 * Navigation client — 6 entrées principales, conformément à l'architecture
 * cible (§ 4.2 du brief).
 *
 * Les sections à sous-entrées portent un chevron : on voit qu'il y a quelque
 * chose dessous sans avoir à cliquer. La section active s'ouvre d'elle-même,
 * les autres se déplient à la demande, sans quitter la page courante.
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
    href: '/espace-client/menus',
    label: 'Réserver',
    Icon: ChefHat,
    children: [
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
  { href: '/espace-client/messages', label: 'Messagerie', Icon: MessageCircle },
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
  const unread = useUnreadCount().data ?? 0
  const { signOut } = useAuth()
  const router = useRouter()
  // Dépliage manuel : ce que l'utilisateur ouvre prime sur la section active.
  const [opened, setOpened] = useState<Record<string, boolean>>({})

  const handleLogout = () => {
    signOut()
    router.push('/')
  }

  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 sticky top-6 self-start h-[calc(100vh-3rem)] ml-6 my-6">
      <div className="flex flex-col h-full bg-navy text-white rounded-3xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 pb-5 pt-6">
            <Logo variant="white" size="sm" />
          </div>

          {/* Nav */}
          <nav className="px-3 flex-1 overflow-y-auto custom-scroll">
            <ul className="space-y-1">
              {NAV.map((item) => {
                const { href, label, Icon, children } = item
                // La pastille de la messagerie vient de l'API, les autres de la config.
                const badge =
                  href === '/espace-client/messages'
                    ? unread > 0
                      ? String(unread)
                      : undefined
                    : item.badge
                const active = sectionActive(pathname, item)
                const expanded = children ? (opened[href] ?? active) : false
                const panelId = `nav-${href.replace(/\W+/g, '-')}`
                return (
                  <li key={href}>
                    <div
                      className={cn(
                        'group relative flex items-center rounded-xl text-sm transition-colors',
                        active
                          ? 'bg-amber font-semibold text-navy'
                          : 'text-white/75 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3">
                        <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.4 : 2} />
                        <span className="flex-1 truncate">{label}</span>
                      </Link>

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

                      {children ? (
                        <button
                          type="button"
                          onClick={() => setOpened((prev) => ({ ...prev, [href]: !expanded }))}
                          aria-expanded={expanded}
                          aria-controls={panelId}
                          aria-label={`${expanded ? 'Masquer' : 'Afficher'} les pages de ${label}`}
                          className={cn(
                            'mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                            active ? 'hover:bg-navy/10' : 'hover:bg-white/10',
                          )}
                        >
                          <ChevronDown
                            className={cn(
                              'h-3.5 w-3.5 transition-transform duration-200',
                              expanded && 'rotate-180',
                            )}
                            aria-hidden
                          />
                        </button>
                      ) : (
                        <span className="w-3" />
                      )}
                    </div>

                    {/* Sous-entrées : dépliées sur la section active, ou à la demande */}
                    {expanded && children && (
                      <ul id={panelId} className="mt-1 mb-1 ml-4 pl-3 border-l border-white/10 space-y-0.5">
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
              className="group flex w-full items-center justify-between rounded-2xl bg-amber px-4 py-3 text-sm font-semibold text-navy transition-colors hover:bg-amber-deep"
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
