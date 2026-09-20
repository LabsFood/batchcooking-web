'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react'
import {
  AISLES,
  REHEAT_MODES,
  STORAGE_METHODS,
  UNITS,
  type Aisle,
  type Ingredient,
  type ReheatMode,
  type Recipe,
  type StorageMethod,
  type Unit,
} from '@/lib/chef/recipes'
import { Card } from '@/components/chef/ChefPage'

/* ─────────────────────────────────────────────────────────────────────────────
   Saisie de la recette.

   Ce qui est écrit ici produit deux documents : la fiche recette standardisée
   Lab's Food remise au client, et la liste de courses de la prestation. D'où le
   découpage en ingrédients structurés plutôt qu'un texte libre.
   ───────────────────────────────────────────────────────────────────────────── */

export default function RecipeEditor({
  value,
  portions,
  onChange,
}: {
  value: Recipe
  portions: number
  onChange: (r: Recipe) => void
}) {
  return (
    <div className="space-y-5">
      <Ingredients
        value={value.ingredients}
        portions={portions}
        onChange={(ingredients) => onChange({ ...value, ingredients })}
      />
      <Steps value={value.steps} onChange={(steps) => onChange({ ...value, steps })} />

      <Card title="Réchauffage et conservation">
        <p className="mb-4 text-[13px] text-ink-soft">
          Ces consignes sont reprises telles quelles sur la fiche remise au client.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Mode">
            <select
              value={value.reheating.mode}
              onChange={(e) => onChange({ ...value, reheating: { ...value.reheating, mode: e.target.value as ReheatMode } })}
              className="input-base"
            >
              {REHEAT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Température (°C)" hint="Vide pour une poêle ou un micro-ondes">
            <input
              type="number"
              value={value.reheating.temperature ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  reheating: {
                    ...value.reheating,
                    temperature: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                  },
                })
              }
              className="input-base"
            />
          </Field>
          <Field label="Durée (min)">
            <input
              type="number"
              value={value.reheating.minutes}
              onChange={(e) =>
                onChange({ ...value, reheating: { ...value.reheating, minutes: Math.max(0, Number(e.target.value)) } })
              }
              className="input-base"
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Conseil de réchauffage" hint="Couvrir, ajouter un fond d’eau, remuer à mi-cuisson…">
            <input
              value={value.reheating.note ?? ''}
              onChange={(e) => onChange({ ...value, reheating: { ...value.reheating, note: e.target.value } })}
              className="input-base"
            />
          </Field>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[rgba(31,42,55,0.08)] pt-5 sm:grid-cols-3">
          <Field label="Conservation">
            <select
              value={value.storage.method}
              onChange={(e) => onChange({ ...value, storage: { ...value.storage, method: e.target.value as StorageMethod } })}
              className="input-base"
            >
              {STORAGE_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Durée (jours)">
            <input
              type="number"
              value={value.storage.days}
              onChange={(e) =>
                onChange({ ...value, storage: { ...value.storage, days: Math.max(1, Number(e.target.value)) } })
              }
              className="input-base"
            />
          </Field>
          <Field label="Contenant">
            <input
              value={value.storage.container ?? ''}
              onChange={(e) => onChange({ ...value, storage: { ...value.storage, container: e.target.value } })}
              placeholder="Boîte hermétique"
              className="input-base"
            />
          </Field>
        </div>
      </Card>
    </div>
  )
}

// ── Ingrédients ─────────────────────────────────────────────────────────────

function Ingredients({
  value,
  portions,
  onChange,
}: {
  value: Ingredient[]
  portions: number
  onChange: (v: Ingredient[]) => void
}) {
  const [draft, setDraft] = useState<Ingredient>({ name: '', qty: 1, unit: 'g', aisle: 'Fruits et légumes' })

  const add = () => {
    if (draft.name.trim().length < 2 || draft.qty <= 0) return
    onChange([...value, { ...draft, name: draft.name.trim() }])
    setDraft({ name: '', qty: 1, unit: draft.unit, aisle: draft.aisle })
  }

  return (
    <Card title="Ingrédients">
      <p className="mb-4 text-[13px] text-ink-soft">
        Quantités pour {portions} portion{portions > 1 ? 's' : ''}. La liste de courses de chaque prestation est
        calculée à partir d’elles, puis mise à l’échelle du foyer.
      </p>

      {value.length > 0 && (
        <ul className="mb-4 divide-y divide-[rgba(31,42,55,0.07)]">
          {value.map((ing, i) => (
            <li key={`${ing.name}-${i}`} className="flex items-center gap-3 py-2">
              <GripVertical className="h-4 w-4 shrink-0 text-ink-soft/50" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{ing.name}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-navy">
                {ing.qty} {ing.unit}
              </span>
              <span className="hidden shrink-0 text-xs text-ink-soft sm:inline">{ing.aisle}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, x) => x !== i))}
                aria-label={`Retirer ${ing.name}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-mid hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_84px_120px_minmax(0,170px)_auto]">
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Ingrédient"
          aria-label="Ingrédient"
          className="input-base col-span-2 py-2.5 text-sm sm:col-span-1"
        />
        <input
          value={draft.qty}
          onChange={(e) => setDraft({ ...draft, qty: Number(e.target.value.replace(',', '.')) || 0 })}
          inputMode="decimal"
          aria-label="Quantité"
          className="input-base py-2.5 text-sm"
        />
        <select
          value={draft.unit}
          onChange={(e) => setDraft({ ...draft, unit: e.target.value as Unit })}
          aria-label="Unité"
          className="input-base py-2.5 text-sm"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select
          value={draft.aisle}
          onChange={(e) => setDraft({ ...draft, aisle: e.target.value as Aisle })}
          aria-label="Rayon"
          className="input-base col-span-2 py-2.5 text-sm sm:col-span-1"
        >
          {AISLES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-navy px-4 py-2.5 text-xs font-semibold text-navy transition-colors hover:bg-navy hover:text-white sm:col-span-1"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter
        </button>
      </div>
    </Card>
  )
}

// ── Étapes ──────────────────────────────────────────────────────────────────

function Steps({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('')

  const add = () => {
    if (draft.trim().length < 3) return
    onChange([...value, draft.trim()])
    setDraft('')
  }

  const move = (i: number, dir: -1 | 1) => {
    const next = [...value]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <Card title="Préparation">
      {value.length > 0 && (
        <ol className="mb-4 space-y-2">
          {value.map((step, i) => (
            <li key={`${step}-${i}`} className="flex items-start gap-3 rounded-xl bg-cream-soft px-3 py-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold tabular-nums text-white">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm leading-relaxed text-ink">{step}</span>
              <span className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Monter l’étape ${i + 1}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-mid hover:bg-paper hover:text-navy disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label={`Descendre l’étape ${i + 1}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-mid hover:bg-paper hover:text-navy disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, x) => x !== i))}
                  aria-label={`Supprimer l’étape ${i + 1}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-mid hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Décrivez l’étape suivante…"
          aria-label="Nouvelle étape"
          className="input-base flex-1 resize-y text-sm"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex h-fit items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-navy px-4 py-2.5 text-xs font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter
        </button>
      </div>
    </Card>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-navy">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-ink-soft">{hint}</p>}
    </div>
  )
}
