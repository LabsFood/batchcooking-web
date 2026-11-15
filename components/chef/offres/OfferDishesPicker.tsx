'use client'

import { useId, useMemo, useState } from 'react'
import { Plus, Sparkles, Trash2, UtensilsCrossed } from 'lucide-react'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { ALLERGENS } from '@/components/client/AllergyDeclaration'
import { useAllergens } from '@/lib/api/referentials'
import { useDishes, useMenus } from '@/lib/api/chef-catalog'
import {
  MAX_EXPRESS_DISHES,
  MAX_OFFER_DISHES,
  type ExpressDishInput,
  type Quote,
} from '@/lib/api/quotes'

/* ─────────────────────────────────────────────────────────────────────────────
   Les plats d'une offre (décision du 15/11) : facultatifs, choisis par le seul
   batch cooker. Ses plats et menus publiés, et des « plats express » écrits en
   quelques mots pour cette demande — sans fiche recette, hors de sa carte tant
   qu'il ne décide pas de les garder, après la prestation.
   ───────────────────────────────────────────────────────────────────────────── */

export interface OfferDishesChoice {
  menuIds: string[]
  dishIds: string[]
  express: ExpressDishInput[]
}

export const EMPTY_CHOICE: OfferDishesChoice = { menuIds: [], dishIds: [], express: [] }

/** Combien de plats l'offre portera, comme l'API les compte (un plat vu deux fois compte une fois). */
export function countDishes(
  choice: OfferDishesChoice,
  menuDishes: Map<string, string[]>,
): number {
  const ids = new Set<string>()
  for (const id of choice.menuIds) for (const d of menuDishes.get(id) ?? []) ids.add(d)
  for (const id of choice.dishIds) ids.add(id)
  return ids.size + choice.express.length
}

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

