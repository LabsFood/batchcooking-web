'use client'

import { DayPicker, type DayPickerProps } from 'react-day-picker'
import { fr } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   Le calendrier de la maison — un seul, partout.

   Avant, chaque écran posait un `<input type="date">` : le navigateur
   choisissait la langue, le premier jour de la semaine et la façon de dire
   « indisponible » — c'est-à-dire : rien. Un agenda de batch cooker a besoin
   du contraire. Il doit montrer, sur le mois, ce qui est fermé, ce qui est
   déjà pris et ce qui reste libre, avant le clic.

   `react-day-picker` tient la mécanique (clavier, ARIA, mois contrôlé, locale)
   et nous tenons l'allure : les `--rdp-*` et `.lf-rdp` de `globals.css`
   l'habillent avec les couleurs de la marque, et `jours()` traduit l'état d'une
   journée en pastilles.

   Deux règles valables partout où ce composant apparaît :

   - **lundi ouvre la semaine**, parce que c'est la semaine de l'API
     (`weekday: 0` y vaut lundi) et celle du métier ;
   - **une date indisponible se voit, elle ne se découvre pas au clic.**
     Passez `disabled` et les modificateurs plutôt qu'un message d'erreur.
   ───────────────────────────────────────────────────────────────────────────── */

/** Les états qu'une journée peut porter, et la pastille qui les dit. */
export const DAY_MODIFIERS = {
  /** Fermé : semaine type sans créneau, ou exception posée sur la date. */
  closed: 'lf-day-closed',
  /** Une prestation acceptée occupe la journée. */
  booked: 'lf-day-booked',
  /** Une demande attend une réponse. */
  pending: 'lf-day-pending',
  /** Un bloc privé mange une partie de la journée. */
  blocked: 'lf-day-blocked',
  /** Des créneaux restent réservables. */
  free: 'lf-day-free',
} as const

export default function DatePicker({ className, ...props }: DayPickerProps) {
  return (
    <DayPicker
      locale={fr}
      /* L'API compte les jours à partir de lundi : l'écran fait pareil. */
      weekStartsOn={1}
      showOutsideDays
      modifiersClassNames={DAY_MODIFIERS}
      {...props}
      /* L'habillage passe par `.lf-rdp` dans `globals.css` : on ne remplace
         aucune classe de `react-day-picker`, sans quoi ses propres règles de
         mise en page s'en iraient avec. */
      className={cn('lf-rdp', className)}
    />
  )
}

/** La légende des pastilles — à poser sous le calendrier qui les utilise. */
export function DayLegend({
  items,
  className,
}: {
  items: Array<{ tone: keyof typeof DAY_MODIFIERS; label: string }>
  className?: string
}) {
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1.5', className)}>
      {items.map((i) => (
        <li key={i.tone} className="flex items-center gap-1.5 text-xs text-ink-soft">
          <span aria-hidden className={cn('h-2 w-2 rounded-full', LEGEND_DOT[i.tone])} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

const LEGEND_DOT: Record<keyof typeof DAY_MODIFIERS, string> = {
  closed: 'bg-[rgba(31,42,55,0.18)]',
  booked: 'bg-navy',
  pending: 'bg-amber',
  blocked: 'bg-ink-soft',
  free: 'bg-mint-deep',
}
