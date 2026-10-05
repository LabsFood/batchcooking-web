'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Info,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   Le tiroir de la cloche.

   Il n'y a pas encore de flux de notifications côté API, et on n'en invente
   pas : ce tiroir montre ce que l'écran **sait déjà** et qui demande une
   action — une pièce qui expire, un plat qu'on ne peut pas publier, une offre
   sans réponse. Rien n'est stocké, rien n'est « lu » ou « non lu » : ce sont
   des faits recalculés à chaque ouverture, donc toujours justes.

   Quand le flux existera, il s'ajoutera en tête, et ces alertes resteront : les
   deux ne disent pas la même chose. L'une raconte ce qui s'est passé, l'autre
   ce qu'il reste à faire.
   ───────────────────────────────────────────────────────────────────────────── */

export type AlertTone = 'urgent' | 'todo' | 'info'

export interface Alert {
  id: string
  tone: AlertTone
  title: string
  detail?: string
  href?: string
  cta?: string
}

const TONES: Record<
  AlertTone,
  { Icon: typeof Info; texte: string; fond: string; bord: string }
> = {
  urgent: {
    Icon: AlertTriangle,
    texte: 'text-danger',
    fond: 'bg-danger/8',
    bord: 'border-danger/25',
  },
  todo: {
    Icon: Clock,
    texte: 'text-amber-deep',
    fond: 'bg-amber/8',
    bord: 'border-amber/30',
  },
  info: {
    Icon: Info,
    texte: 'text-ink-mid',
    fond: 'bg-cream-soft',
    bord: 'border-[rgba(31,42,55,0.08)]',
  },
}

/** Ce qui compte pour la pastille : ce qui demande une action, pas l'info. */
export function countActionable(alerts: Alert[]) {
  return alerts.filter((a) => a.tone !== 'info').length
}

export function AlertBell({
  alerts,
  loading,
  children,
}: {
  alerts: Alert[]
  /** Pendant le chargement, pas de pastille : on ne sait pas encore. */
  loading?: boolean
  /** Le mot de la fin, propre à l'espace. */
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const n = countActionable(alerts)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={
            loading
              ? 'Notifications'
              : n > 0
                ? `Notifications : ${n} à traiter`
                : 'Notifications : rien à traiter'
          }
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(31,42,55,0.08)] bg-paper text-navy transition-colors hover:border-amber"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {!loading && n > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[9px] font-bold text-white">
              {n > 9 ? '9+' : n}
            </span>
          )}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-cream-soft shadow-[0_0_80px_-20px_rgba(31,42,55,0.55)] data-[state=open]:animate-in data-[state=open]:slide-in-from-right">
          <header className="flex items-start justify-between gap-4 border-b border-[rgba(31,42,55,0.08)] bg-paper px-5 py-4">
            <div>
              <Dialog.Title className="font-display text-lg font-bold leading-tight text-navy">
                À traiter
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-ink-soft">
                {loading
                  ? 'Lecture en cours…'
                  : n > 0
                    ? `${n} point${n > 1 ? 's' : ''} qui demande${n > 1 ? 'nt' : ''} une action`
                    : 'Rien ne demande votre attention'}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fermer"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-cream-deep hover:text-navy"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-paper" />
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
                  <CheckCircle2 className="h-6 w-6" aria-hidden />
                </span>
                <p className="mt-4 font-display text-base font-bold text-navy">
                  Tout est à jour
                </p>
                <p className="mt-1 max-w-xs text-sm leading-relaxed text-ink-soft">
                  Rien n&apos;expire, rien n&apos;attend de réponse. Cette liste
                  se recalcule à chaque ouverture.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {alerts.map((a) => {
                  const t = TONES[a.tone]
                  const corps = (
                    <>
                      <t.Icon className={cn('mt-0.5 h-4 w-4 shrink-0', t.texte)} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug text-navy">
                          {a.title}
                        </span>
                        {a.detail && (
                          <span className="mt-0.5 block text-xs leading-relaxed text-ink-mid">
                            {a.detail}
                          </span>
                        )}
                        {a.href && a.cta && (
                          <span
                            className={cn(
                              'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
                              t.texte,
                            )}
                          >
                            {a.cta}
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </span>
                        )}
                      </span>
                    </>
                  )
                  const classes = cn(
                    'flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left',
                    t.fond,
                    t.bord,
                    a.href && 'transition-colors hover:brightness-[0.98]',
                  )
                  return (
                    <li key={a.id}>
                      {a.href ? (
                        <Dialog.Close asChild>
                          <Link href={a.href} className={classes}>
                            {corps}
                          </Link>
                        </Dialog.Close>
                      ) : (
                        <div className={classes}>{corps}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {children && (
            <footer className="border-t border-[rgba(31,42,55,0.08)] bg-paper px-5 py-3.5 text-[11px] leading-relaxed text-ink-soft">
              {children}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
