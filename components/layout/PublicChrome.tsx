'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const HIDDEN_PREFIXES = ['/espace-client', '/auth']

export default function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const hideChrome = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))

  if (hideChrome) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
