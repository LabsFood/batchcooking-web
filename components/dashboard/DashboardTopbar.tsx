'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Sparkles,
  ArrowLeft,
  Menu,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const TITLES: Record<string, { title: string; sub?: string }> = {
  '/espace-client': { title: 'Accueil' },
  '/espace-client/commandes': {
    title: 'Mes sessions',
    sub: 'Vos prestations, à venir et passées.',
  },
  '/espace-client/menus': {
    title: 'Menus et plats',
    sub: 'Les cartes de la semaine, chef par chef.',
  },
  '/espace-client/reservation': {
    title: 'Composer ma session',
    sub: 'Choisir un batch cooker, puis ses plats.',
  },
  '/espace-client/chefs': {
    title: 'Trouver un batch cooker',
    sub: 'Ceux qui interviennent chez vous.',
  },
  '/espace-client/courses': {
    title: 'Ma liste de courses',
    sub: 'Rangée par rayon, prête à emporter.',
  },
  '/espace-client/personnalisation': {
    title: 'Demande sur-mesure',
    sub: 'Décrivez ce que vous voulez, un chef vous chiffre.',
  },
  '/espace-client/messages': {
    title: 'Messagerie',
    sub: 'Vos échanges avec vos chefs et avec le support.',
  },
  '/espace-client/profil': {
    title: 'Profil et goûts',
    sub: 'Préférences, allergies, foyer.',
  },
  '/espace-client/compte': {
    title: 'Mon compte',
    sub: 'Adresses, moyens de paiement, rattachements.',
  },
  '/espace-client/conservation': {
    title: 'Réchauffage et conservation',
    sub: 'Combien de temps, à quelle température.',
  },
  '/espace-client/parametres': {
    title: 'Paramètres',
    sub: 'Notifications, sécurité, données personnelles.',
  },
  '/espace-client/statistiques': {
    title: 'Mes statistiques',
    sub: 'Vos plats, votre temps gagné.',
  },
}

export default function DashboardTopbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, roleLabel, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const isDetail = /^\/espace-client\/[^/]+\/[^/]+/.test(pathname)
  const baseSegment = '/' + pathname.split('/').slice(1, 3).join('/')
  const meta = TITLES[isDetail ? baseSegment : pathname] || TITLES['/espace-client']

  const firstName = user?.name?.split(' ')[0] || ''
  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'G'

  return (
    <header className="sticky top-0 z-30 bg-cream/85 backdrop-blur-md border-b border-[rgba(31,42,55,0.06)]">
      <div className="px-6 lg:px-8 py-4 flex items-center gap-4">
        {/* Mobile back / menu */}
        <Link
          href="/"
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full bg-paper border border-[rgba(31,42,55,0.08)] text-navy"
          aria-label="Accueil"
        >
          <Menu className="w-4 h-4" />
        </Link>

        {/* Titre de la page */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-bold leading-tight text-navy lg:text-[1.75rem]">
            {pathname === '/espace-client' && firstName ? `Bonjour ${firstName}` : meta.title}
          </h1>
          {meta.sub && <p className="mt-1 hidden text-sm text-ink-mid md:block">{meta.sub}</p>}
        </div>

        {/* Search (desktop) */}
        <div className="hidden lg:block relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            placeholder="Rechercher une commande, un plat…"
            className="w-72 pl-10 pr-4 py-2.5 rounded-full bg-paper border border-[rgba(31,42,55,0.08)] text-sm focus:border-amber outline-none transition-colors"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-10 h-10 rounded-full bg-paper border border-[rgba(31,42,55,0.08)] flex items-center justify-center text-navy hover:border-amber transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-amber" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-paper border border-[rgba(31,42,55,0.08)] hover:border-amber transition-colors"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-amber">
              {initials}
            </span>
            <span className="hidden max-w-[140px] truncate text-xs font-semibold text-navy md:inline">
              {user?.name || 'Invité'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-ink-soft" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper p-2 shadow-[0_20px_60px_-20px_rgba(31,42,55,0.25)]"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {/* Qui est connecté : la question que posait l'encart de la barre
                  latérale, posée là où on va déjà pour se déconnecter. */}
              <div className="border-b border-[rgba(31,42,55,0.08)] px-3 pb-3 pt-2">
                <p className="truncate text-sm font-semibold text-navy">
                  {user?.name || 'Invité'}
                </p>
                <p className="truncate text-xs text-ink-soft">
                  {user?.email || (user?.username ? `@${user.username}` : 'Espace client')}
                </p>
                {roleLabel && (
                  <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-deep">
                    {roleLabel}
                  </p>
                )}
              </div>
              <Link href="/espace-client/profil" className="flex items-center gap-2 px-3 py-2 text-sm text-navy hover:bg-cream-soft rounded-lg">
                <Sparkles className="w-4 h-4 text-amber" /> Mon profil
              </Link>
              <Link href="/espace-client/parametres" className="flex items-center gap-2 px-3 py-2 text-sm text-navy hover:bg-cream-soft rounded-lg">
                Paramètres
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
  )
}
