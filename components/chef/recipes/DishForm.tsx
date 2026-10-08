'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Loader2, Plus, Trash2, X } from 'lucide-react'
import { AISLES, UNITS } from '@/lib/chef/recipes'
import { COUNTRIES } from '@/lib/chef/countries'
import { useAllergens, useDiets, useDishCategories } from '@/lib/api/referentials'
import {
  DIFFICULTY_LABEL,
  type Dish,
  type DishInput,
  type Difficulty,
  type Ingredient,
} from '@/lib/api/chef-catalog'

/* ─────────────────────────────────────────────────────────────────────────────
   Écriture d'un plat.

   Deux règles viennent de l'API et tiennent tout le formulaire :

   - les régimes et les allergènes se prennent dans les référentiels ; ce qui
     n'y est pas va dans les listes libres, pas dans un champ texte perdu ;
   - « aucun allergène » est une déclaration, pas une absence de saisie, et ne
     se combine avec aucun allergène coché. C'est ce qui permet de distinguer
     « vérifié, il n'y en a pas » de « pas encore rempli ».

   Seuls le nom et le temps de préparation sont exigés pour enregistrer un
   brouillon : on n'oblige personne à tout écrire d'un trait.
   ───────────────────────────────────────────────────────────────────────────── */

const REHEAT_MODES = [
  { id: 'oven', label: 'Four' },
  { id: 'pan', label: 'Poêle' },
  { id: 'microwave', label: 'Micro-ondes' },
  { id: 'steam', label: 'Vapeur' },
  { id: 'none', label: 'Tel quel' },
]

const STORAGE_METHODS = [
  { id: 'fridge', label: 'Réfrigérateur' },
  { id: 'freezer', label: 'Congélateur' },
  { id: 'ambient', label: 'Température ambiante' },
]

type Draft = DishInput & {
  ingredients: Ingredient[]
  steps: string[]
  reheatMode: string
  reheatTemperature: string
  reheatMinutes: string
  reheatNote: string
  storageMethod: string
  storageDays: string
  storageContainer: string
}

function toDraft(dish: Dish | null): Draft {
  return {
    name: dish?.name ?? '',
    description: dish?.description ?? '',
    country: dish?.country ?? '',
    category: dish?.category ?? 'main',
    portions: dish?.portions ?? 4,
    prepMinutes: dish?.prepMinutes ?? 20,
    cookMinutes: dish?.cookMinutes ?? null,
    difficulty: dish?.difficulty ?? 'easy',
    diets: dish?.diets ?? [],
    customDiets: dish?.customDiets ?? [],
    allergens: dish?.allergens ?? [],
    allergensNone: dish?.allergensNone ?? false,
    customAllergens: dish?.customAllergens ?? [],
    ingredients: dish?.recipe?.ingredients ?? [],
    steps: dish?.recipe?.steps ?? [],
    reheatMode: dish?.recipe?.reheating?.mode ?? '',
    reheatTemperature: dish?.recipe?.reheating?.temperature?.toString() ?? '',
    reheatMinutes: dish?.recipe?.reheating?.minutes?.toString() ?? '',
    reheatNote: dish?.recipe?.reheating?.note ?? '',
    storageMethod: dish?.recipe?.storage?.method ?? '',
    storageDays: dish?.recipe?.storage?.days?.toString() ?? '',
    storageContainer: dish?.recipe?.storage?.container ?? '',
  }
}

function toPayload(d: Draft): DishInput {
  const num = (v: string) => (v.trim() ? Number(v) : undefined)
  const hasRecipe = d.ingredients.length > 0 || d.steps.length > 0
  return {
    name: d.name.trim(),
    description: d.description?.trim() || null,
    country: d.country || null,
    category: d.category || null,
    portions: d.portions,
    prepMinutes: d.prepMinutes,
    cookMinutes: d.cookMinutes ?? null,
    difficulty: d.difficulty ?? null,
    diets: d.diets,
    customDiets: d.customDiets,
    allergens: d.allergensNone ? [] : d.allergens,
    allergensNone: d.allergensNone,
    customAllergens: d.allergensNone ? [] : d.customAllergens,
    recipe: hasRecipe
      ? {
          ingredients: d.ingredients.filter((i) => i.name.trim()),
          steps: d.steps.filter((s) => s.trim()),
          reheating: d.reheatMode
            ? {
                mode: d.reheatMode,
                temperature: num(d.reheatTemperature),
                minutes: num(d.reheatMinutes),
                note: d.reheatNote.trim() || undefined,
              }
            : null,
          storage: d.storageMethod
            ? {
                method: d.storageMethod,
                days: num(d.storageDays),
                container: d.storageContainer.trim() || undefined,
              }
            : null,
        }
      : null,
  }
}

