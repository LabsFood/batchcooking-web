'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useMe } from '@/lib/api/me'
import { ChefSidebar, ChefMobileNav } from '@/components/chef/ChefNav'
import LabsLoader from '@/components/shared/LabsLoader'

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
  const { isAuthenticated, isReady } = useAuth()
  const router = useRouter()
  const me = useMe()

  const role = me.data?.role
  // Rôle résolu et différent de `chef` : ce compte n'a rien à faire ici.
  const isIntruder = me.isSuccess && role !== 'chef'

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
    }
  }, [isReady, isAuthenticated, isIntruder, router])

  // Clerk pas prêt, non connecté, ou redirection en cours → loader. On ne rend
  // surtout pas le dashboard chef entre-temps.
  if (!isReady || !isAuthenticated || isIntruder) {
    return <LabsLoader fullscreen label="On allume les fourneaux…" />
  }

  return (
    <div className="min-h-screen bg-cream flex">
      <ChefSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        {children}
      </div>
      <ChefMobileNav />
    </div>
  )
}
