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
   *  - logged in, nothing chosen → /espace-client/reservation (chef list)
   *  - logged in, a chef chosen  → /espace-client/reservation?chef=…
   *  - logged in, dishes chosen  → /espace-client/reservation?meals=…&chef=…
   */
  href?: string
  /** Comma-separated list of meal ids already chosen (skips the menu step). */
  meals?: string
  /** Chosen batch cooker: the reservation opens on his carte, not a blank list. */
  chef?: string
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
  chef,
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
      const q = new URLSearchParams({ meals })
      if (chef) q.set('chef', chef)
      return `/espace-client/reservation?${q.toString()}`
    }
    // A chef but no dish yet: his carte opens in the reservation flow.
    if (chef) return `/espace-client/reservation?chef=${encodeURIComponent(chef)}`
    // Nothing chosen — the reservation starts on the list of batch cookers.
    return '/espace-client/reservation'
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
