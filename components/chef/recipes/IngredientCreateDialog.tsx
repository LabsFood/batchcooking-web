'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { ApiError, fieldErrors } from '@/lib/api/client'
import { apiMessage, champMessage } from '@/lib/api/messages'
import { useCreateIngredient, type MyIngredientInput } from '@/lib/api/ingredients'
import { useAllergens, useAisles, useComputedDiets } from '@/lib/api/referentials'
import { INGREDIENT_MAX, MONTHS } from '@/lib/recipe-fields'

/* ─────────────────────────────────────────────────────────────────────────────
   Créer un ingrédient sans quitter la recette.

   La liste commune n'a pas toujours le sien. Le chef le crée ici : il reste
   privé et « à valider » jusqu'à ce que Lab's Food le reprenne. Les allergènes
   sont exigés — ceux de la liste, ou « aucun » déclaré, jamais un oubli.

   Le dialogue vérifie avant d'appeler l'API (nom, rayon, allergènes), pour
   des messages clairs ; l'API reste l'autorité, et ses refus s'affichent
   près du champ visé.

   Il est rendu dans un portail : le formulaire du plat n'en reçoit pas les
   événements, et « Entrée » ici ne l'enregistre pas.
   ───────────────────────────────────────────────────────────────────────────── */

/** Ce que la ligne reçoit en retour : de quoi la relier. */
export interface LinkedIngredient {
  id: string
  name: string
  /** Absent quand l'ingrédient existait déjà (409) : l'API remplit le rayon à l'envoi. */
  aisle?: string | null
  isBasic?: boolean
}

type Field = 'name' | 'aisle' | 'allergens'

