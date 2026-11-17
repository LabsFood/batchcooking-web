'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ClerkLoaded, ClerkLoading } from '@clerk/nextjs'
import { RotateCw } from 'lucide-react'
import LabsLoader from './LabsLoader'

/**
 * Enveloppe les widgets Clerk (`<SignIn>`, `<SignUp>`).
 *
 * Ces composants ne rendent **rien** tant que clerk-js n'a pas résolu : quand
 * le chargement traîne ou échoue, la page d'auth s'affichait avec un trou à la
 * place du formulaire, sans le moindre indice pour l'utilisateur — d'où les
 * rechargements à répétition. On rend donc un loader pendant l'attente, puis un
 * état d'erreur explicite passé un délai raisonnable.
 *
 * Cause côté infra, à traiter séparément : sur une instance Clerk de
 * développement (`pk_test_`), chaque appel à la Frontend API exige le jeton
 * « dev browser » obtenu via un aller-retour avec `*.accounts.dev`. C'est du
 * stockage tiers, que les navigateurs bloquent de plus en plus — le handshake
 * échoue par intermittence et `Clerk.load()` ne résout jamais.
 */
const TIMEOUT_MS = 8000

export default function ClerkWidgetGate({ children }: { children: ReactNode }) {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [])

  return (
    <>
      <ClerkLoading>
        {timedOut ? <AuthUnavailable /> : <LabsLoader size="sm" className="py-10" />}
      </ClerkLoading>
      <ClerkLoaded>{children}</ClerkLoaded>
    </>
  )
}

function AuthUnavailable() {
  return (
    <div className="py-4 text-center">
      <h2 className="font-display text-lg font-bold text-navy mb-2">
        Le formulaire n&apos;a pas pu se charger
      </h2>
      <p className="text-ink-mid text-sm leading-relaxed mb-6">
        Le service d&apos;authentification ne répond pas. Si le problème persiste,
        désactivez le blocage des cookies tiers pour ce site, ou réessayez depuis
        une autre fenêtre.
      </p>
      <button onClick={() => window.location.reload()} className="btn btn-primary">
        <RotateCw className="w-4 h-4" />
        Réessayer
      </button>
    </div>
  )
}
