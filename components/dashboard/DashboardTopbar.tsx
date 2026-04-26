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

const TITLES: Record<string, { eyebrow: string; title: string; sub?: string }> = {
  '/espace-client': {
    eyebrow: 'Cuisine du jour',
    title: 'Bonjour',
    sub: 'Voici ce qui mijote pour toi cette semaine.',
  },
  '/espace-client/commandes': {
    eyebrow: 'Suivi',
    title: 'Mes commandes',
    sub: 'Toutes tes sessions, passées et à venir.',
  },
  '/espace-client/menus': {
    eyebrow: 'Cette semaine',
    title: 'Les menus du moment',
    sub: 'Inspiration & sélection pour ta prochaine session.',
  },
  '/espace-client/personnalisation': {
    eyebrow: 'Sur-mesure',
    title: 'Personnalisation',
    sub: 'Des envies particulières ? Soumets ton brief, on te chiffre.',
  },
  '/espace-client/messages': {
    eyebrow: 'Communication',
    title: 'Messages',
    sub: 'Ton fil direct avec Ivy & l’équipe Lab’s Food.',
  },
  '/espace-client/profil': {
    eyebrow: 'Identité culinaire',
    title: 'Mon profil',
    sub: 'Préférences, allergies, foyer — pour qu’Ivy cuisine pour toi.',
  },
  '/espace-client/parametres': {
    eyebrow: 'Réglages',
    title: 'Paramètres',
    sub: 'Notifications, sécurité, données personnelles.',
  },
  '/espace-client/statistiques': {
    eyebrow: 'Bilan',
    title: 'Statistiques',
    sub: 'Tes plats, ton temps gagné, tes badges.',
  },
}

export default function DashboardTopbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const isDetail = /^\/espace-client\/[^/]+\/[^/]+/.test(pathname)
  const baseSegment = '/' + pathname.split('/').slice(1, 3).join('/')
  const meta = TITLES[isDetail ? baseSegment : pathname] || TITLES['/espace-client']

  const greetingName = user?.name?.split(' ')[0] || 'gourmand·e'

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

        {/* Title block */}
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1 hidden sm:inline-flex">{meta.eyebrow}</p>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-navy leading-none truncate">
            {meta.title}
            {pathname === '/espace-client' && (
              <span className="text-terra italic font-medium"> {greetingName} 👋</span>
            )}
          </h1>
          {meta.sub && (
            <p className="text-xs text-ink-soft mt-1.5 hidden md:block">{meta.sub}</p>
          )}
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
            <span className="w-8 h-8 rounded-full bg-navy text-amber font-bold text-xs flex items-center justify-center">
              {user?.name?.[0]?.toUpperCase() || 'G'}
            </span>
            <span className="hidden md:inline text-xs font-semibold text-navy max-w-[120px] truncate">
              {user?.name?.split(' ')[0] || 'Invité'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-ink-soft" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-56 bg-paper rounded-2xl shadow-[0_20px_60px_-20px_rgba(31,42,55,0.25)] border border-[rgba(31,42,55,0.08)] p-2 z-40"
              onMouseLeave={() => setMenuOpen(false)}
            >
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
