'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChefHat, ShieldAlert, RotateCw, LogOut, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useMe } from '@/lib/api/me'
import { ApiError } from '@/lib/api/client'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import { EspaceMain } from '@/components/espace/EspaceShell'
import DashboardTopbar from '@/components/dashboard/DashboardTopbar'
import ClientSignals from '@/components/dashboard/ClientSignals'
import DashboardMobileNav from '@/components/dashboard/DashboardMobileNav'
import LabsLoader from '@/components/shared/LabsLoader'
import { useTooLong } from '@/lib/use-too-long'
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
  /*
   * Une attente peut ne jamais finir : onglet réveillé après des heures,
   * token que Clerk n'arrive pas à rafraîchir, requête figée. Le loader
   * promettait alors quelque chose qui n'arrivait pas, sans aucune sortie.
   */
  const attente = !isReady || !isAuthenticated || me.isPending
  const tropLong = useTooLong(attente, 12_000)

  if (attente && !tropLong) {
    return <LabsLoader fullscreen label="On allume les feux…" />
  }

  if (attente && tropLong) {
    return (
      <GateScreen
        Icon={RotateCw}
        title="Ça prend trop de temps"
        text="Votre session a peut-être expiré pendant que l'onglet dormait. Reconnectez-vous : c'est le plus sûr."
        primary={{ label: 'Se reconnecter', onClick: signOut }}
      />
    )
  }

  // Erreur API (401 token rejeté, 503, réseau…) : état terminal, pas de
  // redirection. Sortie = se déconnecter.
  if (me.isError) {
    const code = me.error instanceof ApiError ? me.error.status : null
    const expiree = code === 401
    const injoignable = code === 0
    return (
      <GateScreen
        Icon={expiree ? ShieldAlert : RotateCw}
        title={
          expiree
            ? 'Votre session a expiré'
            : injoignable
              ? 'Le service ne répond pas'
              : 'Impossible de vérifier votre accès'
        }
        text={
          expiree
            ? "L'API a refusé votre jeton de session. Reconnectez-vous, cela suffit presque toujours."
            : injoignable
              ? "La requête n'a pas abouti dans le temps imparti. Vérifiez votre connexion, puis réessayez."
              : me.error instanceof ApiError
                ? me.error.message
                : 'Le service est momentanément indisponible.'
        }
        primary={
          expiree
            ? { label: 'Se reconnecter', onClick: signOut }
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
    <ClientSignals>
      {/* `app-shell` : l'échelle des espaces connectés (voir globals.css). */}
      <div className="app-shell flex min-h-[calc(100vh-var(--lf-dev-banner))] bg-shell">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar />
          <EspaceMain>{children}</EspaceMain>
        </div>
        <DashboardMobileNav />
      </div>
    </ClientSignals>
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
    <div className="app-shell min-h-[calc(100vh-var(--lf-dev-banner))] bg-shell flex items-center justify-center px-6">
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
