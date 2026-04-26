'use client'

import { useRouter } from 'next/navigation'
import { type ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useReservationGate } from '@/lib/reservation-gate-context'
import { cn } from '@/lib/utils'

type ReserveButtonProps = {
  children: ReactNode
  href?: string
  className?: string
  variant?: 'primary' | 'navy' | 'amber' | 'outline' | 'outline-light' | 'ghost'
  /** Render as anchor-style raw element (no .btn class). Used when a custom design wraps the button. */
  asChild?: boolean
  onClick?: () => void
}

const VARIANT_CLASS: Record<NonNullable<ReserveButtonProps['variant']>, string> = {
  primary: 'btn btn-primary',
  navy: 'btn btn-navy',
  amber: 'btn btn-amber',
  outline: 'btn btn-outline',
  'outline-light': 'btn btn-outline-light',
  ghost: 'btn-ghost',
}

export default function ReserveButton({
  children,
  href = '/reservation',
  className,
  variant = 'primary',
  asChild = false,
  onClick,
}: ReserveButtonProps) {
  const router = useRouter()
  const { isAuthenticated, isReady } = useAuth()
  const gate = useReservationGate()

  const handle = (e: React.MouseEvent) => {
    e.preventDefault()
    onClick?.()
    if (!isReady) return
    if (isAuthenticated) {
      router.push(href)
    } else {
      gate.open(href)
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      className={cn(asChild ? '' : VARIANT_CLASS[variant], className)}
    >
      {children}
    </button>
  )
}
