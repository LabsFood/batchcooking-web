'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { Skeleton, SkeletonCard, SkeletonGroup } from '@/components/shared/Skeleton'
import {
  notificationHref,
  notificationTitle,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/api/notifications'

/* ─────────────────────────────────────────────────────────────────────────────
   Le tiroir de la cloche.

   En tête, les notifications de l'API (`GET /me/notifications`) : ce qui s'est
   passé, lu ou non lu. Dessous, ce que l'écran **sait déjà** et qui demande une
   action — une pièce qui expire, un plat qu'on ne peut pas publier, une offre
   sans réponse. Ces alertes-là ne sont pas stockées : ce sont des faits
   recalculés à chaque ouverture, donc toujours justes.

   Les deux restent : l'une raconte ce qui s'est passé, l'autre ce qu'il reste
   à faire.
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
    texte: 'text-amber-ink',
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
  // Une API sans le flux (404) ou en panne laisse la cloche à ses seules alertes.
  const flux = useNotifications()
  const lire = useMarkNotificationRead()
  const router = useRouter()
  const notifications = flux.data?.data ?? []
  const n = countActionable(alerts) + (flux.data?.unreadCount ?? 0)

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
            <span className="tabular-nums absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-bold text-white">
              {n > 9 ? '9+' : n}
            </span>
          )}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:[animation-duration:120ms]" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-cream-soft shadow-[0_0_80px_-20px_rgba(31,42,55,0.55)] data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:[animation-duration:120ms]">
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
              className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-cream-deep hover:text-navy"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {notifications.length > 0 && (
              <section aria-label="Notifications" className="mb-4">
                <p className="mb-2 px-1 text-xs leading-relaxed text-ink-soft">
                  Vos notifications s’affichent ici, dans l’application. Aucun e-mail
                  n’est envoyé pour l’instant.
                </p>
                <ul className="space-y-2">
                  {notifications.map((notif) => (
                    <li key={notif.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!notif.readAt) lire.mutate(notif.id)
                          const href = notificationHref(notif.type, notif.subjectId)
                          if (href) {
                            setOpen(false)
                            router.push(href)
                          }
                        }}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left',
                          notif.readAt
                            ? 'border-[rgba(31,42,55,0.08)] bg-paper'
                            : 'border-amber/30 bg-amber/8',
                        )}
                      >
                        <Bell
                          className={cn(
                            'mt-0.5 h-4 w-4 shrink-0',
                            notif.readAt ? 'text-ink-soft' : 'text-amber-ink',
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block text-sm leading-snug text-navy',
                              !notif.readAt && 'font-semibold',
                            )}
                          >
                            {notificationTitle(notif.type)}
                            {!notif.readAt && <span className="sr-only"> (non lue)</span>}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-mid">
                            {new Date(notif.createdAt).toLocaleString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {loading ? (
              // Des rangées blanches sur le fond crème du tiroir, comme les vraies.
              <SkeletonGroup className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <SkeletonCard key={i} className="flex items-start gap-3 p-3.5">
                    <Skeleton className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </SkeletonCard>
                ))}
              </SkeletonGroup>
            ) : alerts.length === 0 ? (
              notifications.length === 0 && (
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
              )
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
            <footer className="border-t border-[rgba(31,42,55,0.08)] bg-paper px-5 py-3.5 text-xs leading-relaxed text-ink-soft">
              {children}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
