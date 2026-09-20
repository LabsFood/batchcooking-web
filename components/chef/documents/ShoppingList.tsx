'use client'

import { useState } from 'react'
import { Check, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import {
  AISLES,
  UNITS,
  buildShoppingList,
  formatQty,
  type Aisle,
  type ShoppingLine,
  type Unit,
} from '@/lib/chef/recipes'
import type { ChefDish } from '@/lib/chef/mock'

/* ─────────────────────────────────────────────────────────────────────────────
   Liste de courses d'une prestation.

   Calculée depuis les recettes des plats, mise à l'échelle du nombre de
   personnes, puis modifiable : le batch cooker connaît son marché mieux que le
   calcul. « Recalculer » revient à la liste issue des recettes.
   ───────────────────────────────────────────────────────────────────────────── */

const computeLines = (dishes: ChefDish[], persons: number): ShoppingLine[] =>
  buildShoppingList(
    dishes.map((d) => ({ recipe: d.recipe, basePortions: d.portions, portions: persons })),
  ).flatMap((g) => g.lines)

export default function ShoppingList({
  dishes,
  persons,
  editable = true,
}: {
  dishes: ChefDish[]
  persons: number
  editable?: boolean
}) {
  const [lines, setLines] = useState<ShoppingLine[]>(() => computeLines(dishes, persons))
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  const key = (l: ShoppingLine) => `${l.name}|${l.unit}`
  const edited = lines.some((l) => l.edited) || lines.length !== computeLines(dishes, persons).length

  const update = (k: string, patch: Partial<ShoppingLine>) =>
    setLines((prev) => prev.map((l) => (key(l) === k ? { ...l, ...patch, edited: true } : l)))

  const remove = (k: string) => setLines((prev) => prev.filter((l) => key(l) !== k))

  const byAisle = AISLES.map((aisle) => ({
    aisle,
    items: lines.filter((l) => l.aisle === aisle),
  })).filter((g) => g.items.length > 0)

  if (dishes.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-soft">
        Aucun plat du catalogue n’est rattaché à cette prestation : la liste de courses ne peut pas être calculée.
      </p>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-mid">
          {lines.length} ingrédient{lines.length > 1 ? 's' : ''} pour {persons} personne{persons > 1 ? 's' : ''}
          {edited && <span className="text-ink-soft"> · liste modifiée</span>}
        </p>
        {editable && (
          <div className="flex gap-1.5">
            {edited && (
              <button
                type="button"
                onClick={() => setLines(computeLines(dishes, persons))}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-mid hover:bg-cream-soft hover:text-navy"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Recalculer
              </button>
            )}
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-navy px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter
            </button>
          </div>
        )}
      </div>

      {adding && (
        <LineForm
          onCancel={() => setAdding(false)}
          onSave={(line) => {
            setLines((prev) => [...prev, { ...line, edited: true }])
            setAdding(false)
          }}
        />
      )}

      <div className="space-y-5">
        {byAisle.map((group) => (
          <section key={group.aisle}>
            <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft">{group.aisle}</h4>
            <ul className="divide-y divide-[rgba(31,42,55,0.07)]">
              {group.items.map((l) =>
                editing === key(l) ? (
                  <li key={key(l)} className="py-2">
                    <LineForm
                      initial={l}
                      onCancel={() => setEditing(null)}
                      onSave={(patch) => {
                        update(key(l), patch)
                        setEditing(null)
                      }}
                    />
                  </li>
                ) : (
                  <li key={key(l)} className="group flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{l.name}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-navy">
                      {formatQty(l.qty, l.unit)}
                    </span>
                    {editable && (
                      <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setEditing(key(l))}
                          aria-label={`Modifier ${l.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy focus-visible:opacity-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(key(l))}
                          aria-label={`Retirer ${l.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-mid hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                  </li>
                ),
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function LineForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ShoppingLine
  onSave: (line: ShoppingLine) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [qty, setQty] = useState(String(initial?.qty ?? 1))
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'g')
  const [aisle, setAisle] = useState<Aisle>(initial?.aisle ?? 'Fruits et légumes')

  const valid = name.trim().length > 1 && Number(qty) > 0

  return (
    <div className="mb-3 rounded-xl bg-cream-soft p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_84px_120px_minmax(0,160px)]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ingrédient"
          aria-label="Ingrédient"
          className="input-base col-span-2 py-2 text-sm sm:col-span-1"
        />
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value.replace(',', '.'))}
          inputMode="decimal"
          aria-label="Quantité"
          className="input-base py-2 text-sm"
        />
        <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} aria-label="Unité" className="input-base py-2 text-sm">
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select
          value={aisle}
          onChange={(e) => setAisle(e.target.value as Aisle)}
          aria-label="Rayon"
          className="input-base col-span-2 py-2 text-sm sm:col-span-1"
        >
          {AISLES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-mid hover:bg-paper"
        >
          <X className="h-3.5 w-3.5" aria-hidden /> Annuler
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={() => onSave({ name: name.trim(), qty: Number(qty), unit, aisle })}
          className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" aria-hidden /> Enregistrer
        </button>
      </div>
    </div>
  )
}