export default function IngredientCreateDialog({
  open,
  initialName,
  onClose,
  onLinked,
}: {
  open: boolean
  initialName: string
  onClose: () => void
  onLinked: (ingredient: LinkedIngredient) => void
}) {
  const create = useCreateIngredient()
  const aisles = useAisles()
  const allergens = useAllergens()
  const diets = useComputedDiets()
  const uid = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(initialName)
  const [aisle, setAisle] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [none, setNone] = useState(false)
  const [pickedDiets, setPickedDiets] = useState<string[]>([])
  const [months, setMonths] = useState<number[]>([])
  const [isBasic, setIsBasic] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [general, setGeneral] = useState<string | null>(null)
  const [existing, setExisting] = useState<{ id: string; name: string } | null>(null)

  /* Le parent passe un `onClose` neuf à chaque rendu (un enregistrement
     automatique en provoque) : on le lit par une ref, pour que les effets
     ci-dessous ne se relancent pas et ne volent pas le focus en pleine saisie. */
  const closeRef = useRef(onClose)
  const pendingRef = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    closeRef.current = onClose
    pendingRef.current = create.isPending
  })

  /* À l'ouverture seulement : le focus va au nom, et revient au champ qui a
     ouvert le dialogue quand il se ferme. */
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    nameRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      if (opener && opener.isConnected) opener.focus()
    }
  }, [open])

  /* Échap ferme ; Tab reste dans le dialogue (il se déclare `aria-modal`). */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pendingRef.current) {
        closeRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!panel.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  /** Les règles de l'API, vérifiées avant l'appel. */
  function validate(): Partial<Record<Field, string>> {
    const out: Partial<Record<Field, string>> = {}
    const n = name.trim()
    if (n.length < 1) out.name = 'Donnez un nom à l’ingrédient.'
    else if (n.length > INGREDIENT_MAX.name) {
      out.name = `Le nom tient en ${INGREDIENT_MAX.name} caractères au plus.`
    }
    if (!aisle || !aisles.some((a) => a.code === aisle)) {
      out.aisle = 'Choisissez le rayon dans la liste.'
    }
    if (!none && picked.length === 0) {
      out.allergens = 'Cochez ses allergènes, ou indiquez qu’il n’en contient aucun.'
    }
    return out
  }

  function submit() {
    if (create.isPending) return
    setGeneral(null)
    setExisting(null)
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const body: MyIngredientInput = {
      name: name.trim(),
      aisle,
      ...(none ? { allergensNone: true } : { allergens: picked }),
      ...(pickedDiets.length > 0 ? { diets: pickedDiets } : {}),
      ...(months.length > 0 ? { seasonMonths: [...months].sort((a, b) => a - b) } : {}),
      isBasic,
    }
    create.mutate(body, {
      onSuccess: (made) => {
        onLinked({ id: made.id, name: made.name, aisle: made.aisle, isBasic: made.isBasic })
      },
      onError: (e) => {
        const refus = e instanceof ApiError ? (e.body as { code?: string; ingredient?: unknown } | null) : null
        // 409 : la liste l'a déjà, on propose de la relier.
        if (e instanceof ApiError && e.status === 409 && refus?.code === 'INGREDIENT_ALREADY_LISTED') {
          const ing = refus.ingredient as { id?: unknown; name?: unknown } | undefined
          if (ing && typeof ing.id === 'string' && typeof ing.name === 'string') {
            setExisting({ id: ing.id, name: ing.name })
            return
          }
        }
        // 400 : les champs en cause, chacun près du sien.
        const next: Partial<Record<Field, string>> = {}
        let rest = false
        for (const fe of fieldErrors(e)) {
          const root = fe.field.split('.')[0]
          if (root === 'name' || root === 'aisle') next[root] = champMessage(fe)
          else if (root === 'allergens' || root === 'allergensNone') next.allergens = champMessage(fe)
          else rest = true
        }
        if (Object.keys(next).length > 0) setErrors((p) => ({ ...p, ...next }))
        if (rest || Object.keys(next).length === 0) {
          // 422 / 429 / autres : le message de l'API, en français d'après son code.
          setGeneral(apiMessage(e, 'L’ingrédient n’a pas pu être créé.'))
        }
      },
    })
  }

  const err = (f: Field) => errors[f]

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-navy/50 p-4"
      onClick={() => !create.isPending && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Créer un ingrédient"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-paper p-6 shadow-[0_24px_60px_-20px_rgba(31,42,55,0.3)]"
      >
        <h3 className="font-display text-lg font-bold text-navy">Créer un ingrédient</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-mid">
          Il reste à vous, « à valider », jusqu’à ce que Lab’s Food le reprenne dans la
          liste commune. Votre recette s’en sert tout de suite.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor={`${uid}-name`} className="mb-1 block text-[13px] font-semibold text-navy">
              Nom
            </label>
            <input
              id={`${uid}-name`}
              ref={nameRef}
              value={name}
              maxLength={INGREDIENT_MAX.name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                }
              }}
              aria-invalid={err('name') ? true : undefined}
              aria-describedby={err('name') ? `${uid}-name-err` : undefined}
              className="input-base w-full"
            />
            {err('name') && <FieldError id={`${uid}-name-err`}>{err('name')}</FieldError>}
          </div>

          <div>
            <label htmlFor={`${uid}-aisle`} className="mb-1 block text-[13px] font-semibold text-navy">
              Rayon
            </label>
            <select
              id={`${uid}-aisle`}
              value={aisle}
              onChange={(e) => setAisle(e.target.value)}
              aria-invalid={err('aisle') ? true : undefined}
              aria-describedby={err('aisle') ? `${uid}-aisle-err` : undefined}
              className="input-base w-full"
            >
              <option value="">Choisir un rayon</option>
              {aisles.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.label}
                </option>
              ))}
            </select>
            {err('aisle') && <FieldError id={`${uid}-aisle-err`}>{err('aisle')}</FieldError>}
          </div>

          <fieldset aria-describedby={err('allergens') ? `${uid}-all-err` : undefined}>
            <legend className="mb-1 text-[13px] font-semibold text-navy">Allergènes</legend>
            <button
              type="button"
              onClick={() => {
                setNone((v) => !v)
                setPicked([])
              }}
              aria-pressed={none}
              className={`mb-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                none ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:text-navy'
              }`}
            >
              Aucun des 14 allergènes
            </button>
            {!none && (
              <ChipList
                options={allergens}
                selected={picked}
                onToggle={(c) => setPicked((p) => toggle(p, c))}
                danger
              />
            )}
            {err('allergens') && <FieldError id={`${uid}-all-err`}>{err('allergens')}</FieldError>}
          </fieldset>

          <fieldset>
            <legend className="mb-1 text-[13px] font-semibold text-navy">
              Régimes <span className="font-normal text-ink-soft">(facultatif)</span>
            </legend>
            <p className="mb-1.5 text-xs text-ink-soft">Ceux que cet ingrédient respecte.</p>
            <ChipList
              options={diets}
              selected={pickedDiets}
              onToggle={(c) => setPickedDiets((p) => toggle(p, c))}
            />
          </fieldset>

          <fieldset>
            <legend className="mb-1 text-[13px] font-semibold text-navy">
              Mois de saison <span className="font-normal text-ink-soft">(facultatif)</span>
            </legend>
            <ChipList
              options={MONTHS.map((label, i) => ({ code: String(i + 1), label }))}
              selected={months.map(String)}
              onToggle={(c) => setMonths((p) => toggle(p, Number(c)))}
            />
          </fieldset>

          <label className="flex items-start gap-2 text-[13px] text-ink-mid">
            <input
              type="checkbox"
              checked={isBasic}
              onChange={(e) => setIsBasic(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 accent-navy"
            />
            <span>
              <span className="font-semibold text-navy">Ingrédient de base</span> (sel, huile…) :
              masqué au client par défaut, toujours dans la liste de courses.
            </span>
          </label>
        </div>

        {existing && (
          <div role="alert" className="mt-4 rounded-2xl bg-amber-soft/60 p-3.5 text-[13px] leading-relaxed text-[#8B6200]">
            <p>
              « {existing.name} » figure déjà dans la liste. Reliez votre ligne à celui-là
              plutôt que d’en créer un second.
            </p>
            <button
              type="button"
              onClick={() => onLinked({ id: existing.id, name: existing.name })}
              className="btn btn-primary mt-2 text-xs"
            >
              Utiliser « {existing.name} »
            </button>
          </div>
        )}

        {general && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3.5 text-[13px] leading-relaxed text-red-700"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {general}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={create.isPending}
            className="btn btn-outline text-xs"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={create.isPending}
            className="btn btn-primary text-xs disabled:opacity-55"
          >
            {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            Créer et relier
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-700">
      {children}
    </p>
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
