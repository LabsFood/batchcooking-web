'use client'

import { useId, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, ChevronRight, Circle, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   Le fil d'activité d'une IA : ce qu'elle a fait, étape par étape.

   Une trace, pas un récit : chaque ligne correspond à un événement réel (envoi
   d'un fichier, lecture par le modèle, liaison à la liste d'ingrédients), avec
   son état. Jamais de « pensée » inventée après coup.

   - Le fil se replie derrière un résumé d'une ligne (bouton, `aria-expanded`).
   - Une étape terminée peut porter un détail, replié par défaut, qu'on ouvre au
     clic ou au clavier (Entrée, Espace).
   - Les changements d'état sont annoncés (`aria-live="polite"`) sans voler le
     focus.
   - Mouvement : couleur et chevron, 120 ms, coupés en reduced-motion. Seul le
     spinner de l'étape en cours tourne (indicateur de chargement).
   ───────────────────────────────────────────────────────────────────────────── */

export type ActivityStatus = 'pending' | 'active' | 'done' | 'warning' | 'error'

export interface ActivityStep {
  id: string
  label: string
  status: ActivityStatus
  /** Une précision courte, toujours visible (durée, nombre, modèle). */
  meta?: string
  /** Le détail, replié par défaut. */
  detail?: ReactNode
}

const STATUS_TEXT: Record<ActivityStatus, string> = {
  pending: 'à venir',
  active: 'en cours',
  done: 'terminé',
  warning: 'à vérifier',
  error: 'échec',
}

function StatusIcon({ status }: { status: ActivityStatus }) {
  const base = 'h-4 w-4 shrink-0'
  switch (status) {
    case 'active':
      return <Loader2 className={cn(base, 'animate-spin text-navy motion-reduce:animate-none')} aria-hidden />
    case 'done':
      return <Check className={cn(base, 'text-mint-ink')} aria-hidden />
    case 'warning':
      return <AlertTriangle className={cn(base, 'text-amber-deep')} aria-hidden />
    case 'error':
      return <X className={cn(base, 'text-red-700')} aria-hidden />
    default:
      return <Circle className={cn(base, 'text-ink-soft/50')} aria-hidden />
  }
}

function StepRow({ step }: { step: ActivityStep }) {
  const [open, setOpen] = useState(false)
  const detailId = useId()
  const expandable = Boolean(step.detail) && step.status !== 'pending'
  return (
    <li className="py-1.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5">
          <StatusIcon status={step.status} />
        </span>
        <div className="min-w-0 flex-1">
          {expandable ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={detailId}
              className="flex w-full items-start gap-1 rounded-lg text-left text-sm text-ink hover:text-navy"
            >
              <span className="min-w-0 flex-1">
                {step.label}
                <span className="sr-only"> ({STATUS_TEXT[step.status]})</span>
              </span>
              {/* Le chevron pivote en 120 ms ; immobile en reduced-motion. */}
              <ChevronRight
                className={cn(
                  'mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft transition-transform duration-[120ms] motion-reduce:transition-none',
                  open && 'rotate-90',
                )}
                aria-hidden
              />
            </button>
          ) : (
            <p className={cn('text-sm', step.status === 'pending' ? 'text-ink-soft' : 'text-ink')}>
              {step.label}
              <span className="sr-only"> ({STATUS_TEXT[step.status]})</span>
            </p>
          )}
          {step.meta && <p className="text-[12px] tabular-nums text-ink-soft">{step.meta}</p>}
          {expandable && open && (
            <div id={detailId} className="mt-1.5 text-[13px] leading-relaxed text-ink-mid">
              {step.detail}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

export default function ActivityTrail({
  steps,
  title,
  summary,
  open,
  onToggle,
}: {
  steps: ActivityStep[]
  /** Ce que le fil raconte, ex. « Comment l'IA a lu la recette ». */
  title: string
  /** Le résumé d'une ligne montré quand le fil est replié. */
  summary: string
  open: boolean
  onToggle: () => void
}) {
  const listId = useId()
  const running = steps.some((s) => s.status === 'active')
  return (
    <section aria-label={title} className="rounded-2xl bg-cream-soft p-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full items-center gap-2 rounded-lg text-left"
      >
        {running ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-navy motion-reduce:animate-none" aria-hidden />
        ) : (
          // Le chevron pivote en 120 ms ; immobile en reduced-motion.
          <ChevronRight
            className={cn(
              'h-4 w-4 shrink-0 text-ink-soft transition-transform duration-[120ms] motion-reduce:transition-none',
              open && 'rotate-90',
            )}
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-navy">{title}</span>
          <span className="block text-[13px] tabular-nums text-ink-soft">{summary}</span>
        </span>
      </button>
      <ol id={listId} hidden={!open} aria-live="polite" className="mt-2 border-l border-cream-deep pl-3">
        {steps.map((s) => (
          <StepRow key={s.id} step={s} />
        ))}
      </ol>
    </section>
  )
}
