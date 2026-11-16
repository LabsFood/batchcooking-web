'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, RotateCw } from 'lucide-react'
import Logo from '@/components/shared/Logo'
import { useAuth } from '@/lib/auth-context'
import { useTooLong } from '@/lib/use-too-long'

/* ─────────────────────────────────────────────────────────────────────────────
   Aiguillage après connexion.

   La page de connexion est la même pour les clients et les batch cookers : on
   ne sait donc pas, avant d'avoir résolu le rôle, vers quel espace envoyer la
   personne. Cette page attend la réponse de `/me` puis redirige.

   Un garde-fou est resté longtemps ici : au bout de six secondes, la page
   partait vers `/espace-client` **quoi qu'il arrive**. Sur une session absente,
   cela poussait un visiteur anonyme vers une route protégée, que le middleware
   renvoyait au formulaire de connexion, qui remontait le widget Clerk, qui
   reprenait le flux d'authentification en cours — un va-et-vient qui finissait
   par faire sonner la limite de tentatives de vérification chez Clerk. Le
   garde-fou n'agit donc plus que là où il sert : session ouverte, rôle muet.
   ───────────────────────────────────────────────────────────────────────────── */

export default function AfterLoginPage() {
  const { isReady, isAuthenticated, role } = useAuth()
  const router = useRouter()

  // Deux attentes distinctes : clerk-js qui se charge, puis `/me` qui répond.
  const attente = !isReady || (isAuthenticated && !role)
  const tropLong = useTooLong(attente, 6000)

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) {
      router.replace('/auth/login')
      return
    }
    if (role === 'chef') router.replace('/espace-chef')
    else if (role) router.replace('/espace-client')
  }, [isReady, isAuthenticated, role, router])

  // Connecté mais le rôle n'arrive pas : l'espace client est le cas général,
  // et il reste accessible puisque la session existe.
  useEffect(() => {
    if (tropLong && isReady && isAuthenticated && !role) {
      router.replace('/espace-client')
    }
  }, [tropLong, isReady, isAuthenticated, role, router])

  // Clerk n'a pas résolu : on ne redirige nulle part, on le dit.
  if (tropLong && !isReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-cream px-6 text-center">
        <Logo size="md" />
        <div className="max-w-sm">
          <h1 className="font-display text-xl font-bold text-navy">
            La connexion n&apos;aboutit pas
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-mid">
            Le service d&apos;authentification ne répond pas. Rien n&apos;est
            perdu : votre compte est intact.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={() => window.location.reload()} className="btn btn-primary text-xs">
            <RotateCw className="h-3.5 w-3.5" aria-hidden /> Réessayer
          </button>
          <Link href="/auth/login" className="btn btn-outline text-xs">
            Retourner à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-6">
      <Logo size="md" />
      <p className="flex items-center gap-2.5 text-sm text-ink-mid" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin text-amber-ink" aria-hidden />
        Nous ouvrons votre espace…
      </p>
    </div>
  )
}
