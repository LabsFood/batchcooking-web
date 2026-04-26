'use client'

import { type ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { ReservationGateProvider } from '@/lib/reservation-gate-context'
import LoginRequiredModal from '@/components/shared/LoginRequiredModal'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ReservationGateProvider>
        {children}
        <LoginRequiredModal />
      </ReservationGateProvider>
    </AuthProvider>
  )
}