export default function DishForm({
  dish,
  onSave,
  saving,
  error,
  backHref,
}: {
  /** Plat existant, ou null pour une création. */
  dish: Dish | null
  onSave: (input: DishInput) => void
  saving: boolean
  error: string | null
  backHref: string
}) {
  const [d, setD] = useState<Draft>(() => toDraft(dish))
  const [customDiet, setCustomDiet] = useState('')
  const [customAllergen, setCustomAllergen] = useState('')

  const diets = useDiets()
  const allergens = useAllergens()
  const categories = useDishCategories()

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))
  const toggle = (k: 'diets' | 'allergens', code: string) =>
    setD((p) => ({
      ...p,
      [k]: p[k]!.includes(code) ? p[k]!.filter((x) => x !== code) : [...p[k]!, code],
    }))

  const ready = d.name.trim().length >= 2 && d.prepMinutes > 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (ready && !saving) onSave(toPayload(d))
      }}
    >
      <div className="mx-auto max-w-2xl space-y-7 pb-28">
              {/* ── L'essentiel ─────────────────────────────────────────── */}
              <Group title="Le plat">
                <Field label="Nom" required>
                  <input
                    value={d.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Poulet rôti aux herbes"
                    className="input-base"
                  />
                </Field>
                <Field label="Description" hint="Ce que le client lit sur la carte.">
                  <textarea
                    value={d.description ?? ''}
                    onChange={(e) => set('description', e.target.value)}
                    rows={2}
                    placeholder="Poulet fermier rôti, thym et romarin, pommes de terre grenaille."
                    className="input-base"
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Pays d’origine" hint="Il colore la carte culinaire du client.">
                    <select
                      value={d.country ?? ''}
                      onChange={(e) => set('country', e.target.value)}
                      className="input-base"
                    >
                      <option value="">À préciser</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Catégorie">
                    <select
                      value={d.category ?? ''}
                      onChange={(e) => set('category', e.target.value)}
                      className="input-base"
                    >
                      <option value="">À préciser</option>
                      {categories.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Portions">
                    <input
                      type="number"
                      min={1}
                      value={d.portions ?? 4}
                      onChange={(e) => set('portions', Number(e.target.value))}
                      className="input-base"
                    />
                  </Field>
                  <Field label="Préparation" required>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={d.prepMinutes}
                        onChange={(e) => set('prepMinutes', Number(e.target.value))}
                        className="input-base"
                      />
                      <span className="text-xs text-ink-soft">min</span>
                    </div>
                  </Field>
                  <Field label="Cuisson">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={d.cookMinutes ?? ''}
                        onChange={(e) =>
                          set('cookMinutes', e.target.value ? Number(e.target.value) : null)
                        }
                        className="input-base"
                      />
                      <span className="text-xs text-ink-soft">min</span>
                    </div>
                  </Field>
                  <Field label="Difficulté">
                    <select
                      value={d.difficulty ?? ''}
                      onChange={(e) => set('difficulty', (e.target.value || null) as Difficulty)}
                      className="input-base"
                    >
                      {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((k) => (
                        <option key={k} value={k}>
                          {DIFFICULTY_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </Group>

              {/* ── Régimes ─────────────────────────────────────────────── */}
              <Group title="Régimes couverts" hint="Un menu n’est « sans gluten » que si tous ses plats le sont.">
                <Chips
                  options={diets}
                  selected={d.diets ?? []}
                  onToggle={(c) => toggle('diets', c)}
                />
                <FreeList
                  value={customDiet}
                  onChange={setCustomDiet}
                  items={d.customDiets ?? []}
                  onAdd={(v) => set('customDiets', [...(d.customDiets ?? []), v])}
                  onRemove={(v) =>
                    set('customDiets', (d.customDiets ?? []).filter((x) => x !== v))
                  }
                  placeholder="Autre régime (ex. sans porc)"
                />
              </Group>

              {/* ── Allergènes ──────────────────────────────────────────── */}
              <Group
                title="Allergènes"
                hint="Les quatorze allergènes réglementaires. C’est ce que lit un client allergique."
              >
                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-cream-soft p-3.5">
                  <input
                    type="checkbox"
                    checked={d.allergensNone ?? false}
                    onChange={(e) => set('allergensNone', e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-[13px] leading-snug">
                    <span className="block font-semibold text-navy">
                      Ce plat ne contient aucun des 14 allergènes
                    </span>
                    <span className="block text-ink-mid">
                      Une déclaration, pas un oubli : c’est elle qui distingue « vérifié » de
                      « pas encore rempli ». Elle ne se combine avec aucun allergène coché.
                    </span>
                  </span>
                </label>

                <div className={d.allergensNone ? 'pointer-events-none opacity-40' : ''}>
                  <Chips
                    options={allergens}
                    selected={d.allergens ?? []}
                    onToggle={(c) => toggle('allergens', c)}
                    tone="danger"
                  />
                  <FreeList
                    value={customAllergen}
                    onChange={setCustomAllergen}
                    items={d.customAllergens ?? []}
                    onAdd={(v) => set('customAllergens', [...(d.customAllergens ?? []), v])}
                    onRemove={(v) =>
                      set('customAllergens', (d.customAllergens ?? []).filter((x) => x !== v))
                    }
                    placeholder="Autre allergène (ex. sarrasin)"
                  />
                </div>
              </Group>

              {/* ── Recette ─────────────────────────────────────────────── */}
              <Group
                title="Recette"
                hint="Elle sert à la liste de courses et à la fiche que vous suivez chez le client."
              >
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
                  Ingrédients
                </p>
                <ul className="space-y-2">
                  {(d.ingredients ?? []).map((ing, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2">
                      <input
                        value={ing.name}
                        onChange={(e) => {
                          const next = [...d.ingredients]
                          next[i] = { ...ing, name: e.target.value }
                          set('ingredients', next)
                        }}
                        placeholder="Poulet fermier"
                        className="input-base min-w-0 flex-1"
                      />
                      <input
                        type="number"
                        step="any"
                        value={ing.qty}
                        onChange={(e) => {
                          const next = [...d.ingredients]
                          next[i] = { ...ing, qty: Number(e.target.value) }
                          set('ingredients', next)
                        }}
                        className="input-base w-20"
                      />
                      <select
                        value={ing.unit}
                        onChange={(e) => {
                          const next = [...d.ingredients]
                          next[i] = { ...ing, unit: e.target.value }
                          set('ingredients', next)
                        }}
                        className="input-base w-auto"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <select
                        value={ing.aisle ?? ''}
                        onChange={(e) => {
                          const next = [...d.ingredients]
                          next[i] = { ...ing, aisle: e.target.value }
                          set('ingredients', next)
                        }}
                        className="input-base w-auto"
                      >
                        <option value="">Rayon</option>
                        {AISLES.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          set('ingredients', d.ingredients.filter((_, j) => j !== i))
                        }
                        aria-label={`Retirer ${ing.name || 'cet ingrédient'}`}
                        className="text-ink-soft hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() =>
                    set('ingredients', [
                      ...d.ingredients,
                      { name: '', qty: 1, unit: 'g', aisle: '' },
                    ])
                  }
                  className="btn btn-outline text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter un ingrédient
                </button>

                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
                  Étapes
                </p>
                <ol className="space-y-2">
                  {(d.steps ?? []).map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-2.5 w-5 shrink-0 text-right text-xs tabular-nums text-ink-soft">
                        {i + 1}.
                      </span>
                      <textarea
                        value={step}
                        rows={2}
                        onChange={(e) => {
                          const next = [...d.steps]
                          next[i] = e.target.value
                          set('steps', next)
                        }}
                        className="input-base min-w-0 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => set('steps', d.steps.filter((_, j) => j !== i))}
                        aria-label={`Retirer l’étape ${i + 1}`}
                        className="mt-2.5 text-ink-soft hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => set('steps', [...d.steps, ''])}
                  className="btn btn-outline text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter une étape
                </button>
              </Group>

              {/* ── Après la session ────────────────────────────────────── */}
              <Group
                title="Réchauffage et conservation"
                hint="Ce que le client lit dans son espace, plusieurs jours après votre passage."
              >
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Réchauffer au">
                    <select
                      value={d.reheatMode}
                      onChange={(e) => set('reheatMode', e.target.value)}
                      className="input-base"
                    >
                      <option value="">—</option>
                      {REHEAT_MODES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Température">
                    <input
                      type="number"
                      value={d.reheatTemperature}
                      onChange={(e) => set('reheatTemperature', e.target.value)}
                      placeholder="160"
                      className="input-base"
                    />
                  </Field>
                  <Field label="Durée">
                    <input
                      type="number"
                      value={d.reheatMinutes}
                      onChange={(e) => set('reheatMinutes', e.target.value)}
                      placeholder="15"
                      className="input-base"
                    />
                  </Field>
                  <Field label="Conserver au">
                    <select
                      value={d.storageMethod}
                      onChange={(e) => set('storageMethod', e.target.value)}
                      className="input-base"
                    >
                      <option value="">—</option>
                      {STORAGE_METHODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Jours de conservation">
                    <input
                      type="number"
                      value={d.storageDays}
                      onChange={(e) => set('storageDays', e.target.value)}
                      placeholder="3"
                      className="input-base"
                    />
                  </Field>
                  <Field label="Contenant" className="sm:col-span-2">
                    <input
                      value={d.storageContainer}
                      onChange={(e) => set('storageContainer', e.target.value)}
                      placeholder="Boîte hermétique"
                      className="input-base"
                    />
                  </Field>
                </div>
                <Field label="Conseil" hint="Une phrase, celle que vous diriez de vive voix.">
                  <input
                    value={d.reheatNote}
                    onChange={(e) => set('reheatNote', e.target.value)}
                    placeholder="Ajoutez une cuillère de bouillon pour éviter le dessèchement."
                    className="input-base"
                  />
                </Field>
              </Group>
      </div>

      {/* La barre d'action suit : sur une page longue, un bouton tout en bas
          se cherche. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(31,42,55,0.08)] bg-paper/95 backdrop-blur lg:left-72">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-0">
          <p className="min-w-0 flex-1 text-[13px] text-ink-mid">
            {error ? (
              <span role="alert" className="flex items-start gap-2 text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {error}
              </span>
            ) : !ready ? (
              'Le nom et le temps de préparation sont nécessaires.'
            ) : (
              'Enregistré en brouillon : rien n’est public tant que vous ne publiez pas.'
            )}
          </p>
          <div className="flex gap-2">
            <Link href={backHref} className="btn btn-outline text-xs">
              Annuler
            </Link>
            <button
              type="submit"
              disabled={!ready || saving}
              className="btn btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-55"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Enregistrement…
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

// ── Petits blocs ────────────────────────────────────────────────────────────

function Group({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="border-b border-[rgba(31,42,55,0.1)] pb-2">
        <h3 className="font-display text-base font-bold text-navy">{title}</h3>
        {hint && <p className="mt-0.5 text-xs leading-snug text-ink-soft">{hint}</p>}
      </div>
      <div className="space-y-4 pt-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  required,
  className = '',
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-semibold text-navy">
        {label}
        {required && <span className="text-terra"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  )
}

function Chips({
  options,
  selected,
  onToggle,
  tone = 'navy',
}: {
  options: { code: string; label: string }[]
  selected: string[]
  onToggle: (code: string) => void
  tone?: 'navy' | 'danger'
}) {
  if (options.length === 0) {
    return <p className="text-xs text-ink-soft">Référentiel indisponible pour le moment.</p>
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o.code)
        return (
          <li key={o.code}>
            <button
              type="button"
              onClick={() => onToggle(o.code)}
              aria-pressed={on}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                on
                  ? tone === 'danger'
                    ? 'bg-red-600 text-white'
                    : 'bg-navy text-white'
                  : 'bg-cream-soft text-ink-mid hover:text-navy'
              }`}
            >
              {o.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function FreeList({
  value,
  onChange,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  items: string[]
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  placeholder: string
}) {
  const add = () => {
    const v = value.trim()
    if (!v || items.includes(v)) return
    onAdd(v)
    onChange('')
  }
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="input-base min-w-0 flex-1 py-2"
        />
        <button type="button" onClick={add} className="btn btn-outline text-xs">
          Ajouter
        </button>
      </div>
      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((it) => (
            <li key={it}>
              <button
                type="button"
                onClick={() => onRemove(it)}
                className="inline-flex items-center gap-1.5 rounded-full bg-cream-soft px-3 py-1.5 text-xs text-navy hover:text-red-700"
              >
                {it}
                <X className="h-3 w-3" aria-hidden />
                <span className="sr-only">Retirer</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
