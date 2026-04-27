'use client'

import { useRouter } from 'next/navigation'
import { type ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useReservationGate } from '@/lib/reservation-gate-context'
import { cn } from '@/lib/utils'

type ReserveButtonProps = {
  children: ReactNode
  /**
   * Optional explicit destination. By default the button routes through
   * the dashboard reservation flow:
   *  - logged out → opens login gate modal
   *  - logged in, no meals       → /espace-client/menus?reserve=1
   *  - logged in, meals provided → /espace-client/reservation?meals=…
   */
  href?: string
  /** Comma-separated list of meal ids already chosen (skips the menu step). */
  meals?: string
  className?: string
  variant?: 'primary' | 'navy' | 'amber' | 'outline' | 'outline-light' | 'ghost'
  /** Render with no .btn class so a custom wrapper can style it. */
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
  href,
  meals,
  className,
  variant = 'primary',
  asChild = false,
  onClick,
}: ReserveButtonProps) {
  const router = useRouter()
  const { isAuthenticated, isReady } = useAuth()
  const gate = useReservationGate()

  const resolveTarget = () => {
    if (href) return href
    if (meals && meals.length > 0) {
      return `/espace-client/reservation?meals=${encodeURIComponent(meals)}`
    }
    // No meals yet — direct user to menu selection first.
    return '/espace-client/menus?reserve=1'
  }

  const handle = (e: React.MouseEvent) => {
    e.preventDefault()
    onClick?.()
    if (!isReady) return
    const target = resolveTarget()
    if (isAuthenticated) {
      router.push(target)
    } else {
      gate.open(target)
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
