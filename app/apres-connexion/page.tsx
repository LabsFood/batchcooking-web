'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Logo from '@/components/shared/Logo'
import { useAuth } from '@/lib/auth-context'

/* ─────────────────────────────────────────────────────────────────────────────
   Aiguillage après connexion.

   La page de connexion est la même pour les clients et les batch cookers : on
   ne sait donc pas, avant d'avoir résolu le rôle, vers quel espace envoyer la
   personne. Cette page attend la réponse de `/me` puis redirige.
   ───────────────────────────────────────────────────────────────────────────── */

export default function AfterLoginPage() {
  const { isReady, isAuthenticated, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) {
      router.replace('/auth/login')
      return
    }
    // Le rôle peut mettre un instant à arriver : on n'aiguille qu'une fois connu,
    // et on retombe sur l'espace client si l'API ne répond pas.
    if (role === 'chef') router.replace('/espace-chef')
    else if (role) router.replace('/espace-client')
  }, [isReady, isAuthenticated, role, router])

  useEffect(() => {
    const timer = setTimeout(() => router.replace('/espace-client'), 6000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-6">
      <Logo size="md" />
      <p className="flex items-center gap-2.5 text-sm text-ink-mid">
        <Loader2 className="h-4 w-4 animate-spin text-terra" aria-hidden />
        Nous ouvrons votre espace…
      </p>
    </div>
  )
}
