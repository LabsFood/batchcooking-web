'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useCreateIngredient } from '@/lib/api/ingredients'
import { useFindIngredient } from '@/lib/api/chef-catalog'
import { useAisles } from '@/lib/api/referentials'
import IngredientFields, {
  emptyIngredientDraft,
  ingredientBody,
  readIngredientError,
  validateIngredient,
  type IngredientField,
} from './IngredientFields'

/* ─────────────────────────────────────────────────────────────────────────────
   Créer un ingrédient sans quitter la recette.

   La liste commune n'a pas toujours le sien. Le chef le crée ici : il reste
   privé et « à valider » jusqu'à ce que Lab's Food le reprenne. Les allergènes
   sont exigés — ceux de la liste, ou « aucun » déclaré, jamais un oubli.

   Les champs et leurs règles sont ceux de `IngredientFields`, que la page
   « Mes ingrédients » reprend. Le dialogue vérifie avant d'appeler l'API, pour
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
  const find = useFindIngredient()
  const aisles = useAisles()
  const uid = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState(() => emptyIngredientDraft(initialName))
  const [errors, setErrors] = useState<Partial<Record<IngredientField, string>>>({})
  const [general, setGeneral] = useState<string | null>(null)
  const [existing, setExisting] = useState<{ id: string; name: string } | null>(null)
  /** L'entrée déjà listée se relit (rayon, « basique ») avant d'être reliée. */
  const [linking, setLinking] = useState(false)

  /* Le parent passe un `onClose` neuf à chaque rendu (un enregistrement
     automatique en provoque) : on le lit par une ref, pour que les effets
     ci-dessous ne se relancent pas et ne volent pas le focus en pleine saisie. */
  const closeRef = useRef(onClose)
  const pendingRef = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    closeRef.current = onClose
    pendingRef.current = create.isPending || linking
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

  /**
   * Relie la ligne à l'entrée que la liste a déjà (409), avec son rayon et son
   * « basique » comme une suggestion choisie : un ingrédient de base reste ainsi
   * caché au client par défaut. Relue sans succès, elle est reliée quand même ;
   * l'API en remplit le rayon à l'envoi.
   */
  async function linkExisting(entry: { id: string; name: string }) {
    if (linking) return
    setLinking(true)
    const found = await find(entry.id, entry.name).catch(() => null)
    setLinking(false)
    onLinked({
      id: entry.id,
      name: entry.name,
      ...(found ? { aisle: found.aisle, isBasic: found.isBasic } : {}),
    })
  }

  function submit() {
    if (create.isPending || linking) return
    setGeneral(null)
    setExisting(null)
    const found = validateIngredient(draft, aisles)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    create.mutate(ingredientBody(draft), {
      onSuccess: (made) => {
        onLinked({ id: made.id, name: made.name, aisle: made.aisle, isBasic: made.isBasic })
      },
      onError: (e) => {
        const refus = readIngredientError(e, 'L’ingrédient n’a pas pu être créé.')
        // 409 : la liste l'a déjà, on propose de la relier.
        if (refus.existing) {
          setExisting(refus.existing)
          return
        }
        if (Object.keys(refus.fields).length > 0) setErrors((p) => ({ ...p, ...refus.fields }))
        // 422 / 429 / autres : le message de l'API, en français d'après son code.
        if (refus.general) setGeneral(refus.general)
      },
    })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-navy/50 p-4"
      onClick={() => !create.isPending && !linking && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Créer un ingrédient"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-6 shadow-[0_24px_60px_-20px_rgba(31,42,55,0.3)]"
      >
        <h3 className="font-display text-lg font-bold text-navy">Créer un ingrédient</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-mid">
          Il reste à vous, « à valider », jusqu’à ce que Lab’s Food le reprenne dans la
          liste commune. Votre recette s’en sert tout de suite.
        </p>

        <div className="mt-4">
          <IngredientFields
            value={draft}
            onChange={setDraft}
            errors={errors}
            idPrefix={uid}
            nameRef={nameRef}
            onEnter={submit}
          />
        </div>

        {existing && (
          <div role="alert" className="mt-4 rounded-2xl bg-amber-soft/60 p-3.5 text-[13px] leading-relaxed text-[#8B6200]">
            <p>
              « {existing.name} » figure déjà dans la liste. Reliez votre ligne à celui-là
              plutôt que d’en créer un second.
            </p>
            <button
              type="button"
              onClick={() => linkExisting(existing)}
              disabled={linking}
              className="btn btn-primary mt-2 text-xs disabled:opacity-55"
            >
              {linking && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
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
            disabled={create.isPending || linking}
            className="btn btn-outline text-xs"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={create.isPending || linking}
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
