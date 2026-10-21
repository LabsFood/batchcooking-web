'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CookieBanner from '@/components/shared/CookieBanner'
import DevBanner from '@/components/shared/DevBanner'

/* Espaces connectés et parcours d'inscription : ils portent leur propre
   chrome (sidebar / topbar), la navbar et le footer publics n'y ont pas leur
   place. */
const HIDDEN_PREFIXES = ['/espace-client', '/espace-chef', '/devenir-chef', '/auth']

export default function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const hideChrome = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))

  if (hideChrome) {
    return (
      <>
        <DevBanner />
        <main className="min-h-screen">{children}</main>
      </>
    )
  }

  return (
    <>
      <DevBanner />
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <CookieBanner />
    </>
  )
}
