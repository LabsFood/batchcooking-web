'use client'

import { type ReactNode } from 'react'
import { ReservationGateProvider } from '@/lib/reservation-gate-context'
import LoginRequiredModal from '@/components/shared/LoginRequiredModal'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ReservationGateProvider>
      {children}
      <LoginRequiredModal />
    </ReservationGateProvider>
  )
}
