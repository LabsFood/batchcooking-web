'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Inbox,
  FileText,
  CalendarRange,
  CalendarDays,
  UtensilsCrossed,
  Tag,
  Store,
  Wallet,
  Repeat,
  ShieldCheck,
  Settings,
  UserCircle2,
  MessageCircle,
  Star,
  LifeBuoy,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'
import Logo from '@/components/shared/Logo'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { PaletteIconTrigger, PaletteTrigger } from '@/components/shared/CommandPalette'
import { AlertBell } from '@/components/shared/AlertDrawer'
import { useChefAlerts } from './ChefSignals'
import { useChefDocuments } from '@/lib/api/chef-documents'
import { useMe } from '@/lib/api/me'
import { Avatar, AvatarEditor } from '@/components/shared/Avatar'
import { useOffers } from '@/lib/api/chef-catalog'
import { useUnreadCount } from '@/lib/api/messaging'

/**
 * Navigation en 5 groupes (cf. architecture cible § 4.1 du brief).
 *
 * Aucune pastille n'est écrite ici : un compteur en dur dit « 2 » quand il n'y
 * a rien, et le chef apprend à ne plus le croire. Celles qui s'affichent sont
 * comptées à partir de l'API, dans `useNavCounts()`.
 */
export const CHEF_NAV = [
  {
    group: 'Pilotage',
    items: [
      { href: '/espace-chef', label: 'Accueil', Icon: LayoutDashboard },
      { href: '/espace-chef/demandes', label: 'Demandes', Icon: Inbox },
      { href: '/espace-chef/offres', label: 'Offres sur-mesure', Icon: FileText },
      { href: '/espace-chef/prestations', label: 'Prestations', Icon: CalendarRange },
      { href: '/espace-chef/agenda', label: 'Agenda', Icon: CalendarDays },
    ],
  },
  {
    group: 'Mon offre',
    items: [
      { href: '/espace-chef/recettes', label: 'Menus & recettes', Icon: UtensilsCrossed },
      { href: '/espace-chef/tarifs', label: 'Mes tarifs', Icon: Tag },
      { href: '/espace-chef/vitrine', label: 'Ma vitrine', Icon: Store },
    ],
  },
  {
    group: 'Mon argent',
    items: [
      { href: '/espace-chef/revenus', label: 'Revenus & paiements', Icon: Wallet },
      { href: '/espace-chef/remuneration', label: 'Mode de rémunération', Icon: Repeat },
    ],
  },
  {
    group: 'Mon dossier',
    items: [
      { href: '/espace-chef/dossier', label: 'Mon dossier', Icon: ShieldCheck },
      { href: '/espace-chef/parametres', label: 'Paramètres', Icon: Settings },
    ],
  },
  {
    group: 'Relation',
    items: [
      { href: '/espace-chef/messagerie', label: 'Messagerie', Icon: MessageCircle },
      { href: '/espace-chef/avis', label: 'Avis', Icon: Star },
      { href: '/espace-chef/litiges', label: 'Litiges & support', Icon: LifeBuoy },
    ],
  },
] as const

function isActive(pathname: string, href: string) {
  return href === '/espace-chef' ? pathname === href : pathname.startsWith(href)
}

/**
 * Ce qui attend vraiment, par entrée de menu. Seules deux entrées ont de quoi
 * compter aujourd'hui : les propositions de Lab's Food, et les pièces du
 * dossier qui demandent une action. Les autres n'auront leur pastille que le
 * jour où elles auront leur endpoint.
 */
function useNavCounts(): Record<string, number> {
  const offers = useOffers()
  const docs = useChefDocuments()

  const nOffres =
    (offers.data?.dishes.length ?? 0) + (offers.data?.menus.length ?? 0)

  const nPieces = (docs.data?.documents ?? []).filter(
    (d) =>
      d.status === 'rejected' ||
      d.status === 'expired' ||
      d.status === 'expiring' ||
      (d.status === 'missing' && d.required),
  ).length

  return {
    '/espace-chef/offres': nOffres,
    '/espace-chef/dossier': nPieces,
  }
}

/* ── Sidebar desktop ──────────────────────────────────────────────────────── */

const MESSAGING_HREF = '/espace-chef/messagerie'

