'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Globe2, UtensilsCrossed } from 'lucide-react'
import { Card, Empty } from '@/components/chef/ChefPage'
import type { ChefDish, ChefMenu } from '@/lib/chef/mock'

/* ─────────────────────────────────────────────────────────────────────────────
   Aperçu de la vitrine au mois.

   Le client réserve semaine après semaine : le batch cooker doit voir d'un coup
   d'œil ce qui sera proposé sur tout le mois, et assigner un menu à chaque
   semaine. Seuls les menus publiés sont visibles côté client ; les autres
   apparaissent ici en grisé pour préparer la suite.
   ───────────────────────────────────────────────────────────────────────────── */

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

/** Lundis du mois : une ligne de vitrine par semaine commencée. */
function mondaysOf(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const cursor = new Date(first)
  cursor.setDate(1 - ((first.getDay() + 6) % 7))
  const out: Date[] = []
  while (cursor.getMonth() === month || cursor < first || out.length === 0) {
    out.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 7)
    if (cursor.getMonth() !== month && cursor.getDate() > 7) break
  }
  return out
}

const dayMonth = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 4)}.`

export default function ShowcaseMonth({
  menus,
  dishes,
}: {
  menus: ChefMenu[]
  dishes: ChefDish[]
}) {
  // L'horloge n'est lue qu'au montage : le rendu reste pur.
  const [today] = useState(() => new Date())
  const [offset, setOffset] = useState(0)
  const [assignments, setAssignments] = useState<Record<string, string>>({})

  const shown = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + offset, 1),
    [today, offset],
  )
  const weeks = useMemo(() => mondaysOf(shown.getFullYear(), shown.getMonth()), [shown])

  const publishable = menus.filter((m) => m.status === 'published' || m.status === 'pending')

  // À défaut d'assignation, les menus publiés se répartissent sur les semaines.
  const menuOf = (key: string, index: number): ChefMenu | undefined => {
    const assigned = assignments[key]
    if (assigned === 'none') return undefined
    if (assigned) return menus.find((m) => m.id === assigned)
    const published = menus.filter((m) => m.status === 'published')
    return published[index % Math.max(published.length, 1)]
  }

  return (
    <Card
      title={`Vitrine de ${MONTHS[shown.getMonth()]} ${shown.getFullYear()}`}
      action={
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Mois précédent"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOffset(0)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-mid hover:bg-cream-soft hover:text-navy"
          >
            Ce mois
          </button>
          <button
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Mois suivant"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      }
    >
      {publishable.length === 0 ? (
        <Empty text="Publiez un menu pour qu’il apparaisse sur votre vitrine." />
      ) : (
        <>
          <p className="mb-4 flex items-start gap-2 text-[13px] leading-relaxed text-ink-mid">
            <Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
            Voici ce que voient vos clients, semaine par semaine. Changez le menu d’une semaine pour faire tourner
            votre carte.
          </p>

          <ul className="space-y-3">
            {weeks.map((monday, i) => {
              const key = monday.toISOString().slice(0, 10)
              const menu = menuOf(key, i)
              const end = new Date(monday)
              end.setDate(end.getDate() + 6)
              const menuDishes = (menu?.dishIds ?? [])
                .map((id) => dishes.find((d) => d.id === id))
                .filter((d): d is ChefDish => Boolean(d))

              return (
                <li
                  key={key}
                  className="rounded-xl border border-[rgba(31,42,55,0.08)] p-4 transition-colors hover:border-[rgba(31,42,55,0.16)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-ink-soft">Semaine {i + 1}</p>
                      <p className="text-sm font-semibold tabular-nums text-navy">
                        {dayMonth(monday)} – {dayMonth(end)}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-ink-soft">
                      Menu affiché
                      <select
                        value={assignments[key] ?? menu?.id ?? 'none'}
                        onChange={(e) => setAssignments((p) => ({ ...p, [key]: e.target.value }))}
                        className="input-base w-auto py-2 text-sm"
                      >
                        <option value="none">Aucun menu</option>
                        {publishable.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                            {m.status !== 'published' ? ' (en validation)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {menu ? (
                    <div className="mt-3 border-t border-[rgba(31,42,55,0.06)] pt-3">
                      <p className="font-display text-base font-bold text-navy">{menu.title}</p>
                      {menuDishes.length === 0 ? (
                        <p className="mt-1 text-[13px] text-ink-soft">Ce menu ne contient aucun plat.</p>
                      ) : (
                        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {menuDishes.map((d) => (
                            <li key={d.id} className="flex items-start gap-2.5 rounded-lg bg-cream-soft px-3 py-2">
                              <UtensilsCrossed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-deep" aria-hidden />
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-semibold text-navy">{d.name}</span>
                                <span className="flex items-center gap-1 text-[11px] text-ink-soft">
                                  <Globe2 className="h-3 w-3" aria-hidden /> {d.country}
                                  {d.allergens.length > 0 && <span> · {d.allergens.join(', ')}</span>}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 border-t border-[rgba(31,42,55,0.06)] pt-3 text-[13px] text-ink-soft">
                      Aucun menu cette semaine : votre vitrine affiche uniquement vos plats publiés.
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}
