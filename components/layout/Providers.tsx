'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { makeQueryClient } from '@/lib/api/query-client'
import { ReservationGateProvider } from '@/lib/reservation-gate-context'
import LoginRequiredModal from '@/components/shared/LoginRequiredModal'

/**
 * Purge le cache react-query dès que l'identité Clerk change.
 *
 * Le QueryClient est créé une fois pour la durée de vie de l'onglet : ni la
 * déconnexion ni la connexion suivante ne le remontent (ce sont des
 * navigations client). Sans ce garde-fou, les données du compte précédent
 * restaient en mémoire — d'où le dashboard chef encore affiché après une
 * reconnexion en client, jusqu'à un rechargement complet.
 *
 * Couvre tous les chemins de sortie : notre bouton « Se déconnecter », les
 * composants Clerk, l'expiration de session et le changement de compte.
 */
function AuthCacheReset() {
  const { isLoaded, userId } = useAuth()
  const queryClient = useQueryClient()
  // `undefined` = première résolution : rien à purger, on mémorise seulement.
  const previousUserId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (!isLoaded) return
    if (previousUserId.current !== undefined && previousUserId.current !== userId) {
      queryClient.clear()
    }
    previousUserId.current = userId
  }, [isLoaded, userId, queryClient])

  return null
}

export default function Providers({ children }: { children: ReactNode }) {
  // useState garantit un QueryClient stable par montage (pas recréé au re-render).
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <AuthCacheReset />
      <ReservationGateProvider>
        {children}
        <LoginRequiredModal />
      </ReservationGateProvider>
      {/* Devtools React Query — exclus du bundle de production. */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  )
}
