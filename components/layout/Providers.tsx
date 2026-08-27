'use client'

import { useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeQueryClient } from '@/lib/api/query-client'
import { ReservationGateProvider } from '@/lib/reservation-gate-context'
import LoginRequiredModal from '@/components/shared/LoginRequiredModal'

export default function Providers({ children }: { children: ReactNode }) {
  // useState garantit un QueryClient stable par montage (pas recréé au re-render).
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <ReservationGateProvider>
        {children}
        <LoginRequiredModal />
      </ReservationGateProvider>
    </QueryClientProvider>
  )
}
