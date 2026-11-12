'use client'

import type { RefObject } from 'react'
import { ApiError, fieldErrors } from '@/lib/api/client'
import { apiMessage, champMessage } from '@/lib/api/messages'
import type { MyIngredient, MyIngredientInput } from '@/lib/api/ingredients'
import { useAllergens, useAisles, useComputedDiets } from '@/lib/api/referentials'
import { INGREDIENT_ALLERGENS_REQUIRED_TEXT, REASON_TEXT } from '@/lib/reason-codes'
import { INGREDIENT_MAX, MONTHS, REGULATED_ALLERGENS } from '@/lib/recipe-fields'

/* ─────────────────────────────────────────────────────────────────────────────
   Les champs d'un ingrédient du batch cooker, et leurs règles.

   Deux écrans s'en servent : le dialogue qui crée un ingrédient depuis la
   recette, et la page « Mes ingrédients » qui modifie un ingrédient en attente.
   Les champs, la vérification avant l'appel et la lecture des refus de l'API
   vivent donc ici, une seule fois.

   La vérification sert à des messages clairs ; l'API reste l'autorité, et ses
   refus s'affichent près du champ visé.
   ───────────────────────────────────────────────────────────────────────────── */

export type IngredientField = 'name' | 'aisle' | 'allergens'

export interface IngredientDraft {
  name: string
  aisle: string
  /** Les allergènes cochés. */
  picked: string[]
  /** « Aucun des 14 » : une déclaration, pas un oubli. */
  none: boolean
  diets: string[]
  months: number[]
  isBasic: boolean
}

export const emptyIngredientDraft = (name = ''): IngredientDraft => ({
  name,
  aisle: '',
  picked: [],
  none: false,
  diets: [],
  months: [],
  isBasic: false,
})

/** Le brouillon d'un ingrédient existant, pour le modifier. */
export const draftFromIngredient = (i: MyIngredient): IngredientDraft => ({
  name: i.name,
  aisle: i.aisle ?? '',
  picked: i.allergensNone ? [] : i.allergens,
  none: i.allergensNone,
  diets: i.diets,
  months: i.seasonMonths,
  isBasic: i.isBasic,
})

/** Les règles de l'API, vérifiées avant l'appel. */
export function validateIngredient(
  d: IngredientDraft,
  aisles: { code: string }[],
): Partial<Record<IngredientField, string>> {
  const out: Partial<Record<IngredientField, string>> = {}
  const n = d.name.trim()
  if (n.length < 1) out.name = 'Donnez un nom à l’ingrédient.'
  else if (n.length > INGREDIENT_MAX.name) {
    out.name = `Le nom tient en ${INGREDIENT_MAX.name} caractères au plus.`
  }
  if (!d.aisle || !aisles.some((a) => a.code === d.aisle)) {
    out.aisle = 'Choisissez le rayon dans la liste.'
  }
  if (!d.none && d.picked.length === 0) {
    out.allergens = INGREDIENT_ALLERGENS_REQUIRED_TEXT
  }
  return out
}

/**
 * Ce qui part à l'API. À la création, les listes vides ne s'envoient pas ; à la
 * modification, elles partent, sinon on ne pourrait pas retirer un régime ou
 * un mois.
 */
export function ingredientBody(d: IngredientDraft, forUpdate = false): MyIngredientInput {
  return {
    name: d.name.trim(),
    aisle: d.aisle,
    ...(d.none ? { allergensNone: true } : { allergens: d.picked }),
    ...(forUpdate || d.diets.length > 0 ? { diets: d.diets } : {}),
    ...(forUpdate || d.months.length > 0
      ? { seasonMonths: [...d.months].sort((a, b) => a - b) }
      : {}),
    isBasic: d.isBasic,
  }
}

export interface IngredientRefusal {
  /** Les refus qui visent un champ. */
  fields: Partial<Record<IngredientField, string>>
  /** Le message du reste (422, 429, autre), ou null s'il n'y en a pas. */
  general: string | null
  /** `409 INGREDIENT_ALREADY_LISTED` : l'entrée qui porte déjà ce nom. */
  existing: { id: string; name: string } | null
  /** `422 INGREDIENT_NOT_PENDING` : validé ou remplacé entre-temps. */
  notPending: boolean
}

/** Lit un refus de l'API sur un ingrédient : 400 par champ, 409, 422. */
export function readIngredientError(error: unknown, fallback: string): IngredientRefusal {
  const out: IngredientRefusal = { fields: {}, general: null, existing: null, notPending: false }
  const body = error instanceof ApiError ? (error.body as { code?: string; ingredient?: unknown } | null) : null

  if (error instanceof ApiError && error.status === 409 && body?.code === 'INGREDIENT_ALREADY_LISTED') {
    const ing = body.ingredient as { id?: unknown; name?: unknown } | undefined
    if (ing && typeof ing.id === 'string' && typeof ing.name === 'string') {
      out.existing = { id: ing.id, name: ing.name }
      return out
    }
  }
  if (error instanceof ApiError && error.status === 422 && body?.code === 'INGREDIENT_NOT_PENDING') {
    out.notPending = true
    out.general = REASON_TEXT.INGREDIENT_NOT_PENDING
    return out
  }
  if (error instanceof ApiError && body?.code === 'ALLERGENS_REQUIRED') {
    out.fields.allergens = INGREDIENT_ALLERGENS_REQUIRED_TEXT
    return out
  }
  // La liste des rayons a changé depuis qu'on l'a lue (un admin l'a modifiée).
  if (error instanceof ApiError && body?.code === 'AISLE_UNKNOWN') {
    out.fields.aisle = 'Ce rayon n’est plus dans la liste : rechargez la page, puis choisissez-en un autre.'
    return out
  }

  // 400 : les champs en cause, chacun près du sien.
  let rest = false
  for (const fe of fieldErrors(error)) {
    const root = fe.field.split('.')[0]
    if (root === 'name' || root === 'aisle') out.fields[root] = champMessage(fe)
    else if (root === 'allergens' || root === 'allergensNone') out.fields.allergens = champMessage(fe)
    else rest = true
  }
  if (rest || Object.keys(out.fields).length === 0) out.general = apiMessage(error, fallback)
  return out
}

