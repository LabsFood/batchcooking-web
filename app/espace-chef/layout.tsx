'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useMe } from '@/lib/api/me'
import { ChefSidebar, ChefMobileNav } from '@/components/chef/ChefNav'
import LabsLoader from '@/components/shared/LabsLoader'

/**
 * Garde de rôle.
 *
 * `DEMO_MODE` laisse entrer tout compte authentifié : le module tourne sur des
 * données simulées et l'endpoint `/me` n'est pas encore exploitable (401 tant
 * que le backend n'a pas ajouté les origines dans `authorizedParties`).
 * Passer à `false` pour activer le contrôle strict `role === 'chef'`.
 */
const DEMO_MODE = true

export default function EspaceChefLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady, signOut } = useAuth()
  const router = useRouter()
  const me = useMe()

  const role = me.data?.role

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace('/auth/login?next=/espace-chef')
    }
  }, [isReady, isAuthenticated, router])

  if (!isReady || !isAuthenticated) {
    return <LabsLoader fullscreen label="On allume les fourneaux…" />
  }

  // Contrôle strict : uniquement quand le backend est prêt.
  if (!DEMO_MODE && me.isSuccess && role !== 'chef') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-navy text-amber">
            <ShieldAlert className="h-7 w-7" />
          </span>
          <h1 className="font-display text-2xl font-bold text-navy mb-2">
            Espace réservé aux batch cookers
          </h1>
          <p className="text-ink-mid text-sm leading-relaxed mb-8">
            Ce compte n&apos;a pas le rôle chef. Connecte-toi avec un compte batch
            cooker pour accéder à cet espace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={signOut} className="btn btn-primary">
              <LogOut className="w-4 h-4" /> Se déconnecter
            </button>
            <Link href="/" className="btn btn-outline">
              <ArrowLeft className="w-4 h-4" /> Retour au site
            </Link>
          </div>
        </div>
      </div>
    )
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
