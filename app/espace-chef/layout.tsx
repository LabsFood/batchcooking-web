'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { RotateCw } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useMe } from '@/lib/api/me'
import { openToCandidate, useChefApproved } from '@/lib/chef/approval'
import { ChefSidebar, ChefMobileNav } from '@/components/chef/ChefNav'
import ChefSignals from '@/components/chef/ChefSignals'
import LabsLoader from '@/components/shared/LabsLoader'
import { useTooLong } from '@/lib/use-too-long'
import MessagingRealtime from '@/components/messaging/MessagingRealtime'

/**
 * Garde de rôle, symétrique de celle de /espace-client (qui renvoie déjà les
 * chefs ici).
 *
 * Le contrôle se déclenche sur `me.isSuccess`, pas sur l'absence de rôle : tant
 * que `/me` échoue (401 tant que le backend n'a pas ajouté les origines dans
 * `authorizedParties`), le rôle est inconnu et tout compte authentifié entre —
 * c'est ce que couvrait l'ancien `DEMO_MODE`, qui laissait en revanche entrer
 * un client dont le rôle était parfaitement connu.
 */
export default function EspaceChefLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady, signOut } = useAuth()
  const router = useRouter()
  const me = useMe()

  const role = me.data?.role
  // Rôle résolu et différent de `chef` : ce compte n'a rien à faire ici.
  const isIntruder = me.isSuccess && role !== 'chef'

  // Non vérifié : le dossier, les paramètres et le support seulement. Une page
  // fermée attend le profil, puis renvoie au dossier — l'accueil compris. Si le
  // profil échoue, l'écran s'ouvre : l'API refuse de toute façon l'écriture.
  const pathname = usePathname()
  const approval = useChefApproved()
  const pageLibre = openToCandidate(pathname)
  const horsDossier = approval.candidate && !pageLibre

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace('/auth/login?next=/espace-chef')
      return
    }
    // Un client pouvait rester coincé ici : `?next=/espace-chef` laissé dans
    // l'URL de login après la déconnexion d'un chef, ou simple lien direct.
    // On le renvoie vers son espace plutôt que de lui opposer un cul-de-sac.
    if (isIntruder) {
      router.replace('/espace-client')
      return
    }
    if (horsDossier) {
      router.replace('/espace-chef/dossier')
    }
  }, [isReady, isAuthenticated, isIntruder, horsDossier, router])

  // Clerk pas prêt, non connecté, ou redirection en cours → loader. On ne rend
  // surtout pas le dashboard chef entre-temps.
  //
  // Mais une attente peut ne jamais finir — onglet réveillé après des heures,
  // token que Clerk n'arrive pas à rafraîchir. Passé douze secondes, on cesse
  // de promettre et on propose une sortie.
  const attente =
    !isReady ||
    !isAuthenticated ||
    isIntruder ||
    horsDossier ||
    (approval.pending && !pageLibre)
  const tropLong = useTooLong(attente, 12_000)

  if (attente && !tropLong) {
    return <LabsLoader fullscreen label="On allume les fourneaux…" />
  }

  if (attente && tropLong) {
    return (
      <div className="app-shell flex min-h-[calc(100vh-var(--lf-dev-banner))] items-center justify-center bg-shell px-6">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-deep text-ink-soft">
            <RotateCw className="h-6 w-6" aria-hidden />
          </span>
          <p className="font-display text-lg font-bold text-navy">
            Ça prend trop de temps
          </p>
          <p className="text-sm leading-relaxed text-ink-mid">
            Votre session a peut-être expiré pendant que l’onglet dormait.
            Reconnectez-vous : c’est le plus sûr.
          </p>
          <button
            onClick={() => {
              signOut()
              router.replace('/auth/login?next=/espace-chef')
            }}
            className="btn btn-primary mt-2 text-sm"
          >
            Se reconnecter
          </button>
        </div>
      </div>
    )
  }

  // La palette est montée ici : la barre du haut est rendue par chaque écran
  // (via ChefPage), elle doit trouver le fournisseur au-dessus d'elle.
  return (
    <ChefSignals>
      {/* `app-shell` : l'échelle des espaces connectés (voir globals.css). */}
      <div className="app-shell flex min-h-[calc(100vh-var(--lf-dev-banner))] bg-shell">
        <ChefSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          {children}
        </div>
        <ChefMobileNav />
      </div>
    </ChefSignals>
  )
}
