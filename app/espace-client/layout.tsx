'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import DashboardTopbar from '@/components/dashboard/DashboardTopbar'
import DashboardMobileNav from '@/components/dashboard/DashboardMobileNav'
import LabsLoader from '@/components/shared/LabsLoader'

export default function EspaceClientLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace('/auth/login?next=/espace-client')
    }
  }, [isReady, isAuthenticated, router])

  if (!isReady || !isAuthenticated) {
    return <LabsLoader fullscreen label="On allume les feux…" />
  }

  return (
    <div className="min-h-screen bg-cream flex">
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