export default function OfferDishesPicker({
  quote,
  value,
  onChange,
}: {
  quote: Quote
  value: OfferDishesChoice
  onChange: (next: OfferDishesChoice) => void
}) {
  const id = useId()
  const dishes = useDishes()
  const menus = useMenus()
  const allergens = useAllergens(ALLERGENS)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<ExpressDishInput>({ name: '', description: '', allergens: [] })

  const published = (dishes.data ?? []).filter((d) => d.status === 'published')
  const publishedMenus = (menus.data ?? []).filter((m) => m.status === 'published')
  const menuDishes = new Map(publishedMenus.map((m) => [m.id, m.dishes.map((d) => d.id)]))
  // Les plats express déjà écrits pour cette demande, dans une offre précédente.
  const earlierExpress = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>()
    for (const offer of quote.offers)
      for (const dish of offer.dishes ?? []) if (dish.express) seen.set(dish.id, dish)
    return [...seen.values()]
  }, [quote.offers])

  const count = countDishes(value, menuDishes)
  const shown = published.filter((d) => d.name.toLowerCase().includes(search.trim().toLowerCase()))
  const canAddExpress =
    draft.name.trim().length > 0 &&
    value.express.length < MAX_EXPRESS_DISHES &&
    count < MAX_OFFER_DISHES

  const addExpress = () => {
    if (!canAddExpress) return
    onChange({
      ...value,
      express: [
        ...value.express,
        {
          name: draft.name.trim(),
          description: draft.description?.trim() || undefined,
          allergens: draft.allergens?.length ? draft.allergens : undefined,
        },
      ],
    })
    setDraft({ name: '', description: '', allergens: [] })
  }

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-navy">
        <UtensilsCrossed className="h-3.5 w-3.5 text-terra" aria-hidden />
        Plats et menus (facultatif)
        <InfoPopover label="Comment fonctionnent les plats d’une offre ?">
          Ajoutez vos plats ou menus publiés, ou écrivez un plat express pour cette demande : un
          nom, une description, les allergènes que vous connaissez. Une fois l’offre acceptée,
          ce sont les plats de la prestation. Un plat express reste hors de votre carte : après
          la prestation, vous choisissez de le garder (vous complétez alors sa recette) ou de le
          retirer. Si un plat touche une allergie du client, l’offre part quand même avec un
          avertissement, et vous êtes invité à en parler avec lui.
        </InfoPopover>
        <span className="ml-auto text-[11px] font-normal tabular-nums text-ink-soft">
          {count} / {MAX_OFFER_DISHES}
        </span>
      </p>

      {publishedMenus.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-[12px] font-semibold text-ink-mid">Mes menus publiés</legend>
          <div className="flex flex-wrap gap-2">
            {publishedMenus.map((menu) => {
              const on = value.menuIds.includes(menu.id)
              return (
                <button
                  key={menu.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ ...value, menuIds: toggle(value.menuIds, menu.id) })}
                  className={`rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                    on ? 'bg-amber text-navy' : 'bg-cream-soft text-ink-mid hover:bg-cream-deep'
                  }`}
                >
                  <span className="block font-semibold">{menu.title}</span>
                  <span className="tabular-nums">{menu.dishes.length} plats</span>
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-ink-mid">Mes plats publiés</legend>
        {dishes.isPending ? (
          <p className="text-xs text-ink-soft">Chargement de vos plats…</p>
        ) : published.length === 0 ? (
          <p className="text-xs text-ink-soft">
            Aucun plat publié : écrivez un plat express ci-dessous, ou publiez-en depuis « Menus et
            recettes ».
          </p>
        ) : (
          <>
            {published.length > 6 && (
              <>
                <label htmlFor={`${id}-search`} className="sr-only">
                  Chercher un plat
                </label>
                <input
                  id={`${id}-search`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Chercher un plat"
                  className="input-base mb-2 text-xs"
                />
              </>
            )}
            <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {shown.map((dish) => (
                <li key={dish.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-navy hover:bg-cream-soft">
                    <input
                      type="checkbox"
                      checked={value.dishIds.includes(dish.id)}
                      onChange={() => onChange({ ...value, dishIds: toggle(value.dishIds, dish.id) })}
                      className="h-4 w-4 accent-amber-deep"
                    />
                    {dish.name}
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </fieldset>

      {earlierExpress.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-[12px] font-semibold text-ink-mid">
            Plats express déjà écrits pour cette demande
          </legend>
          <ul className="space-y-1">
            {earlierExpress.map((dish) => (
              <li key={dish.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-navy hover:bg-cream-soft">
                  <input
                    type="checkbox"
                    checked={value.dishIds.includes(dish.id)}
                    onChange={() => onChange({ ...value, dishIds: toggle(value.dishIds, dish.id) })}
                    className="h-4 w-4 accent-amber-deep"
                  />
                  {dish.name}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <fieldset className="rounded-2xl border border-dashed border-[rgba(31,42,55,0.15)] p-3">
        <legend className="flex items-center gap-1.5 px-1 text-[12px] font-semibold text-ink-mid">
          <Sparkles className="h-3.5 w-3.5 text-amber-deep" aria-hidden /> Un plat express
        </legend>
        {value.express.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {value.express.map((dish, i) => (
              <li
                key={`${dish.name}-${i}`}
                className="flex items-start justify-between gap-2 rounded-xl bg-amber-soft/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy">{dish.name}</p>
                  {dish.description && <p className="text-xs text-ink-mid">{dish.description}</p>}
                  <p className="text-[11px] text-ink-soft">
                    {dish.allergens?.length
                      ? `Allergènes : ${dish.allergens
                          .map((c) => allergens.find((a) => a.code === c)?.label ?? c)
                          .join(', ')}`
                      : 'Allergènes non renseignés'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...value, express: value.express.filter((_, j) => j !== i) })}
                  className="shrink-0 rounded-full p-1 text-ink-soft hover:bg-white hover:text-red-700"
                  aria-label={`Retirer « ${dish.name} »`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-2">
          <div>
            <label htmlFor={`${id}-express-name`} className="mb-1 block text-[11px] text-ink-soft">
              Nom du plat
            </label>
            <input
              id={`${id}-express-name`}
              value={draft.name}
              maxLength={160}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Gâteau d’anniversaire au chocolat"
              className="input-base text-sm"
            />
          </div>
          <div>
            <label htmlFor={`${id}-express-desc`} className="mb-1 block text-[11px] text-ink-soft">
              Description (facultatif)
            </label>
            <textarea
              id={`${id}-express-desc`}
              rows={2}
              maxLength={1000}
              value={draft.description ?? ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="input-base resize-y text-sm"
            />
          </div>
          <div>
            <p className="mb-1 text-[11px] text-ink-soft">
              Allergènes que vous savez présents (facultatif, jamais « vérifié » sans recette)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allergens.map((a) => {
                const on = draft.allergens?.includes(a.code) ?? false
                return (
                  <button
                    key={a.code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDraft({ ...draft, allergens: toggle(draft.allergens ?? [], a.code) })}
                    className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                      on ? 'bg-red-100 font-semibold text-red-800' : 'bg-cream-soft text-ink-mid hover:bg-cream-deep'
                    }`}
                  >
                    {a.label}
                  </button>
                )
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={addExpress}
            disabled={!canAddExpress}
            className="btn btn-outline text-xs disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter ce plat express
          </button>
          {value.express.length >= MAX_EXPRESS_DISHES && (
            <p className="text-[11px] text-ink-soft">
              {MAX_EXPRESS_DISHES} plats express au plus par offre.
            </p>
          )}
        </div>
      </fieldset>
    </div>
  )
}