export function ChefSidebar() {
  const pathname = usePathname()
  const { user, roleLabel, signOut } = useAuth()
  const router = useRouter()
  const counts = useNavCounts()
  const unread = useUnreadCount().data ?? 0

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'BC'

  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 sticky top-6 self-start h-[calc(100vh-3rem)] ml-6 my-6">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-navy text-white">
        <div className="px-6 pb-5 pt-6">
          <Logo variant="white" size="sm" />
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-amber">
            Espace chef
          </p>
        </div>

        <nav className="px-3 flex-1 overflow-y-auto">
          {CHEF_NAV.map(({ group, items }) => (
            <div key={group} className="mb-4">
              <p className="px-3 mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                {group}
              </p>
              <ul className="space-y-0.5">
                {items.map(({ href, label, Icon }) => {
                  // La messagerie compte ses non-lus à part, les autres entrées
                  // viennent de `useNavCounts`.
                  const n = href === MESSAGING_HREF ? unread : (counts[href] ?? 0)
                  const badge = n > 0 ? String(n) : null
                  const active = isActive(pathname, href)
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
                          active
                            ? 'bg-amber text-navy font-semibold'
                            : 'text-white/75 hover:text-white hover:bg-white/5',
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.4 : 2} />
                        <span className="flex-1">{label}</span>
                        {badge && (
                          <span
                            className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                              active ? 'bg-navy text-amber' : 'bg-amber text-navy',
                            )}
                          >
                            {badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => {
              signOut()
              router.push('/')
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  )
}

/* ── Barre basse mobile (mobile-first § 8) ────────────────────────────────── */

const MOBILE_ITEMS = [
  { href: '/espace-chef', label: 'Accueil', Icon: LayoutDashboard },
  { href: '/espace-chef/demandes', label: 'Demandes', Icon: Inbox },
  { href: '/espace-chef/offres', label: 'Offres', Icon: FileText },
  { href: '/espace-chef/dossier', label: 'Dossier', Icon: ShieldCheck },
  { href: '/espace-chef/messagerie', label: 'Messages', Icon: MessageCircle },
]

export function ChefMobileNav() {
  const pathname = usePathname()
  const unread = useUnreadCount().data ?? 0
  return (
    <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-30 bg-navy text-white rounded-2xl shadow-[0_20px_50px_-20px_rgba(31,42,55,0.5)] px-2 py-2">
      <ul className="grid grid-cols-5">
        {MOBILE_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href)
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-medium transition-colors',
                  active ? 'text-amber' : 'text-white/55 hover:text-white',
                )}
              >
                <span className="relative">
                  <Icon className="w-4 h-4" />
                  {href === MESSAGING_HREF && unread > 0 && (
                    <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-amber" />
                  )}
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/* ── Topbar (avec tiroir mobile pour les entrées secondaires) ─────────────── */

export function ChefTopbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, roleLabel, signOut } = useAuth()
  const { alerts, loading } = useChefAlerts()
  const me = useMe()

  const initial = user?.name?.[0]?.toUpperCase() ?? 'C'
  const firstName = user?.name?.split(' ')[0] ?? 'Chef'

  return (
    <>
      <header className="sticky top-0 z-20 bg-cream/85 backdrop-blur-md border-b border-[rgba(31,42,55,0.06)]">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full bg-paper border border-[rgba(31,42,55,0.08)] text-navy shrink-0"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-1 hidden sm:inline-flex">Espace chef</p>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-navy leading-none truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-ink-soft mt-1.5 hidden md:block">{subtitle}</p>
            )}
          </div>

          {/* Recherche : un plat, un menu, une pièce, une page. ⌘K ou « / ». */}
          <PaletteTrigger
            label="Un plat, un menu, une pièce…"
            className="hidden w-64 shrink-0 xl:flex"
          />
          <PaletteIconTrigger className="xl:hidden" />

          {/* Ce qui demande une action, recalculé à chaque ouverture. */}
          <AlertBell alerts={alerts} loading={loading}>
            Ces points sont déduits de votre dossier, de vos plats et de vos
            propositions. Le journal des notifications — qui a fait quoi, et
            quand — attend son endpoint côté API.
          </AlertBell>

          {/* Menu utilisateur */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-paper border border-[rgba(31,42,55,0.08)] hover:border-amber transition-colors"
            >
              <Avatar
                url={me.data?.avatarUrl}
                name={me.data?.fullName ?? user?.name ?? firstName}
                className="w-8 h-8 text-xs"
              />
              <span className="hidden md:flex flex-col leading-none items-start">
                <span className="text-xs font-semibold text-navy max-w-[110px] truncate">
                  {firstName}
                </span>
                {roleLabel && (
                  <span className="text-[9px] uppercase tracking-[0.12em] text-terra font-semibold mt-0.5">
                    {roleLabel}
                  </span>
                )}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-ink-soft" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-72 bg-paper rounded-2xl shadow-[0_20px_60px_-20px_rgba(31,42,55,0.25)] border border-[rgba(31,42,55,0.08)] p-2 z-40"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {/* La photo se change là où l'on va déjà, pas dans un réglage
                    qu'il faudrait chercher. */}
                <AvatarEditor publicHint />
                <hr className="my-1 border-[rgba(31,42,55,0.08)]" />
                <Link
                  href="/espace-chef/profil"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-navy hover:bg-cream-soft rounded-lg"
                >
                  <UserCircle2 className="w-4 h-4 text-amber" /> Mon profil
                </Link>
                <Link
                  href="/espace-chef/dossier"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-navy hover:bg-cream-soft rounded-lg"
                >
                  <ShieldCheck className="w-4 h-4 text-amber" /> Mon dossier
                </Link>
                <Link
                  href="/espace-chef/parametres"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-navy hover:bg-cream-soft rounded-lg"
                >
                  <Settings className="w-4 h-4 text-amber" /> Paramètres
                </Link>
                <hr className="my-1 border-[rgba(31,42,55,0.08)]" />
                <button
                  onClick={() => {
                    signOut()
                    router.push('/')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-navy hover:bg-cream-soft rounded-lg"
                >
                  <LogOut className="w-4 h-4 text-amber" /> Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-navy/70 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-navy text-white p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <Logo variant="white" size="sm" />
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="text-white/70">
                <X className="w-5 h-5" />
              </button>
            </div>
            {CHEF_NAV.map(({ group, items }) => (
              <div key={group} className="mb-5">
                <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {items.map(({ href, label, Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
                          isActive(pathname, href)
                            ? 'bg-amber text-navy font-semibold'
                            : 'text-white/75 hover:bg-white/5',
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
