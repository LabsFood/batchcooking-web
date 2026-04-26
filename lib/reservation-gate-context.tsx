'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type GateContextValue = {
  isOpen: boolean
  intendedHref: string | null
  open: (intendedHref?: string) => void
  close: () => void
}

const ReservationGateContext = createContext<GateContextValue | null>(null)

export function ReservationGateProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [intendedHref, setIntendedHref] = useState<string | null>(null)

  const open = useCallback((href?: string) => {
    setIntendedHref(href ?? '/reservation')
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo(
    () => ({ isOpen, intendedHref, open, close }),
    [isOpen, intendedHref, open, close],
  )

  return (
    <ReservationGateContext.Provider value={value}>
      {children}
    </ReservationGateContext.Provider>
  )
}

export function useReservationGate() {
  const ctx = useContext(ReservationGateContext)
  if (!ctx) throw new Error('useReservationGate must be used within ReservationGateProvider')
  return ctx
}
