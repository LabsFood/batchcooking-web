'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, LogOut, UserCircle2, Menu } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { PaletteIconTrigger, PaletteTrigger } from '@/components/shared/CommandPalette'
import { AlertBell } from '@/components/shared/AlertDrawer'
import { useClientAlerts } from './ClientSignals'
import { useMe } from '@/lib/api/me'
import { Avatar, AvatarEditor } from '@/components/shared/Avatar'

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
    title: 'Réserver une session',
    sub: 'Le batch cooker, ses plats, la date.',
  },
  '/espace-client/courses': {
    title: 'Ma liste de courses',
    sub: 'Rangée par rayon.',
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
  const { alerts, loading } = useClientAlerts()
  const me = useMe()

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
    <header className="sticky top-[var(--lf-dev-banner)] z-30 bg-shell/85 backdrop-blur-md border-b border-[rgba(31,42,55,0.06)]">
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

        {/* Recherche : les pages de l'espace. ⌘K, ou « / ». */}
        <PaletteTrigger label="Aller à une page…" className="hidden w-64 lg:flex" />
        <PaletteIconTrigger className="lg:hidden" />

        {/* Ce qui demande une action, recalculé à chaque ouverture. */}
        <AlertBell alerts={alerts} loading={loading}>
          Ces points sont déduits de vos sessions, de vos devis et de votre
          profil de goûts. Le journal des notifications attend son endpoint
          côté API.
        </AlertBell>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-paper border border-[rgba(31,42,55,0.08)] hover:border-amber transition-colors"
          >
            <Avatar
              url={me.data?.avatarUrl}
              name={me.data?.fullName ?? user?.name}
              className="h-8 w-8 text-xs"
            />
            <span className="hidden max-w-[140px] truncate text-xs font-semibold text-navy md:inline">
              {user?.name || 'Invité'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-ink-soft" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 z-40 mt-2 w-72 rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper p-2 shadow-[0_20px_60px_-20px_rgba(31,42,55,0.25)]"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {/* Qui est connecté, et sa photo : la question que posait
                  l'encart de la barre latérale, posée là où on va déjà. */}
              <div className="border-b border-[rgba(31,42,55,0.08)] pb-2">
                <AvatarEditor />
                {roleLabel && (
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.1em] text-amber-ink">
                    {roleLabel}
                  </p>
                )}
              </div>
              <Link href="/espace-client/profil" className="flex items-center gap-2 px-3 py-2 text-sm text-navy hover:bg-cream-soft rounded-lg">
                <UserCircle2 className="w-4 h-4 text-amber-ink" /> Mon profil
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
                <LogOut className="w-4 h-4 text-amber-ink" /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
