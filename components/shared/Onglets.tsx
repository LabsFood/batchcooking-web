'use client'

import { useId } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { DURATION, EASE_MOVE } from '@/lib/motion'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   Les onglets des espaces connectés.

   Six écrans avaient chacun leur barre : capitales espacées ici, casse normale
   là, un compteur entre parenthèses ailleurs, une bordure une fois sur deux.
   Une seule forme : un rail discret, l'onglet choisi posé dessus en blanc.

   Le fond de l'onglet actif glisse de l'un à l'autre (180 ms) : on voit d'où
   l'on vient. C'est le seul mouvement de la barre, et il se coupe en
   `prefers-reduced-motion` (MotionConfig, dans Providers).

   Sur un écran étroit, le rail défile à l'horizontale au lieu de passer à la
   ligne : une barre sur deux lignes ne se lit plus comme un choix unique.
   ───────────────────────────────────────────────────────────────────────────── */

export interface Onglet<T extends string> {
  id: T
  label: string
  Icon?: LucideIcon
  /** Un nombre d'éléments, dit en clair à côté du libellé. */
  count?: number
  /** Ce qui attend une action dans cet onglet : une pastille ambre. */
  alert?: number
  /** L'`id` du panneau commandé, quand l'écran en pose un. */
  controls?: string
}

export function Onglets<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: readonly Onglet<T>[]
  value: T
  onChange: (id: T) => void
  /** Ce que la barre permet de choisir, pour un lecteur d'écran. */
  label: string
  className?: string
}) {
  const fond = useId()

  return (
    <div className={cn('-mx-1 overflow-x-auto px-1 [scrollbar-width:none]', className)}>
      <div
        role="tablist"
        aria-label={label}
        className="inline-flex gap-1 rounded-xl bg-[rgba(31,42,55,0.07)] p-1"
      >
        {items.map((t) => {
          const on = t.id === value
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`onglet-${t.id}`}
              aria-selected={on}
              aria-controls={t.controls}
              onClick={() => onChange(t.id)}
              className={cn(
                'relative flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-colors',
                on ? 'text-navy' : 'text-ink-mid hover:text-navy',
              )}
            >
              {on && (
                // déplacement : le fond glisse d'un onglet à l'autre en 180 ms
                <motion.span
                  layoutId={fond}
                  aria-hidden
                  className="absolute inset-0 rounded-lg bg-paper shadow-[0_1px_2px_rgba(31,42,55,0.12)]"
                  transition={{ duration: DURATION.fast, ease: EASE_MOVE }}
                />
              )}
              {t.Icon && <t.Icon className="relative h-4 w-4" aria-hidden />}
              <span className="relative">{t.label}</span>
              {typeof t.count === 'number' && (
                <span className={cn('relative tabular-nums', on ? 'text-ink-mid' : 'text-ink-soft')}>
                  {t.count}
                </span>
              )}
              {!!t.alert && t.alert > 0 && (
                <span className="relative inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1.5 text-xs font-bold tabular-nums text-navy">
                  {t.alert}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
