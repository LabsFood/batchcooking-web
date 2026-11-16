'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Logo from '@/components/shared/Logo'
import { useAuth } from '@/lib/auth-context'
import { Skeleton, SkeletonGroup } from '@/components/shared/Skeleton'

/* ─────────────────────────────────────────────────────────────────────────────
   Retour d'une page Stripe (paiement par carte, signature du mandat SEPA).

   Stripe ne renvoie jamais directement vers un espace connecté : arrivant de
   checkout.stripe.com, la requête ne porte pas la session aux yeux du
   middleware, qui renvoyait à la connexion — et l'aiguillage d'après connexion
   perdait l'adresse, `session_id` compris. Le mandat signé n'était alors jamais
   confirmé.

   Cette page est publique. Clerk s'y charge chez nous, puis une navigation
   interne emmène la personne à `vers`, avec le reste de l'adresse intact.
   `vers` est un chemin d'espace connecté, jamais une adresse : rien d'autre ne
   sort d'ici.
   ───────────────────────────────────────────────────────────────────────────── */

const DESTINATION = /^\/espace-(chef|client)(\/[\w-]+)*$/

export default function StripeReturnPage() {
  // `useSearchParams` impose une frontière Suspense.
  return (
    <Suspense fallback={<StripeReturnSkeleton />}>
      <StripeReturn />
    </Suspense>
  )
}

/** Le même écran que `StripeReturn` : logo, puis une ligne de la hauteur du message. */
function StripeReturnSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-6">
      <Logo size="md" />
      <SkeletonGroup>
        <Skeleton className="h-5 w-48" />
      </SkeletonGroup>
    </div>
  )
}

function StripeReturn() {
  const params = useSearchParams()
  const router = useRouter()
  const { isReady } = useAuth()

  useEffect(() => {
    if (!isReady) return
    const vers = params.get('vers') ?? ''
    if (!DESTINATION.test(vers)) {
      router.replace('/apres-connexion')
      return
    }
    const reste = new URLSearchParams(params)
    reste.delete('vers')
    const query = reste.toString()
    router.replace(query ? `${vers}?${query}` : vers)
  }, [isReady, params, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-6">
      <Logo size="md" />
      <p className="flex items-center gap-2 text-sm text-ink-mid">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Retour sur Lab’s Food…
      </p>
    </div>
  )
}