export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-700">
      {children}
    </p>
  )
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/** Les champs : nom, rayon, allergènes, régimes, saisons, ingrédient de base. */
export default function IngredientFields({
  value,
  onChange,
  errors,
  idPrefix,
  nameRef,
  onEnter,
}: {
  value: IngredientDraft
  onChange: (next: IngredientDraft) => void
  errors: Partial<Record<IngredientField, string>>
  /** Préfixe des `id`, unique par instance (`useId`). */
  idPrefix: string
  nameRef?: RefObject<HTMLInputElement | null>
  /** « Entrée » dans le nom : valide sans soumettre un formulaire englobant. */
  onEnter?: () => void
}) {
  const aisles = useAisles()
  /* Le repli des quatorze : sans lui, pendant le chargement (ou une panne) du
     référentiel, seul « Aucun » serait proposé, et le choisir déclarerait sans
     allergène un ingrédient qui en porte. */
  const allergens = useAllergens(REGULATED_ALLERGENS)
  const allergensKnown = allergens.length > 0
  const diets = useComputedDiets()
  const set = <K extends keyof IngredientDraft>(k: K, v: IngredientDraft[K]) =>
    onChange({ ...value, [k]: v })
  const err = (f: IngredientField) => errors[f]

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-name`} className="mb-1 block text-[13px] font-semibold text-navy">
          Nom
        </label>
        <input
          id={`${idPrefix}-name`}
          ref={nameRef}
          value={value.name}
          maxLength={INGREDIENT_MAX.name}
          onChange={(e) => set('name', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnter) {
              e.preventDefault()
              onEnter()
            }
          }}
          aria-invalid={err('name') ? true : undefined}
          aria-describedby={err('name') ? `${idPrefix}-name-err` : undefined}
          className="input-base w-full"
        />
        {err('name') && <FieldError id={`${idPrefix}-name-err`}>{err('name')}</FieldError>}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-aisle`} className="mb-1 block text-[13px] font-semibold text-navy">
          Rayon
        </label>
        <select
          id={`${idPrefix}-aisle`}
          value={value.aisle}
          onChange={(e) => set('aisle', e.target.value)}
          aria-invalid={err('aisle') ? true : undefined}
          aria-describedby={err('aisle') ? `${idPrefix}-aisle-err` : undefined}
          className="input-base w-full"
        >
          <option value="">Choisir un rayon</option>
          {aisles.map((a) => (
            <option key={a.code} value={a.code}>
              {a.label}
            </option>
          ))}
        </select>
        {err('aisle') && <FieldError id={`${idPrefix}-aisle-err`}>{err('aisle')}</FieldError>}
      </div>

      <fieldset aria-describedby={err('allergens') ? `${idPrefix}-all-err` : undefined}>
        <legend className="mb-1 text-[13px] font-semibold text-navy">Allergènes</legend>
        {/* « Aucun » n'a de sens que face à la liste : tant qu'elle manque, il ne se choisit pas. */}
        <button
          type="button"
          onClick={() => onChange({ ...value, none: !value.none, picked: [] })}
          aria-pressed={value.none}
          disabled={!allergensKnown}
          className={`mb-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
            value.none ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:text-navy'
          }`}
        >
          Aucun des 14 allergènes
        </button>
        {!allergensKnown && (
          <p className="mb-2 text-xs text-ink-soft">
            La liste des allergènes n’est pas disponible pour le moment : réessayez dans un instant.
          </p>
        )}
        {!value.none && (
          <ChipList
            options={allergens}
            selected={value.picked}
            onToggle={(c) => set('picked', toggle(value.picked, c))}
            danger
          />
        )}
        {err('allergens') && <FieldError id={`${idPrefix}-all-err`}>{err('allergens')}</FieldError>}
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-[13px] font-semibold text-navy">
          Régimes <span className="font-normal text-ink-soft">(facultatif)</span>
        </legend>
        <p className="mb-1.5 text-xs text-ink-soft">Ceux que cet ingrédient respecte.</p>
        <ChipList
          options={diets}
          selected={value.diets}
          onToggle={(c) => set('diets', toggle(value.diets, c))}
        />
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-[13px] font-semibold text-navy">
          Mois de saison <span className="font-normal text-ink-soft">(facultatif)</span>
        </legend>
        <ChipList
          options={MONTHS.map((label, i) => ({ code: String(i + 1), label }))}
          selected={value.months.map(String)}
          onToggle={(c) => set('months', toggle(value.months, Number(c)))}
        />
      </fieldset>

      <label className="flex items-start gap-2 text-[13px] text-ink-mid">
        <input
          type="checkbox"
          checked={value.isBasic}
          onChange={(e) => set('isBasic', e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 accent-navy"
        />
        <span>
          <span className="font-semibold text-navy">Ingrédient de base</span> (sel, huile…) :
          masqué au client par défaut, toujours dans la liste de courses.
        </span>
      </label>
    </div>
  )
}

function ChipList({
  options,
  selected,
  onToggle,
  danger = false,
}: {
  options: { code: string; label: string }[]
  selected: string[]
  onToggle: (code: string) => void
  danger?: boolean
}) {
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
                  ? danger
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
