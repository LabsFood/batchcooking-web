'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChefHat, ShieldAlert, RotateCw, LogOut, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useMe } from '@/lib/api/me'
import { ApiError } from '@/lib/api/client'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import DashboardTopbar from '@/components/dashboard/DashboardTopbar'
import DashboardMobileNav from '@/components/dashboard/DashboardMobileNav'
import LabsLoader from '@/components/shared/LabsLoader'
import MessagingRealtime from '@/components/messaging/MessagingRealtime'

export default function EspaceClientLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady, signOut } = useAuth()
  const router = useRouter()
  const me = useMe()

  const role = me.data?.role

  useEffect(() => {
    // On ne renvoie vers le login QUE si Clerk n'a pas de session. Un 401 de
    // l'API alors que Clerk est connecté ne doit PAS rediriger : le login
    // renverrait aussitôt ici (session active) → boucle infinie.
    if (isReady && !isAuthenticated) {
      router.replace('/auth/login?next=/espace-client')
      return
    }
    // Un batch cooker a son propre espace : on l'y envoie au lieu de lui
    // opposer un cul-de-sac.
    if (role === 'chef') {
      router.replace('/espace-chef')
    }
  }, [isReady, isAuthenticated, role, router])

  // Clerk pas prêt, non connecté, ou /me en cours → loader.
  if (!isReady || !isAuthenticated || me.isPending) {
    return <LabsLoader fullscreen label="On allume les feux…" />
  }

  // Erreur API (401 token rejeté, 503, réseau…) : état terminal, pas de
  // redirection. Sortie = se déconnecter.
  if (me.isError) {
    const is401 = me.error instanceof ApiError && me.error.status === 401
    return (
      <GateScreen
        Icon={is401 ? ShieldAlert : RotateCw}
        title={is401 ? 'Session non reconnue' : 'Impossible de vérifier ton accès'}
        text={
          is401
            ? "Tu es connecté·e, mais l'API a refusé le token (401). Déconnecte-toi puis reconnecte-toi ; si ça persiste, c'est la validation du token côté backend à corriger."
            : me.error instanceof ApiError
              ? me.error.message
              : 'Le service est momentanément indisponible.'
        }
        primary={
          is401
            ? { label: 'Se déconnecter', onClick: signOut }
            : { label: 'Réessayer', onClick: () => me.refetch() }
        }
      />
    )
  }

  // Rôle chef : redirection en cours vers /espace-chef (cf. effet ci-dessus).
  if (role === 'chef') {
    return <LabsLoader fullscreen label="Direction votre espace chef…" />
  }

  // Rôle admin : compte réservé à la console d'administration.
  if (role === 'admin') {
    return (
      <GateScreen
        Icon={ShieldAlert}
        title="Compte administrateur"
        text="Ce compte est réservé à la console d'administration Lab's Food, pas à l'espace client."
        primary={{ label: 'Se déconnecter', onClick: signOut }}
      />
    )
  }

  // role === 'client' (ou tout autre rôle applicatif client) → dashboard.
  return (
    <div className="min-h-screen bg-cream flex">
      <MessagingRealtime />
      <DashboardSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <DashboardTopbar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-12">
          {children}
        </main>
      </div>
      <DashboardMobileNav />
    </div>
  )
}

function GateScreen({
  Icon,
  title,
  text,
  primary,
}: {
  Icon: typeof ChefHat
  title: string
  text: string
  primary: { label: string; onClick: () => void }
}) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-navy text-amber">
          <Icon className="h-7 w-7" />
        </span>
        <h1 className="font-display text-2xl font-bold text-navy mb-2">{title}</h1>
        <p className="text-ink-mid text-sm leading-relaxed mb-8">{text}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={primary.onClick} className="btn btn-primary">
            {primary.label === 'Réessayer' ? (
              <RotateCw className="w-4 h-4" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            {primary.label}
          </button>
          <Link href="/" className="btn btn-outline">
            <ArrowLeft className="w-4 h-4" />
            Retour au site
          </Link>
        </div>
      </div>
    </div>
  )
}
